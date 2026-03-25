const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');

// 👉 IA
const { generarRespuesta } = require('./aiService');

let client = null;

function startWhatsApp() {

console.log('🚀 INICIANDO WHATSAPP...');

if (client) {
console.log('⚠️ WhatsApp ya estaba iniciado');
return;
}

try {

client = new Client({
authStrategy: new LocalAuth({
dataPath: './sessions'
}),
puppeteer: {
headless: "new",
args: [
'--no-sandbox',
'--disable-setuid-sandbox',
'--disable-dev-shm-usage',
'--disable-accelerated-2d-canvas',
'--no-first-run',
'--no-zygote',
'--disable-gpu'
]
}
});

console.log('✅ Cliente WhatsApp creado');

// QR
client.on('qr', async (qr) => {
const qrData = await qrcode.toDataURL(qr);
fs.writeFileSync('./qr.txt', qrData);
console.log('📲 QR generado, abrir /qr en navegador');
});

// listo
client.on('ready', () => {
console.log('🟢 WhatsApp conectado correctamente');
});

// mensajes
client.on('message', async (msg) => {

try {

console.log('📩 Mensaje recibido:', msg.body);

// ❌ ignorar grupos
if (msg.from.includes('@g.us')) return;

// ❌ ignorar estados
if (msg.from.includes('status')) return;

// ❌ evitar loop
if (msg.fromMe) return;

const texto = msg.body;
const text = msg.body.toLowerCase();

let respuesta = '';

// -----------------------------
// RESPUESTAS RÁPIDAS (fallback)
// -----------------------------
if (text.includes('precio') || text.includes('cuanto') || text.includes('vale')) {
respuesta = 'Perfecto 👌 te cuento: ofrecemos soluciones automatizadas para ventas y atención por WhatsApp. ¿Querés que te explique cómo puede ayudarte en tu negocio?';
}
else if (text.includes('comprar') || text.includes('quiero')) {
respuesta = 'Excelente decisión 💥 nuestro sistema puede responder clientes, generar ventas y automatizar tu negocio 24/7. ¿Qué tipo de negocio tenés?';
}
else if (text.includes('hola') || text.includes('buenas')) {
respuesta = 'Hola 👋 ¿cómo estás? Contame, ¿estás buscando mejorar tus ventas o automatizar tu atención?';
}

// -----------------------------
// SI NO ENTRA EN REGLAS → IA
// -----------------------------
else {

console.log('🤖 Usando IA...');

respuesta = await generarRespuesta(`
Sos un empleado de Solutecno Argentina.
No sos una IA.
Respondés como vendedor profesional.

OBJETIVO:
- Detectar oportunidad de venta
- Generar interés
- Llevar la conversación a cierre

REGLAS:
- No decir que sos IA
- Responder claro y corto
- Estilo humano

Mensaje del cliente:
${texto}
`);
}

// enviar respuesta
await msg.reply(respuesta);

console.log('✅ Respuesta enviada:', respuesta);

} catch (error) {
console.error('❌ Error procesando mensaje:', error);
}

});

// errores
client.on('auth_failure', msg => {
console.log('❌ Error de autenticación:', msg);
});

client.on('disconnected', reason => {
console.log('⚠️ WhatsApp desconectado:', reason);
client = null;
});

// 🔥 inicializar cliente
client.initialize()
.then(() => {
console.log('🚀 Inicialización enviada a WhatsApp');
})
.catch(err => {
console.error('❌ Error al inicializar WhatsApp:', err);
});

} catch (error) {
console.error('❌ Error general iniciando WhatsApp:', error);
}

}

module.exports = { 
startWhatsApp,
startClient: startWhatsApp
};
