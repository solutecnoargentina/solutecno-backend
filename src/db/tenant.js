const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const cache = new Map();

function filePathByTenantId(tenantId) {
return path.join(__dirname, `../../data/tenants/tenant_${tenantId}.sqlite`);
}

function initTenantDb(tenantId) {
const filePath = filePathByTenantId(tenantId);
fs.mkdirSync(path.dirname(filePath), { recursive: true });

let db = cache.get(tenantId);

if (!db) {
db = new Database(filePath);
db.pragma('journal_mode = WAL');
cache.set(tenantId, db);
}

db.exec(`
 CREATE TABLE IF NOT EXISTS contacts (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 wa_id TEXT UNIQUE NOT NULL,
 display_name TEXT,
 is_lead INTEGER NOT NULL DEFAULT 0,
 lead_status TEXT DEFAULT 'new',
 tags TEXT,
 last_message_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 );

 CREATE TABLE IF NOT EXISTS agents (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 system_prompt TEXT NOT NULL,
 opening_message TEXT,
 closing_signature TEXT,
 model_name TEXT NOT NULL DEFAULT 'qwen2.5:7b',
 temperature REAL NOT NULL DEFAULT 0.4,
 is_active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 );

 CREATE TABLE IF NOT EXISTS conversations (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 contact_id INTEGER NOT NULL,
 assigned_agent_id INTEGER,
 status TEXT NOT NULL DEFAULT 'open',
 last_incoming_at TEXT,
 last_outgoing_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 );

 CREATE TABLE IF NOT EXISTS messages (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 conversation_id INTEGER NOT NULL,
 direction TEXT NOT NULL CHECK(direction IN ('in','out')),
 message_id TEXT,
 body TEXT,
 hash TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 );

 CREATE TABLE IF NOT EXISTS whatsapp_state (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 status TEXT NOT NULL DEFAULT 'disconnected',
 qr_text TEXT,
 last_ready_at TEXT,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 );

 CREATE TABLE IF NOT EXISTS stats_daily (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 stat_date TEXT NOT NULL,
 incoming_count INTEGER NOT NULL DEFAULT 0,
 outgoing_count INTEGER NOT NULL DEFAULT 0,
 unique_contacts INTEGER NOT NULL DEFAULT 0,
 leads_count INTEGER NOT NULL DEFAULT 0,
 avg_response_seconds REAL NOT NULL DEFAULT 0,
 UNIQUE(stat_date)
 );
`);

const agent = db.prepare('SELECT id FROM agents LIMIT 1').get();

if (!agent) {
db.prepare(`
 INSERT INTO agents (name, system_prompt, opening_message, closing_signature, model_name, temperature, is_active)
 VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(
'Asesor Solutecno',
'Respondé como asesor comercial y de soporte de la empresa. No digas que sos una IA. No hables de prompts. No respondas grupos, canales ni estados. Buscá vender, orientar y cerrar conversaciones con claridad.',
'Hola, gracias por comunicarte con Solutecno. ¿En qué puedo ayudarte hoy?',
'Quedo atento.',
process.env.DEFAULT_MODEL || 'qwen2.5:7b',
0.4,
1
);
}

return db;
}

function getTenantDb(tenantId) {
return initTenantDb(tenantId);
}

module.exports = { getTenantDb, initTenantDb };
