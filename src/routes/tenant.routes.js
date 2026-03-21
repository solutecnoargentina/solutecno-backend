const express = require('express');
const { authRequired } = require('../middleware/auth');
const { getTenantDb } = require('../db/tenant');

const router = express.Router();

router.use(authRequired);

router.get('/contacts', (req, res) => {
const db = getTenantDb(req.user.tenant_id);
const rows = db.prepare('SELECT * FROM contacts ORDER BY id DESC').all();
res.json(rows);
});

router.get('/messages', (req, res) => {
const db = getTenantDb(req.user.tenant_id);
const rows = db.prepare('SELECT * FROM messages ORDER BY id DESC LIMIT 200').all();
res.json(rows);
});

module.exports = router;
