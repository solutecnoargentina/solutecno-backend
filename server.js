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

const app = express();

fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'data', 'tenants'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'sessions'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });

initMasterDb();
ensureSeedData();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'solutecno-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/stats', statsRoutes);

startDemoExpiryJob();
startCleanupJob();

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);
});
