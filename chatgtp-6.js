import "dotenv/config"
import OpenAI from "openai"

const endpoint = process.env.OPENAI_BASE_URL2

const openai = new OpenAI({
  baseURL: endpoint,
  apiKey: process.env.OPENAI_API_KEY2
})

const INSTRUCCIONES = `Eres un extractor de datos empresarial de alta precisión.
Tu única tarea es leer el texto desestructurado del usuario y extraer las entidades en formato JSON estricto.
Debes responder ÚNICAMENTE con el objeto JSON válido.
NO agregues introducciones, comentarios, ni bloques de texto adicionales.
Estructura obligatoria del JSON:
{
  "cliente": {
    "nombre": "string o null",
    "dni": "string o null",
    "telefono": "string o null",
    "email": "string o null"
  },
  "productoServicio": {
    "nombre": "string o null",
    "monto": "number o null",
    "moneda": "PEN | USD | null",
    "fecha": "YYYY-MM-DD o null"
  },
  "incidente": {
    "categoria": "Garantia | Servicio Tecnico | Reclamo General",
    "urgencia": "Baja | Media | Alta",
    "resumen": "resumen breve del problema en una sola oracion",
    "solicitudCliente": "que solucion pide el cliente"
  }
}`

async function procesarTexto(textoEntrada) {
  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL2,
    instructions: INSTRUCCIONES,
    input: textoEntrada,
    max_output_tokens: 700,
    text: { verbosity: "low" },
    reasoning: { effort: "low" }
  })

  return response.output_text;
}

//Limpieza y conversion a objeto nativo de JavaScript
function convertirAObjeto(textoIA) {
  const jsonLimpio = textoIA
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim()

  try {
    return JSON.parse(jsonLimpio);
  } catch (error) {
    console.error("Error al convertir a JSON:", error.message);
    return null
  }
}

async function ejecutar() {
  const mensajePrueba = `
    Buenas tardes, soy Marcos Quispe con DNI 70809010. Les escribo muy preocupado
    porque el 22/11/2026 compré en la tienda un televisor Samsung de 55 pulgadas
    por S/ 1899.90. El equipo llegó con la pantalla rota y no me dan solución.
    Necesito el cambio urgente del producto o la devolución de mi dinero.
    Mi celular es 987654321 y mi correo marcos.quispe@email.com.
  `;

  console.log("Extrayendo entidades con IA...\n");

  const textoRespuesta = await procesarTexto(mensajePrueba);
  const datos = convertirAObjeto(textoRespuesta);

  console.log("Resultado estructurado (JSON):");
  console.log(JSON.stringify(datos, null, 2));
}
ejecutar();
