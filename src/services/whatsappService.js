const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');

let client = null;

function startWhatsApp() {

if (client) return;

client = new Client({
authStrategy: new LocalAuth({
dataPath: './sessions'
}),
puppeteer: {
executablePath: '/usr/bin/chromium-browser',
headless: true,
args: [
'--no-sandbox',
'--disable-setuid-sandbox',
'--disable-dev-shm-usage',
'--disable-accelerated-2d-canvas',
'--no-first-run',
'--no-zygote',
'--single-process',
'--disable-gpu'
]
}
});

// QR
client.on('qr', async (qr) => {
const qrData = await qrcode.toDataURL(qr);
fs.writeFileSync('./qr.txt', qrData);
console.log('QR generado, abrir /qr en navegador');
});

// listo
client.on('ready', () => {
console.log('WhatsApp conectado correctamente');
});

// mensajes
client.on('message', async (msg) => {

console.log('Mensaje recibido:', msg.body);

// ignorar grupos
if (msg.from.includes('@g.us')) return;

// ignorar estados
if (msg.from.includes('status')) return;

// evitar loop
if (msg.fromMe) return;

const text = msg.body.toLowerCase();

let respuesta = '';

if (text.includes('precio') || text.includes('cuanto') || text.includes('vale')) {
respuesta = 'Perfecto 👌 te cuento: ofrecemos soluciones automatizadas para ventas y atención por WhatsApp. ¿Querés que te explique cómo puede ayudarte en tu negocio?';
}
else if (text.includes('comprar') || text.includes('quiero')) {
respuesta = 'Excelente decisión 💥 nuestro sistema puede responder clientes, generar ventas y automatizar tu negocio 24/7. ¿Qué tipo de negocio tenés?';
}
else if (text.includes('hola') || text.includes('buenas')) {
respuesta = 'Hola 👋 ¿cómo estás? Contame, ¿estás buscando mejorar tus ventas o automatizar tu atención?';
}
else {
respuesta = 'Perfecto 👍 contame un poco más así puedo ayudarte mejor. Nuestro sistema está diseñado para aumentar ventas y automatizar respuestas.';
}

await msg.reply(respuesta);

console.log('Respuesta enviada:', respuesta);

});

// errores
client.on('auth_failure', msg => {
console.log('Error de autenticación:', msg);
});

client.on('disconnected', reason => {
console.log('WhatsApp desconectado:', reason);
client = null;
});

client.initialize();
}

module.exports = { startWhatsApp };
