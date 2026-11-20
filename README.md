# Foundry Chatbot & Azure AI Suite

Solución modular de inteligencia artificial desarrollada con **Node.js**, integrando **Azure OpenAI Service** y **Azure Document Intelligence**. Incluye asistentes conversacionales basados en *Function Calling*, análisis multimodal de imágenes (facturas), extracción OCR de documentos y una interfaz web interactiva.

---

## Modulos y Funcionalidades

### 1. Sistema Interactivo de Cobranzas (`chat-interactivo.js`)
* **Tecnología:** OpenAI Responses API con *Function Calling* y *Structured Outputs* (`strict: true`).
* **Flujo de Negocio:**
  * Identificación obligatoria del cliente por número de DNI.
  * Opciones guiadas: (1) Consulta de estado de cuenta y deuda actual, (2) Amortización o cancelación de saldo.
  * **Reglas de seguridad financiera:** Valida existencia del usuario, deuda activa mayor a cero, importes numéricos válidos y restricción de sobrepago (el abono no puede superar la deuda total).
  * Persistencia de sesión mediante `previous_response_id`.

### 2. Asistente Especializado en Historia del Perú (`chat-texto.js` y Web)
* **Consola y Web:** Implementado tanto por línea de comandos como con interfaz web (`public/index-chat.html`).
* **Restricción de Dominio (Guardrails):** Configurado con instrucciones estrictas para responder únicamente sobre historia, política, deportes, cine y cultura nacional del Perú, rechazando con cortesía cualquier consulta externa.
* **Optimización de Tokens:** Respuestas concisas con control de salida (`max_output_tokens: 300`) y bajo esfuerzo de razonamiento.

### 3. Asistente de Biblioteca con Herramientas Locales (`chat-biblioteca.js`)
* Chatbot interactivo para búsqueda en catálogo, consulta de disponibilidad de copias en tiempo real y registro de préstamos de libros.
* Búsqueda resiliente con normalización de caracteres Unicode (remueve tildes y diacríticos).

### 4. Análisis Multimodal de Facturas (`chatgt-analisis.js`)
* Procesamiento de imágenes PNG/JPG convertidas a Base64.
* Extracción automatizada de datos clave de facturación (datos del cliente, número de comprobante, conceptos y monto total a pagar).

### 5. Extracción OCR de Documentos PDF (`ocr.js` y `server.js`)
* API REST montada sobre **Express 5** y **Multer**.
* Extracción y segmentación de texto a partir de archivos PDF mediante Azure Document Intelligence.
* Interfaz web para carga y visualización de resultados (`public/index.html`).

---

## Estructura del Proyecto

```text
foundry/
├── public/
│   ├── css/
│   │   └── chat.css          # Estilos minimalistas y modulares del chat web
│   ├── js/
│   │   └── app.js           # Lógica frontend para carga de PDFs (OCR)
│   ├── index-chat.html       # Interfaz web del chat de Historia del Perú
│   └── index.html            # Interfaz web para el lector OCR
├── .env.example              # Plantilla de variables de entorno (sin credenciales)
├── .gitignore                # Exclusión de node_modules y credenciales .env
├── chat-biblioteca.js        # Chatbot con Function Calling para préstamos
├── chat-interactivo.js       # Chatbot de cobranzas y pagos con validación de DNI
├── chat-texto.js             # Chatbot de Historia del Perú por consola
├── chatgt-analisis.js        # Análisis de facturas mediante visión por computadora
├── chatgtp.js                # Cliente base con streaming de OpenAI Responses API
├── factura.png               # Imagen de prueba para análisis multimodal
├── ocr.js                    # Integración con Azure Document Intelligence
├── package.json              # Metadatos del proyecto y dependencias
└── server.js                 # Servidor Express y endpoints API
```

---

## Requisitos Previos

* **Node.js** (versión 20.x o superior recomendada).
* Cuenta de **Microsoft Azure** con recursos aprovisionados para:
  * Azure OpenAI Service (con un despliegue de modelo, ej: `gpt-5.4-mini`).
  * Azure Document Intelligence (Read API).

---

## Instalación y Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Pineda-25/Foundry-chatbot.git
   cd Foundry-chatbot
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**  
   Copia el archivo `.env.example` como `.env` y completa tus credenciales de Azure:
   ```bash
   cp .env.example .env
   ```

   Edita el archivo `.env` con tus valores:
   ```env
   PORT=3000
   MAX_FILE_MB=4

   # Azure Document Intelligence
   DI_ENDPOINT=https://tu-servicio.cognitiveservices.azure.com/
   DI_KEY=tu_azure_di_key
   DI_API_VERSION=2024-11-30
   DI_MODEL=prebuilt-read

   # Azure OpenAI
   OPENAI_BASE_URL=https://tu-recurso.services.ai.azure.com/openai/v1
   OPENAI_API_KEY=tu_azure_openai_key
   OPENAI_MODEL=gpt-5.4-mini
   ```

---

## Ejecución de los Módulos

### Servidor Web y Chat en Navegador
Inicia el servidor Express:
```bash
npm start
# O en modo desarrollo con recarga automática:
npm run dev
```
* **Chatbot de Historia del Perú:** Accede a `http://localhost:3000/index-chat.html`
* **Lector de PDF (OCR):** Accede a `http://localhost:3000/index.html`

### Chatbot de Cobranzas por Terminal
```bash
node chat-interactivo.js
```

### Análisis de Factura (Visión / Multimodal)
```bash
node chatgt-analisis.js
```

### Chatbot de Biblioteca
```bash
node chat-biblioteca.js
```

---

## Licencia

Distribuido bajo licencia **ISC**.
