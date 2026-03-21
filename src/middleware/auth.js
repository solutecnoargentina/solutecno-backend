const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
const authHeader = req.headers.authorization || '';
const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

if (!token) {
return res.status(401).json({ error: 'Token requerido' });
}

try {
req.user = jwt.verify(token, process.env.JWT_SECRET);
next();
} catch (error) {
return res.status(401).json({ error: 'Token inválido' });
}
}

module.exports = { authRequired };
