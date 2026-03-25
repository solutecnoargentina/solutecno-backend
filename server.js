const sessionManager = require('./sessionManager');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initMasterDb, ensureSeedData } = require('./src/db/master');
const authRoutes = require('./src/routes/auth.routes');
const adminRoutes = require('./src/routes/admin.routes');
const tenantRoutes = require('./src/routes/tenant.routes');
const agentRoutes = require('./src/routes/agent.routes');
const whatsappRoutes = require('./src/routes/whatsapp.routes');
const statsRoutes = require('./src/routes/stats.routes');
const { startDemoExpiryJob } = require('./src/jobs/demoExpiryJob');
const { startCleanupJob } = require('./src/jobs/cleanupJob');

// 👉 SISTEMA VIEJO (NO SE BORRA, SOLO SE DESACTIVA)
const { startWhatsApp } = require('./src/services/whatsappService');

const app = express();

// Carpetas necesarias
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'data', 'tenants'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'sessions'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });

// DB
initMasterDb();
ensureSeedData();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

// Health
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'solutecno-backend' });
});

// Rutas API existentes (NO TOCAR)
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/stats', statsRoutes);

// Jobs
startDemoExpiryJob();
startCleanupJob();

// Puerto
const PORT = Number(process.env.PORT || 3000);

// QR viejo (se deja por compatibilidad)
app.get('/qr', (req, res) => {
  const { getTenantDb } = require('./src/db/tenant');
  const db = getTenantDb(1);

  const row = db.prepare('SELECT qr_text FROM whatsapp_state ORDER BY id DESC LIMIT 1').get();

  if (!row || !row.qr_text) {
    return res.send('QR no disponible');
  }

  const base64Data = row.qr_text.replace(/^data:image\/png;base64,/, '');
  const img = Buffer.from(base64Data, 'base64');

  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': img.length
  });
  res.end(img);
});

// 🚀 NUEVO SISTEMA MULTI SESIONES

// Crear sesión
app.post('/whatsapp/create/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  sessionManager.createSession(tenantId);
  res.json({ ok: true });
});

// Obtener QR
app.get('/whatsapp/qr/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  res.json({ qr: sessionManager.getQr(tenantId) });
});

// Estado
app.get('/whatsapp/status/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  res.json({ status: sessionManager.getStatus(tenantId) });
});

// Logout
app.post('/whatsapp/logout/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  sessionManager.closeSession(tenantId);
  res.json({ ok: true });
});

// Servidor
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);
});

// ❌ DESACTIVADO (IMPORTANTE)
// startWhatsApp();
