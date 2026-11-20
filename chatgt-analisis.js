import "dotenv/config";
import OpenAI from "openai";
import fs from "node:fs";

// Accesos
const endpoint = process.env.OPENAI_BASE_URL;
const deploymentName = process.env.OPENAI_MODEL;
const apikey = process.env.OPENAI_API_KEY;

const openai = new OpenAI({
  baseURL: endpoint,
  apiKey: apikey
})

//Accder al archivo que analizaremos
const imagenBase64 = fs.readFileSync("factura.png").toString("base64") 

const res = await openai.responses.create({
  model: deploymentName,
  instructions: "Responde siempre en español",
  input: [
    {
      role: "user",
      content:[{
        type: "input_text", text: "¿Que dice este documento?, retorna los datos del cliente y el total de la factura "
      },
    {type: "input_image", image_url: `data:image/png;base64,${imagenBase64}`}]
    }
  ]

})

console.log(res.output_text)