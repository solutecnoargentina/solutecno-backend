const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');

const sessions = {};

function createSession(tenantId) {
    if (sessions[tenantId]) {
        console.log(`⚠️ Sesión ya existe para ${tenantId}`);
        return sessions[tenantId];
    }

    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: `tenant_${tenantId}`,
            dataPath: path.join(__dirname, '../../instances/sessions')
        }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    sessions[tenantId] = {
        client,
        status: 'inicializando',
        qr: null
    };

    client.on('qr', (qr) => {
        sessions[tenantId].qr = qr;
        sessions[tenantId].status = 'qr';
        console.log(`📲 QR generado para ${tenantId}`);
    });

    client.on('ready', () => {
        sessions[tenantId].status = 'conectado';
        sessions[tenantId].qr = null;
        console.log(`✅ WhatsApp conectado para ${tenantId}`);
    });

    client.on('disconnected', () => {
        sessions[tenantId].status = 'desconectado';
        console.log(`❌ WhatsApp desconectado para ${tenantId}`);
    });

    client.initialize();

    return sessions[tenantId];
}

function getSession(tenantId) {
    return sessions[tenantId] || null;
}

function getQr(tenantId) {
    return sessions[tenantId]?.qr || null;
}

function getStatus(tenantId) {
    return sessions[tenantId]?.status || 'no-existe';
}

function closeSession(tenantId) {
    if (sessions[tenantId]) {
        sessions[tenantId].client.destroy();
        delete sessions[tenantId];
        console.log(`🗑️ Sesión eliminada para ${tenantId}`);
    }
}

module.exports = {
    createSession,
    getSession,
    getQr,
    getStatus,
    closeSession
};
