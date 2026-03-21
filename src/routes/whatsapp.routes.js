const express = require('express');
const { authRequired } = require('../middleware/auth');
const { startClient, stopClient, getWhatsappStatus } = require('../services/whatsappService');

const router = express.Router();

router.use(authRequired);

router.get('/status', (req, res) => {
const data = getWhatsappStatus(req.user.tenant_id);
res.json(data);
});

router.post('/start', async (req, res) => {
await startClient(req.user.tenant_id);
res.json({ ok: true, message: 'Cliente WhatsApp iniciando' });
});

router.post('/stop', async (req, res) => {
await stopClient(req.user.tenant_id);
res.json({ ok: true, message: 'Cliente WhatsApp detenido' });
});

module.exports = router;
