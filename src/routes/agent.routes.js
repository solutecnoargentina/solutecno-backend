const express = require('express');
const { authRequired } = require('../middleware/auth');
const { getTenantDb } = require('../db/tenant');

const router = express.Router();

router.use(authRequired);

router.get('/', (req, res) => {
const db = getTenantDb(req.user.tenant_id);
const rows = db.prepare('SELECT * FROM agents ORDER BY id ASC').all();
res.json(rows);
});

router.post('/', (req, res) => {
const { name, system_prompt, opening_message, closing_signature, model_name, temperature, is_active } = req.body || {};

if (!name || !system_prompt) {
return res.status(400).json({ error: 'Faltan datos del agente' });
}

const db = getTenantDb(req.user.tenant_id);

const result = db.prepare(`
 INSERT INTO agents (name, system_prompt, opening_message, closing_signature, model_name, temperature, is_active)
 VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(
name,
system_prompt,
opening_message || null,
closing_signature || null,
model_name || process.env.DEFAULT_MODEL || 'qwen2.5:7b',
Number(temperature ?? 0.4),
Number(is_active ?? 1)
);

res.json({ ok: true, id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
const { id } = req.params;
const { name, system_prompt, opening_message, closing_signature, model_name, temperature, is_active } = req.body || {};

const db = getTenantDb(req.user.tenant_id);

db.prepare(`
 UPDATE agents
 SET name = ?, system_prompt = ?, opening_message = ?, closing_signature = ?, model_name = ?, temperature = ?, is_active = ?
 WHERE id = ?
`).run(
name,
system_prompt,
opening_message || null,
closing_signature || null,
model_name || process.env.DEFAULT_MODEL || 'qwen2.5:7b',
Number(temperature ?? 0.4),
Number(is_active ?? 1),
id
);

res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
const db = getTenantDb(req.user.tenant_id);
db.prepare('DELETE FROM agents WHERE id = ?').run(req.params.id);
res.json({ ok: true });
});

module.exports = router;
