import "dotenv/config"
import express from "express"
import multer from "multer"
import path from "node:path"
import { fileURLToPath } from "node:url"
import OpenAI from "openai"
import { leerPDF, OcrError} from "./ocr.js"

//Directorio donde desplegamos frontend
const __dirname = path.dirname(fileURLToPath(import.meta.url))

//puerto del servidor
const PORT = process.env.PORT || 3000

//Constante tamaño maximo de archivo PDF
const MAX_FILE_MB = Number(process.env.MAX_FILE_MB) || 4

//Validacion que garantice que tenemos las claves para AZURE
for (const nombre of ["DI_ENDPOINT", "DI_KEY"]){
  if(!process.env[nombre]){
    console.error(`Falta ${nombre}. Revisa tu archivo .env`)
    process.exit
  }
}

//Cliente OpenAI
const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY
})

const INSTRUCCIONES = `Eres un asistente especializado ÚNICA Y EXCLUSIVAMENTE en la Historia, Cultura y Realidad Nacional del Perú.

Tu conocimiento abarca toda la trayectoria histórica y contemporánea del Perú, incluyendo:
- Historia general (épocas prehispánica, incaica, virreinato, independencia y república).
- Política y gobernantes (presidentes antiguos, modernos y actuales, procesos electorales e hitos políticos).
- Deporte nacional e hitos deportivos (fútbol peruano, vóley, atletas, olimpiadas, clubes peruanos).
- Cine, arte, literatura y entretenimiento peruano (películas, directores, música criolla, literatura, gastronomía tradicional).
- Cultura, geografía, símbolos patrios, tradiciones y personajes ilustres del Perú.

Reglas obligatorias:
1. Responde de forma clara, breve, educada y en español.
2. Si el usuario te pregunta sobre cualquier tema que NO esté relacionado con el Perú (por ejemplo: programación, matemáticas, ciencia general, política o historia de otros países, etc.), debes responder de forma amable y respetuosa exactamente esto o algo similar:
"Disculpa, soy un asistente especializado únicamente en la historia, cultura y realidad del Perú. No puedo responder a preguntas fuera de este ámbito."
3. No desvíes el tema bajo ninguna circunstancia; mantén siempre el enfoque 100% en el Perú.
4. Respuestas concisas para ahorro de tokens: Responde siempre de forma breve, precisa y directa al grano (máximo 2 párrafos cortos o viñetas puntuales). Evita introducciones largas, rodeos o relleno innecesario.`

//servidor 
const app = express()

//Parsear JSON en peticiones
app.use(express.json())

//Configuracion multer (subir binarios)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: 1},
  fileFilter(req, file, cb) {
    if(file.mimetype === 'application/pdf'){
      return cb(null, true)
    }
    cb(new OcrError("El archivo deber ser un  Pdf", 400))
  }
})

//Servir el frontend
app.use(express.static(path.join(__dirname, "public")))

//Metodo POST para recibir archivos OCR
app.post('/api/ocr', upload.single("archivo"), async (req, res, next) => {
  try{
    if (!req.file) throw new OcrError ("Seleccione un PDF para continuar" , 400)
      res.json(await leerPDF(req.file.buffer))
  }catch(e){
    next(e)
  }
})

//Endpoint Chat Historia del Peru
app.post('/api/chat-texto', async (req, res) => {
  try {
    const { mensaje } = req.body;
    if (!mensaje) {
      return res.status(400).json({ error: "El mensaje es obligatorio" });
    }
    const respuesta = await openai.responses.create({
      model: process.env.OPENAI_MODEL,
      instructions: INSTRUCCIONES,
      input: mensaje,
      max_output_tokens: 900,
      reasoning: { effort: 'low' }
    });
    res.json({ respuesta: respuesta.output_text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al comunicarse con la IA" });
  }
});

//Manejo de errores centralizado
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError){
    const message = 
      err.code === 'LIMIT_FILE_SIZE' ?
      'El pdf supera el limite permitido'
      : 'No se pudo procesar el archivo'

      return res.status(400).json({ error: message })
  }

  if (err instanceof OcrError) {
    return res.status(err.status).json({ error: err.message})
  }

  console.error(err)
  res.status(500).json({
    error: 'Error interno del servidor'
  })
})

app.listen(PORT , () => {
  console.log(`Aplicacion ejecutandose en http://localhost:${PORT}`)
})
