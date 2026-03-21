function isGroupMessage(msg) {
return msg.from && msg.from.includes('@g.us');
}

function isStatusMessage(msg) {
return msg.from === 'status@broadcast';
}

function isChannelLikeMessage(msg) {
return msg.from && msg.from.includes('@newsletter');
}

function shouldIgnoreMessage(msg) {
if (!msg) return true;
if (msg.fromMe) return true;
if (!msg.body || !String(msg.body).trim()) return true;
if (isGroupMessage(msg)) return true;
if (isStatusMessage(msg)) return true;
if (isChannelLikeMessage(msg)) return true;
return false;
}

module.exports = { shouldIgnoreMessage, isGroupMessage, isStatusMessage, isChannelLikeMessage };
