const express = require('express');
const router = express.Router();

const {
    createSession,
    getQr,
    getStatus,
    closeSession
} = require('../services/sessionManager');

// Crear sesión
router.post('/create/:tenantId', (req, res) => {
    const { tenantId } = req.params;
    createSession(tenantId);
    res.json({ ok: true, message: `Sesión creada para ${tenantId}` });
});

// Obtener QR
router.get('/qr/:tenantId', (req, res) => {
    const { tenantId } = req.params;
    const qr = getQr(tenantId);
    res.json({ qr });
});

// Estado
router.get('/status/:tenantId', (req, res) => {
    const { tenantId } = req.params;
    const status = getStatus(tenantId);
    res.json({ status });
});

// Cerrar sesión
router.post('/logout/:tenantId', (req, res) => {
    const { tenantId } = req.params;
    closeSession(tenantId);
    res.json({ ok: true });
});

module.exports = router;
