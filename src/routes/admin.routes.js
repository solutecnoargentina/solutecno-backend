const express = require('express');
const bcrypt = require('bcrypt');
const { authRequired } = require('../middleware/auth');
const { getDb } = require('../db/master');
const { initTenantDb } = require('../db/tenant');

const router = express.Router();

function onlyAdmin(req, res, next) {
if (!req.user || req.user.role !== 'master_admin') {
return res.status(403).json({ error: 'Solo admin master' });
}
next();
}

router.use(authRequired, onlyAdmin);

router.get('/tenants', (req, res) => {
const rows = getDb().prepare('SELECT * FROM tenants ORDER BY id ASC').all();
res.json(rows);
});

router.post('/paid-user', (req, res) => {
const { tenant_name, tenant_slug, username, password } = req.body || {};

if (!tenant_name || !tenant_slug || !username || !password) {
return res.status(400).json({ error: 'Faltan datos' });
}

const db = getDb();

const tenantResult = db.prepare(`INSERT INTO tenants (name, slug, type) VALUES (?, ?, 'paid')`)
.run(tenant_name, tenant_slug);

const tenantId = tenantResult.lastInsertRowid;

const hash = bcrypt.hashSync(password, 10);

db.prepare(`
 INSERT INTO users (tenant_id, username, password_hash, role)
 VALUES (?, ?, ?, 'paid_user')
`).run(tenantId, username, hash);

initTenantDb(tenantId);

res.json({ ok: true, tenant_id: tenantId });
});

module.exports = router;
