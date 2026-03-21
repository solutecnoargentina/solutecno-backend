const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/master');
const { initTenantDb } = require('../db/tenant');

const router = express.Router();

router.post('/login', (req, res) => {
const { username, password } = req.body || {};

if (!username || !password) {
return res.status(400).json({ error: 'Faltan credenciales' });
}

const db = getDb();
const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);

if (!user) {
return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
}

if (user.expires_at && new Date(user.expires_at).getTime() < Date.now()) {
return res.status(403).json({ error: 'Usuario vencido' });
}

const ok = bcrypt.compareSync(password, user.password_hash);

if (!ok) {
return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
}

if (user.tenant_id) {
initTenantDb(user.tenant_id);
}

const token = jwt.sign({
user_id: user.id,
tenant_id: user.tenant_id,
role: user.role,
username: user.username
}, process.env.JWT_SECRET, { expiresIn: '12h' });

res.json({
token,
user: {
id: user.id,
username: user.username,
role: user.role,
tenant_id: user.tenant_id
}
});
});

module.exports = router;
