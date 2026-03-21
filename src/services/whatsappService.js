const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const { getTenantDb } = require('../db/tenant');
const { shouldIgnoreMessage } = require('../utils/messageFilters');
const { askOllama } = require('./ollamaService');

const clients = new Map();

function sessionDir(tenantId) {
return path.join(__dirname, `../../sessions/tenant_${tenantId}`);
}

function hashText(text) {
return crypto.createHash('sha256').update(String(text)).digest('hex');
}

function setWhatsappState(tenantId, patch) {
const db = getTenantDb(tenantId);
const row = db.prepare('SELECT id FROM whatsapp_state ORDER BY id DESC LIMIT 1').get();

if (!row) {
db.prepare(`INSERT INTO whatsapp_state (status, qr_text, last_ready_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`)
.run(patch.status || 'disconnected', patch.qr_text || null, patch.last_ready_at || null);
return;
}

const current = db.prepare('SELECT * FROM whatsapp_state WHERE id = ?').get(row.id);

db.prepare(`
 UPDATE whatsapp_state
 SET status = ?, qr_text = ?, last_ready_at = ?, updated_at = CURRENT_TIMESTAMP
 WHERE id = ?
`).run(
patch.status ?? current.status,
patch.qr_text ?? current.qr_text,
patch.last_ready_at ?? current.last_ready_at,
row.id
);
}

function getActiveAgent(db) {
return db.prepare('SELECT * FROM agents WHERE is_active = 1 ORDER BY id ASC LIMIT 1').get();
}

function getOrCreateContact(db, waId, displayName) {
let contact = db.prepare('SELECT * FROM contacts WHERE wa_id = ?').get(waId);

if (!contact) {
const result = db.prepare(`INSERT INTO contacts (wa_id, display_name, last_message_at) VALUES (?, ?, CURRENT_TIMESTAMP)`)
.run(waId, displayName || null);

contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid);
}

return contact;
}

function getOrCreateConversation(db, contactId, agentId) {
let conversation = db.prepare('SELECT * FROM conversations WHERE contact_id = ? ORDER BY id DESC LIMIT 1').get(contactId);

if (!conversation) {
const result = db.prepare(`
 INSERT INTO conversations (contact_id, assigned_agent_id, status, last_incoming_at)
 VALUES (?, ?, 'open', CURRENT_TIMESTAMP)
`).run(contactId, agentId || null);

conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(result.lastInsertRowid);
}

return conversation;
}

function markLeadIfNeeded(db, contactId, text) {
const body = String(text || '').toLowerCase();
const keywords = ['precio', 'comprar', 'presupuesto', 'quiero', 'info', 'cuánto sale', 'cuanto sale'];

if (keywords.some(word => body.includes(word))) {
db.prepare(`UPDATE contacts SET is_lead = 1, lead_status = 'interested' WHERE id = ?`).run(contactId);
}
}

async function startClient(tenantId) {
if (clients.has(tenantId)) {
return clients.get(tenantId);
}

fs.mkdirSync(sessionDir(tenantId), { recursive: true });

const client = new Client({
authStrategy: new LocalAuth({
clientId: `tenant_${tenantId}`,
dataPath: path.join(__dirname, '../../sessions')
}),
puppeteer: {
headless: true,
args: ['--no-sandbox', '--disable-setuid-sandbox']
}
});

client.on('qr', async (qr) => {
const qrDataUrl = await QRCode.toDataURL(qr);
setWhatsappState(tenantId, { status: 'qr_pending', qr_text: qrDataUrl });
});

client.on('ready', () => {
setWhatsappState(tenantId, {
status: 'connected',
qr_text: null,
last_ready_at: new Date().toISOString()
});
});

client.on('disconnected', () => {
setWhatsappState(tenantId, { status: 'disconnected', qr_text: null });
clients.delete(tenantId);
});

client.on('message', async (msg) => {
try {
if (shouldIgnoreMessage(msg)) return;

const db = getTenantDb(tenantId);
const agent = getActiveAgent(db);
if (!agent) return;

const contact = getOrCreateContact(db, msg.from, msg._data?.notifyName || null);
const conversation = getOrCreateConversation(db, contact.id, agent.id);

const lastOut = db.prepare(`
 SELECT created_at FROM messages
 WHERE conversation_id = ? AND direction = 'out'
 ORDER BY id DESC LIMIT 1
`).get(conversation.id);

if (lastOut) {
const seconds = (Date.now() - new Date(lastOut.created_at).getTime()) / 1000;
if (seconds < Number(process.env.ANTI_LOOP_SECONDS || 25)) {
return;
}
}

const incomingHash = hashText(msg.body);

const exists = db.prepare(`
 SELECT id FROM messages
 WHERE conversation_id = ? AND direction = 'in' AND hash = ?
 ORDER BY id DESC LIMIT 1
`).get(conversation.id, incomingHash);

if (exists) return;

db.prepare(`
 INSERT INTO messages (conversation_id, direction, message_id, body, hash)
 VALUES (?, 'in', ?, ?, ?)
`).run(conversation.id, msg.id._serialized || null, msg.body, incomingHash);

db.prepare(`
 UPDATE conversations SET last_incoming_at = CURRENT_TIMESTAMP WHERE id = ?
`).run(conversation.id);

db.prepare(`
 UPDATE contacts SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?
`).run(contact.id);

markLeadIfNeeded(db, contact.id, msg.body);

const prompt = [
agent.system_prompt,
'',
'Mensaje del cliente:',
msg.body,
'',
'Respondé como representante humano de la empresa. Respuesta breve, clara y útil.'
].join('\n');

let text = await askOllama({
model: agent.model_name,
prompt,
temperature: agent.temperature
});

text = String(text || '').trim();
if (!text) return;

if (agent.closing_signature) {
text = `${text}\n\n${agent.closing_signature}`;
}

await client.sendMessage(msg.from, text);

db.prepare(`
 INSERT INTO messages (conversation_id, direction, body, hash)
 VALUES (?, 'out', ?, ?)
`).run(conversation.id, text, hashText(text));

db.prepare(`
 UPDATE conversations SET last_outgoing_at = CURRENT_TIMESTAMP WHERE id = ?
`).run(conversation.id);

} catch (error) {
console.error('Error procesando mensaje tenant', tenantId, error.message);
}
});

await client.initialize();
clients.set(tenantId, client);

setWhatsappState(tenantId, { status: 'starting' });

return client;
}

async function stopClient(tenantId) {
const client = clients.get(tenantId);

if (client) {
await client.destroy();
clients.delete(tenantId);
}

setWhatsappState(tenantId, { status: 'disconnected', qr_text: null });
}

function getWhatsappStatus(tenantId) {
const db = getTenantDb(tenantId);

return db.prepare('SELECT * FROM whatsapp_state ORDER BY id DESC LIMIT 1').get() || {
status: 'disconnected',
qr_text: null,
last_ready_at: null
};
}

module.exports = { startClient, stopClient, getWhatsappStatus };
