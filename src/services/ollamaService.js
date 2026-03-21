const axios = require('axios');

async function askOllama({ model, prompt, temperature = 0.4 }) {
const response = await axios.post(process.env.OLLAMA_URL, {
model,
prompt,
stream: false,
options: {
temperature
}
}, {
timeout: 120000
});

return String(response.data.response || '').trim();
}

module.exports = { askOllama };
