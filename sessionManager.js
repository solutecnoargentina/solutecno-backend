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
            dataPath: path.join(__dirname, 'sessions')
        }),
        puppeteer: {
            headless: true,
            executablePath: '/usr/bin/google-chrome-stable',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
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

    client.on('authenticated', () => {
        sessions[tenantId].status = 'autenticado';
        console.log(`🔐 WhatsApp autenticado para ${tenantId}`);
    });

    client.on('disconnected', (reason) => {
        sessions[tenantId].status = 'desconectado';
        console.log(`❌ WhatsApp desconectado para ${tenantId}. Motivo: ${reason}`);
    });

    client.on('auth_failure', (msg) => {
        sessions[tenantId].status = 'error_auth';
        console.log(`❌ Error de autenticación para ${tenantId}: ${msg}`);
    });

    client.initialize().catch((err) => {
        sessions[tenantId].status = 'error';
        console.error(`❌ Error al inicializar sesión ${tenantId}:`, err);
    });

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

async function closeSession(tenantId) {
    if (sessions[tenantId]) {
        try {
            await sessions[tenantId].client.destroy();
        } catch (e) {
            console.error(`Error al cerrar sesión ${tenantId}:`, e);
        }
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
