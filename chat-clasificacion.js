import "dotenv/config"
import OpenAI from "openai"
import readLine from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

const endpoint = process.env.OPENAI_BASE_URL2

const openai = new OpenAI({
  baseURL: endpoint,
  apiKey: process.env.OPENAI_API_KEY2
});

// clasificar sentimientos y emociones
const INSTRUCCIONES = `Eres un sistema experto en Procesamiento de Lenguaje Natural (PLN) especializado en clasificar sentimientos, emociones y tono.
Analiza la carta o mensaje del usuario y responde con este formato:
- Sentimiento general: (Positivo / Negativo / Neutro / Mixto)
- Emociones detectadas: (lista de emociones como felicidad, tristeza, frustración, enojo, gratitud, etc.)
- Tono: (Formal, Informal, Sarcástico, Desesperado, etc.)
- Nivel de intensidad: (del 1 al 10)
- Intención principal: (Queja, Felicitación, Agradecimiento, etc.)
- Motivo clave: (breve explicación de por qué se siente así)
- Acción recomendada: (qué debería hacer la empresa o persona al recibir este mensaje)
Sé directo, claro y no agregues relleno innecesario.`

async function clasificarTexto(texto) {
  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL2,
    instructions: INSTRUCCIONES,
    input: texto,
    max_output_tokens: 500,
    text: { verbosity: "low" },
    reasoning: { effort: "low" }
  });

  return response.output_text
}

const rl = readLine.createInterface({ input, output })

console.log("CLASIFICADOR DE SENTIMIENTOS Y CARTAS");
console.log("Escribe una carta para analizarla. Escribe 'salir' para terminar.\n")

try {
  while (true) {
    const texto = await rl.question("\n mensaje: ")

    if (texto.trim().toLowerCase() === "salir") break;
    if (!texto.trim()) continue;

    console.log("\nAnalizando emociones...\n")
    const resultado = await clasificarTexto(texto)
    console.log(resultado);
  }
} catch (err) {
} finally {
  rl.close()
}
