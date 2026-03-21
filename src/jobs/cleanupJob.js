const cron = require('node-cron');

function startCleanupJob() {
cron.schedule('0 3 * * *', () => {
console.log('Job de limpieza diaria ejecutado');
});
}

module.exports = { startCleanupJob };
