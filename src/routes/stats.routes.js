const express = require('express');
const { authRequired } = require('../middleware/auth');
const { getTenantDb } = require('../db/tenant');

const router = express.Router();

router.use(authRequired);

router.get('/basic', (req, res) => {
const db = getTenantDb(req.user.tenant_id);

const incoming = db.prepare(`SELECT COUNT(*) AS total FROM messages WHERE direction = 'in'`).get().total;
const outgoing = db.prepare(`SELECT COUNT(*) AS total FROM messages WHERE direction = 'out'`).get().total;
const contacts = db.prepare(`SELECT COUNT(*) AS total FROM contacts`).get().total;
const leads = db.prepare(`SELECT COUNT(*) AS total FROM contacts WHERE is_lead = 1`).get().total;

const statusRow = db.prepare(`SELECT status, last_ready_at FROM whatsapp_state ORDER BY id DESC LIMIT 1`).get() || null;

res.json({
incoming,
outgoing,
contacts,
leads,
whatsapp: statusRow || { status: 'disconnected', last_ready_at: null }
});
});

module.exports = router;
