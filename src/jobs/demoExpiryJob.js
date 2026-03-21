const cron = require('node-cron');
const { getDb } = require('../db/master');

function startDemoExpiryJob() {
cron.schedule('*/10 * * * *', () => {
const db = getDb();

db.prepare(`UPDATE users SET is_active = 0 WHERE role = 'demo_user' AND expires_at IS NOT NULL AND expires_at < datetime('now')`).run();

db.prepare(`UPDATE tenants SET status = 'expired' WHERE type = 'demo' AND expires_at IS NOT NULL AND expires_at < datetime('now')`).run();

console.log('Job de vencimiento demo ejecutado');
});
}

module.exports = { startDemoExpiryJob };
