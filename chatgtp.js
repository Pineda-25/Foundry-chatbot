import "dotenv/config";
import OpenAI from "openai";

// Accesos
const endpoint = process.env.OPENAI_BASE_URL;
const deploymentName = process.env.OPENAI_MODEL;
const apikey = process.env.OPENAI_API_KEY;

//Construir objeto del SDK OPENAI
const openai = new OpenAI({
  baseURL: endpoint,
  apiKey: apikey
})

async function main (){
  //La respuesta se sirve de manera fraccioanda 
  const runner = openai.responses.stream({
    model: deploymentName,
    instructions: "Eres un asistente útil. Responde en español de forma clara y breve ",
    input: "¿que sabes del Perú?",
    max_output_tokens: 1500,
    text: { verbosity: 'low'},
    reasoning: {  effort: 'low'}

  }).on("response.output_text.delta", (diff) => process.stdout.write(diff.delta))

  const result =  await runner.finalResponse()
  console.log('\n\nToken utilizados : ', result.usage)
}

main()