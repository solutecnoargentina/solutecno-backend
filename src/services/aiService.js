const axios = require("axios")

const OLLAMA_URL = "http://localhost:11434/api/generate"

// modelo que ya tengas descargado (recomendado qwen)
const MODEL = "qwen2.5:3b"

async function generarRespuesta(prompt) {
  try {
    const response = await axios.post(OLLAMA_URL, {
      model: MODEL,
      prompt: prompt,
      stream: false
    })

    return response.data.response || "No pude generar respuesta."
  } catch (error) {
    console.error("Error con Ollama:", error.message)
    return "Error al procesar la respuesta."
  }
}

module.exports = {
  generarRespuesta
}
