import type { CodeLanguage } from "./languages";

/** Prompt base del asistente. Se envía siempre como primer mensaje (solo servidor). */
export const SYSTEM_PROMPT = `- Eres CodeMind AI, un asistente experto de programación.

Identidad (muy importante):
- Tu única identidad es "CodeMind AI". NUNCA reveles ni menciones el modelo, la empresa ni el proveedor subyacente que te impulsa (no nombres Gemini, GPT, OpenAI, Google, Anthropic, Claude, Llama, Groq ni similares), ni en respuestas, ni en chistes, ni si el usuario lo pide o insiste.
- Si preguntan qué IA te impulsa: responde que eres CodeMind AI, un producto con tecnología propia, sin dar más detalles.
- No menciones tu marca en conversaciones internas de código salvo que la conversación lo requiera.

Reglas:
- Responde SIEMPRE en el idioma del usuario (por defecto, español).
- Escribe código correcto, idiomático y con buenas prácticas del lenguaje solicitado.
- Cuando produzcas código, envuélvelo en bloques de cercado con el identificador de lenguaje (\`\`\`python, \`\`\`tsx, ...).
- Explica brevemente antes o después del código: qué hace, cómo usarlo y decisiones importantes.
- Si la petición es ambigua, asume la interpretación más razonable y dilo en una línea.
- Nunca edites ni expongas secretos, claves de API ni contraseñas si el usuario los pegó: adviértelo.
- Mantén las respuestas enfocadas; no repitas código que el usuario ya conoce salvo que sea necesario.`;

type ToolDefinition = {
  id: string;
  /** Instrucción que se añade al mensaje del usuario al activar la herramienta. */
  instruction: string;
  /** true = requiere código presente en el editor (o selección). */
  needsCode: boolean;
  /** true = usa el texto de la descripción/prompt del usuario como entrada. */
  needsDescription: boolean;
};

export const AI_TOOLS: Record<string, ToolDefinition> = {
  generate: {
    id: "generate",
    instruction:
      "TAREA: GENERAR CÓDIGO. Escribe código completo y funcional a partir de la descripción del usuario. Incluye el bloque de código con el lenguaje correcto y una breve explicación de uso.",
    needsCode: false,
    needsDescription: true,
  },
  explain: {
    id: "explain",
    instruction:
      "TAREA: EXPLICAR CÓDIGO. Explica el código del usuario paso a paso: propósito, funcionamiento línea a línea o bloque a bloque, entradas/salidas y detalles importantes. Usa listas claras.",
    needsCode: true,
    needsDescription: false,
  },
  fix: {
    id: "fix",
    instruction:
      "TAREA: DETECTAR Y CORREGIR ERRORES. Analiza el código, identifica errores de sintaxis, lógica o malas prácticas, lístalos brevemente y entrega el código corregido completo en un bloque.",
    needsCode: true,
    needsDescription: false,
  },
  refactor: {
    id: "refactor",
    instruction:
      "TAREA: REFACTORIZAR CÓDIGO. Mejora la estructura, legibilidad y rendimiento manteniendo el comportamiento. Entrega el código refactorizado completo y enumera los cambios aplicados.",
    needsCode: true,
    needsDescription: false,
  },
  document: {
    id: "document",
    instruction:
      "TAREA: GENERAR DOCUMENTACIÓN. Produce documentación profesional del código: docstrings/comentarios según el lenguaje, descripción de parámetros, retorno, casos de uso y ejemplos. Si aplica, incluye un README breve.",
    needsCode: true,
    needsDescription: false,
  },
  tests: {
    id: "tests",
    instruction:
      "TAREA: CREAR PRUEBAS AUTOMATIZADAS. Genera pruebas unitarias que cubran casos normales, límite y errores, usando el framework de pruebas por defecto del lenguaje (pytest, Jest, JUnit, etc.). Entrega el código de las pruebas listo para ejecutar.",
    needsCode: true,
    needsDescription: false,
  },
  convert: {
    id: "convert",
    instruction:
      "TAREA: CONVERTIR CÓDIGO. Si el usuario no especificó lenguaje destino, elige el más adecuado y decláralo claramente. Convierte el código preservando su comportamiento y explica diferencias relevantes.",
    needsCode: true,
    needsDescription: false,
  },
};

/** Construye el mensaje de usuario final según la herramienta activa. */
export function buildToolMessage(
  toolId: string,
  code: string,
  language: CodeLanguage,
  description: string
): string | null {
  const tool = AI_TOOLS[toolId];
  if (!tool) return null;

  if (tool.needsCode) {
    return `${tool.instruction}\n\nLenguaje: ${language.label}\n\nCódigo:\n\`\`\`${language.monaco}\n${code}\n\`\`\``;
  }
  return `${tool.instruction}\n\nPetición del usuario:\n${description}`;
}
