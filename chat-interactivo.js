import "dotenv/config";
import OpenAI from "openai";
import readLine from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

// Configuracion de accesos al servicio Azure OpenAI
const CONFIG = {
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
  deploymentName: process.env.OPENAI_MODEL
};

// Instanciacion del cliente SDK
const openai = new OpenAI({
  baseURL: CONFIG.baseURL,
  apiKey: CONFIG.apiKey
});

// Estructura de datos en memoria (simulacion de base de datos)
const clientes = [
  { dni: "60753011", nombre: "Junior Pineda", deuda: 450.00 },
  { dni: "87654321", nombre: "Alexis Torres", deuda: 0.00 },
  { dni: "70809010", nombre: "Marcos Quispe", deuda: 120.50 }
];

// Limpieza de formato para busqueda exacta
const normalizar = (texto) => String(texto).trim().toLowerCase();

// Logica local: Consulta de saldo y estado de cuenta por DNI
function consultarDeuda({ dni }) {
  const d = normalizar(dni);
  const cliente = clientes.find((c) => normalizar(c.dni) === d);

  if (!cliente) {
    return { exito: false, mensaje: `No existe cliente registrado con el DNI ${dni}` };
  }

  return {
    exito: true,
    nombre: cliente.nombre,
    dni: cliente.dni,
    deuda: cliente.deuda,
    mensaje: cliente.deuda === 0 
      ? "No registra deudas pendientes. Su estado de cuenta esta al dia." 
      : `Registra una deuda pendiente de S/ ${cliente.deuda.toFixed(2)}`
  };
}

// Logica local: Validacion de reglas de negocio y deduccion de saldo
function pagarDeuda({ dni, monto }) {
  const d = normalizar(dni);
  const cliente = clientes.find((c) => normalizar(c.dni) === d);

  //  Existencia del cliente
  if (!cliente) {
    return { exito: false, mensaje: "Cliente no registrado en el sistema." };
  }

  // Comprobacion de deuda activa mayor a cero
  if (cliente.deuda <= 0) {
    return { exito: false, mensaje: "El cliente no tiene deudas pendientes por cancelar." };
  }

  // Comprobacion de valor numerico positivo
  const cantidad = Number(monto);
  if (isNaN(cantidad) || cantidad <= 0) {
    return { exito: false, mensaje: "El monto ingresado debe ser un numero mayor a cero." };
  }

  //  Restriccion de monto maximo (no exceder la deuda total)
  if (cantidad > cliente.deuda) {
    return { 
      exito: false, 
      mensaje: `El monto ingresado (S/ ${cantidad.toFixed(2)}) excede la deuda actual de S/ ${cliente.deuda.toFixed(2)}.` 
    };
  }

  // Descuento efectivo en la estructura de datos
  cliente.deuda -= cantidad;

  return {
    exito: true,
    nombre: cliente.nombre,
    montoPagado: cantidad,
    deudaRestante: cliente.deuda,
    mensaje: `Pago registrado correctamente. Saldo restante: S/ ${cliente.deuda.toFixed(2)}`
  };
}

// Diccionario de funciones para invocacion por nombre de metodo
const funciones = { consultarDeuda, pagarDeuda };

// Contrato de herramientas en formato JSON Schema con modo estricto
const tools = [
  {
    type: "function",
    name: "consultarDeuda",
    description: "Consulta el estado de cuenta y la deuda de un cliente registrado usando su numero de DNI",
    parameters: {
      type: "object",
      properties: {
        dni: { type: "string", description: "Numero de DNI del cliente compuesto por 8 digitos" }
      },
      required: ["dni"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "pagarDeuda",
    description: "Registra un abono y descuenta el saldo pendiente del cliente tras su confirmacion previa",
    parameters: {
      type: "object",
      properties: {
        dni: { type: "string", description: "Numero de DNI del cliente" },
        monto: { type: "number", description: "Cantidad exacta en soles a pagar" }
      },
      required: ["dni", "monto"],
      additionalProperties: false
    },
    strict: true
  }
];

// Instrucciones del sistema
const INSTRUCCIONES = `Eres el asistente virtual de cobranzas y pagos de una tienda comercial.
Reglas obligatorias:
1. Saluda formalmente. Lo primero que debes hacer es solicitar al usuario su DNI para identificarlo en el sistema.
2. Tras identificar al cliente por su DNI, ofrece las dos alternativas disponibles:
   (1) Conocer el estado de la deuda actual.
   (2) Pagar la deuda.
3. Para cualquier consulta o actualizacion, utiliza exclusivamente las funciones disponibles (consultarDeuda, pagarDeuda); no inventes montos ni transacciones.
4. Antes de invocar la funcion pagarDeuda, solicita confirmacion explicita al cliente indicando el monto exacto que se va a procesar.
5. Si un pago excede la deuda o si el cliente no tiene deuda, traslada la respuesta tecnica del sistema al usuario con claridad.
6. Responde siempre en espanol, de forma concisa, educada y profesional.`;

// Almacena el identificador del turno anterior para preservar el historial sin reenviarlo
let ultimaRespuestaId = null;

// Gestion de ciclo interactivo con el modelo
async function preguntar(textoUsuario) {
  let inputActual = [{ role: "user", content: textoUsuario }];

  // Limite de seguridad: maximo 5 iteraciones por turno
  for (let vuelta = 0; vuelta < 5; vuelta++) {
    const response = await openai.responses.create({
      model: CONFIG.deploymentName,
      instructions: INSTRUCCIONES,
      input: inputActual,
      tools,
      previous_response_id: ultimaRespuestaId ?? undefined,
      max_output_tokens: 1500,
      reasoning: { effort: "low" }
    });

    // Actualizacion del ID de contexto conversacional
    ultimaRespuestaId = response.id;

    // Extraccion de llamadas a funciones requeridas por el modelo
    const llamadas = response.output.filter((item) => item.type === "function_call");

    // Si no existen solicitudes de funcion, el modelo devolvio la respuesta final
    if (llamadas.length === 0) {
      return response.output_text;
    }

    // Resolucion secuencial de llamadas y conversion a function_call_output
    inputActual = llamadas.map((llamada) => {
      const args = JSON.parse(llamada.arguments);
      console.log(`[Funcion] ${llamada.name}(${JSON.stringify(args)})`);

      let resultado;
      try {
        resultado = funciones[llamada.name](args);
      } catch (e) {
        resultado = { error: e.message };
      }
      console.log(`[Resultado] ${JSON.stringify(resultado)}`);

      return {
        type: "function_call_output",
        call_id: llamada.call_id,
        output: JSON.stringify(resultado)
      };
    });
  }

  return "No se pudo completar la solicitud. Por favor, intente reformular su consulta.";
}

// Configuracion de entrada/salida para la terminal
const rl = readLine.createInterface({ input, output });
console.log("Sistema de Cobranzas y Pagos - Tienda Comercial");
console.log("Escriba 'salir' para finalizar la sesion.\n");

// Bucle continuo de conversacion
try {
  while (true) {
    const texto = await rl.question("Tu: ");

    if (texto.trim().toLowerCase() === "salir") break;
    if (!texto.trim()) continue;

    try {
      const respuesta = await preguntar(texto);
      console.log(`\nAsistente: ${respuesta}\n`);
    } catch (e) {
      console.error("Error de ejecucion:", e.message);
    }
  }
} catch (err) {
  // Finalizacion del flujo de entrada
} finally {
  // Cierre ordenado de la interfaz de consola
  rl.close();
}
