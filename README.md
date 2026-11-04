# CodeMind AI

Plataforma web de asistente de programación con inteligencia artificial: **genera, explica, corrige, refactoriza, documenta y prueba código** mediante chat y un editor integrado.

![Stack](https://img.shields.io/badge/Next.js-15-black) ![TS](https://img.shields.io/badge/TypeScript-5-3178c6) ![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

## Características

| Función | Descripción |
| --- | --- |
| 💬 **Chat de programación** | Instrucciones en lenguaje natural con contexto de conversación, streaming de respuestas y bloques de código con resaltado de sintaxis, copiar, descargar y abrir en el editor. |
| ✍️ **Editor Monaco** | Editor integrado con selección de lenguaje (JS, TS, HTML, CSS, Python, Lua, C++, Java, Go, Rust, PHP, Ruby, SQL, Bash, JSON…), numeración de líneas, copiar, descargar y limpiar. |
| 🛠️ **Herramientas de IA** | Generar desde descripción · Explicar paso a paso · Corregir errores · Refactorizar · Documentar · Crear pruebas · Convertir entre lenguajes. Las herramientas usan tu **selección** del editor si hay alguna, o todo el editor. |
| 🕑 **Historial** | Sidebar con conversaciones guardadas en el navegador (crear, seleccionar, renombrar, eliminar). |
| 🎨 **UX pulida** | Tema oscuro con acentos únicos de CodeMind, animaciones sutiles, estados de carga, diseño responsive (móvil / tablet / escritorio) y mensajes de error claros. |
| 🔒 **Seguridad** | API keys **solo en el servidor**, validación estricta de entradas (zod), límite de peticiones por IP, sin ejecución de código en el servidor y sin secretos en el frontend. |

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar el proveedor de IA
cp .env.example .env.local   # Windows PowerShell: Copy-Item .env.example .env.local
# edita .env.local con tus valores

# 3. Iniciar en desarrollo
npm run dev                  # http://localhost:3000

# Producción
npm run build && npm start
```

## Conectar el proveedor de IA

El backend habla el protocolo **OpenAI Chat Completions**, por lo que funciona con cualquier proveedor compatible. Edita `.env.local`:

| Variable | Descripción | Ejemplo |
| --- | --- | --- |
| `AI_BASE_URL` | Endpoint base compatible OpenAI | `https://api.openai.com/v1` |
| `AI_API_KEY` | Clave secreta (nunca se expone al navegador) | `sk-…` |
| `AI_MODEL` | Modelo por defecto | `gpt-4o-mini` |
| `AI_PROVIDER_NAME` | Nombre visible en la interfaz | `OpenAI` |
| `RATE_LIMIT_PER_MINUTE` | Peticiones máximas por minuto/IP | `20` |

### Ejemplos de proveedores

```bash
# OpenAI
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini

# Groq
AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=gsk_...
AI_MODEL=llama-3.3-70b-versatile

# OpenRouter
AI_BASE_URL=https://openrouter.ai/api/v1
AI_API_KEY=sk-or-...
AI_MODEL=openai/gpt-4o-mini

# DeepSeek
AI_BASE_URL=https://api.deepseek.com/v1
AI_API_KEY=sk-...
AI_MODEL=deepseek-chat

# Google Gemini (protocolo nativo; el backend lo detecta automáticamente)
# Las claves nuevas de AI Studio empiezan por "AQ." y usan x-goog-api-key
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_API_KEY=...                    # clave de https://aistudio.google.com/apikey
AI_MODEL=gemini-3.5-flash
AI_PROVIDER_NAME=Gemini

# Ollama local (sin clave)
AI_BASE_URL=http://localhost:11434/v1
AI_API_KEY=ollama
AI_MODEL=llama3.2
```

Tras reiniciar el servidor, el indicador del sidebar (punto verde) y el panel **Configuración de IA** listarán los modelos disponibles en vivo; elige uno y se usará en todas tus solicitudes.

> Si falta la clave, la app sigue funcionando y avisa con instrucciones concretas en lugar de fallar en silencio.

### Notas sobre Gemini

- Las claves nuevas de [Google AI Studio](https://aistudio.google.com/apikey) empiezan por **`AQ.`** (formato "Auth key"). CodeMind AI lo detecta y habla el **protocolo nativo de Gemini** (`streamGenerateContent` + `x-goog-api-key`) automáticamente; no hay que configurar nada extra.
- Si aparece «el modelo está saturado» (503 por alta demanda de Google), reintenta o elige otro modelo en el panel de configuración; los modelos Flash-Lite suelen estar menos cargados.

## Arquitectura

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts     # Proxy de streaming al proveedor (validación + rate limit)
│   │   ├── models/route.ts   # Lista de modelos del proveedor
│   │   └── health/route.ts   # Estado del servidor (sin secretos)
│   ├── layout.tsx · page.tsx · globals.css
├── components/
│   ├── Workspace.tsx         # Orquestador: chat + editor + herramientas
│   ├── Sidebar.tsx           # Historial de conversaciones
│   ├── ChatBubble.tsx        # Render de mensajes + markdown ligero
│   ├── CodeBlock.tsx         # Bloques de código (hljs, copiar/descargar/editar)
│   ├── ToolBar.tsx           # 7 herramientas de IA
│   ├── CodeEditor.tsx        # Monaco con tema propio
│   └── SettingsModal.tsx     # Selección de modelo en vivo
└── lib/
    ├── ai.ts                 # Cliente del proveedor + traducción de errores
    ├── chat-schema.ts        # Validación zod de entradas
    ├── config.ts             # Variables de entorno (solo servidor)
    ├── rate-limit.ts         # Token bucket por IP
    ├── tool-prompts.ts       # Prompts de sistema y de las herramientas
    ├── languages.ts          # Catálogo de lenguajes
    ├── storage.ts            # Historial en localStorage
    └── types.ts
```

## Seguridad implementada

- 🔑 La API key viaja **solo** de servidor a proveedor; el navegador no la ve jamás.
- ✅ Todas las entradas de `/api/chat` se validan con **zod** (roles permitidos, longitudes y número de mensajes limitados).
- ⛔ El `system prompt` se inyecta en el servidor; el cliente no puede sobrescribirlo.
- 🚦 Límite de solicitudes por IP (token bucket, configurable con `RATE_LIMIT_PER_MINUTE`).
- 🧱 El servidor nunca ejecuta código del usuario: el editor es solo del lado cliente.
- 📝 Errores traducidos a mensajes entendibles (clave inválida, cuota agotada, modelo inexistente…).

## Notas

- El historial de conversaciones se guarda en `localStorage` de tu navegador (no sale de tu equipo).
- Monaco Editor se carga por CDN en el cliente (lo habitual con `@monaco-editor/react`).
- Requiere Node.js 18.17+.
