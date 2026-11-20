import "dotenv/config";
import OpenAI from "openai";
import readLine from "node:readline/promises";
import {
  stdin as input,
  stdout as output
} from "node:process";

// Accesos
const CONFIG = {
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
  deploymentName: process.env.OPENAI_MODEL
};

// Validacion de config
const openai = new OpenAI({
  baseURL: CONFIG.baseURL,
  apiKey: CONFIG.apiKey
});

//Use > model > app >> Model >> User
//Arreglo de objetos reemplazara a la db o api para el ejemplo
const libros = [
  { titulo: "Javascript the good parts",autor: "Douglas Crockford",tema: "programacion", copias: 2 } ,
  { titulo: "Clean Code",autor: "Robert Martin",tema: "programacion", copias: 1 } ,
  { titulo: "Intruducion a las bases de datos",autor: "C. date",tema: "base datos", copias: 0 } ,
  { titulo: "Redes de computadoras",autor: "Andrew tanem",tema: "redes", copias: 3 },
  { titulo: "Inteligencia Artificial",autor: "Russel Norving",tema: "inteligencia artificial", copias: 1 }  
]

//Convertir con tildes en una sin tildes
const normalizar = (texto) => 
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

//Funciones que utilizara la IA (modelo) para repsonder al usuario

function buscarLibro({consulta}){
  const q = normalizar(consulta)
  const encontrados = libros.filter((libro) => 
    normalizar(`${libro.titulo} ${libro.autor} ${libro.tema}`).includes(q))
  return encontrados.length > 0
  ? { encontrados}
  : { encontrados: [], mensaje: 'No encontramos el libro'}
}

//console.log(buscarLibro({consulta: 'artificial'}))


function listarDisponible(){
  return { disponibles: libros.filter((libro) => libro.copias > 0) }
}

function prestarLibro({titulo}){
  const q = normalizar(titulo)
  const coincidencias = libros.filter((libro) => 
    normalizar(libro.titulo).includes(q))

  if (coincidencias.length === 0){
    return { exito: false, mensaje: ' No existe con ese titulo'}
  }

  //Mas de un libro que coincida
  if (coincidencias.length > 1){
    return {
      exito: false,
      mensaje: 'Hay varios libros con ese nombre',
      opciones: coincidencias.map((libro) => libro.titulo)
    }
  }

  //Existe el libro pero no tenemos stock
  const libro = coincidencias[0]
  if (libro.copias === 0){
    return{
      exito: false,
      mensaje: `No queda copias disponibles de: ${libro.titulo}`
    }
  }

  //En este apartodo existe el libro y tenemos en stock
  libro.copias -= 1
  return {
    exito: true,
    titulo: libro.titulo,
    copiasRestantes: libro.copias
  }
}

//Coleccion de funciones
const funciones = { buscarLibro, listarDisponible, prestarLibro }

// console.log(listarDisponible()) //test

//Descripcion de cada funcion para le modelo
//El MODELO no es capaz de vizualizar las funciones (lineas arriba) Tampoco descriciones
//consumira la logica de la APP desde tools
const tools = [
  {
    type: "function",
    name: "buscarLibro",
    description: "Buscar libro por titulos , autor o temas y devulve sus datos y copias disponibles",
    parameters: {
      type: "object",
      properties: {
        consulta : {type: "string", description: "texto a buscar por el ejemplo 'javascrip' o 'redes'"}
      },
      required: ["consulta"],
      additionalProperties: false
    },
    strict: true
  },

  {
    type: "function",
    name: "listarDisponible",
    description: "Lista todos los libros que tienen al menos una copia disponible para prestamo",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false
    },
    strict: true
  },

  {
    type: "function",
    name: "prestarLibro",
    description: "Registrar el prestamo de un libro y descuenta una copia. Usala solo cuando el usuario confirme que quiere llevarse el libro",
    parameters: {
      type: "object",
      properties: {
        titulo: {type: "string", description: "Titulo (o parte del titulo) del libro a prestar "}
      },
      required: ["titulo"],
      additionalProperties: false
    },
    strict: true
  }
]

const INSTRUCIONES = `Eres el asistente de la biblioteca de una institucion educactiva.
Responde siempre en español, de forma amable y breve.
Para consultar o modificar el catalogo usa SIEMPRE  las funciones disponible; no inventes libros ni cantidades
Si el usuario no ha confirmado un prestamo, pregunta antes de ejecutarlo
`

//Ciclo de conversacion 
let ultimaRespuestaId = null //perimite continuar la conversacion (evita reenviar el historial)

async function preguntar(textoUsuario) {
  
  let inputActual = [{ role: "user", content: textoUsuario}]

  //Prevencion : cliclo x5
  for (let vuelta = 0; vuelta < 5; vuelta++){
    const response = await openai.responses.create({
      model: CONFIG.deploymentName,
      instructions:  INSTRUCIONES,
      input: inputActual,
      tools,
      previous_response_id: ultimaRespuestaId ?? undefined,
      max_output_tokens: 2000,
      reasoning: {effort: "low"}
    })

    //continuidad de la conversacion
    ultimaRespuestaId = response.id

    //¿ EL modelo solicito ejecutar alguna funcion?
    const llamadas = response.output.filter((item) => item.type === 'function_call')


    //  Si no solicito ninguna, ya tiene una respuesta final
    if (llamadas.length === 0){
      return response.output_text
    }

    //Ejecutamos cada funcion solicitada y devolvemos el resultado al modelo
    //FUNCTION > USER > MODEL

    inputActual = llamadas.map((llamada)=> {
      const args = JSON.parse(llamada.arguments)
      console.log(`[Funcion] ${llamada.name}(${JSON.stringify(args)})`)

      let resultado

      try{
        resultado = funciones[llamada.name](args)

      }catch(e){
        resultado = {error: e.message}
      }
      console.log(`[resultado] ${JSON.stringify(resultado)}`)

      return {
        type: "function_call_output",
        call_id: llamada.call_id,
        output: JSON.stringify(resultado)
      }
    })
  }


  return "No puedo completar la solicitud, intenta reformularla"

}

//VEREFICA LA FUNCIONALIDAD
//NodeJs  permite utilizar la consola 
const rl = readLine.createInterface({input, output})
console.log("Asistente de bibloteca. Escribe 'salir' para terminar")
console.log("Prueba con: ¿Que libros tiene de programacion?, 'Quiero llevarme Clean Code" )

while(true){
  const texto = await rl.question('Tu: ')

  if(texto.trim().toLowerCase() === 'salir') break;
  if(!texto.trim()) continue;

  //Interactuar con el modelo
  try{
    const respuesta = await preguntar(texto)
    console.log(`\nIA: ${respuesta}\n`)
    
  }catch(e){
    console.error(e.message)
  }
}

rl.close()



