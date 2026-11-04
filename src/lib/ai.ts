import type { ChatMessage } from "@/lib/types";

/** Detecta si el proveedor es la API nativa de Gemini (protocolo distinto a OpenAI). */
function isGemini(baseUrl: string): boolean {
  return baseUrl.includes("generativelanguage.googleapis.com");
}

/** Base nativa de Gemini: quitamos el sufijo /openai si el usuario lo pegó. */
function geminiBase(baseUrl: string): string {
  return baseUrl.replace(/\/openai\/?$/, "");
}

/** Traduce errores HTTP del proveedor a mensajes comprensibles en español. */
export async function readUpstreamError(res: Response): Promise<string> {
  let detail = "";
  try {
    const json = await res.clone().json();
    detail =
      json?.error?.message ||
      json?.message ||
      json?.error ||
      (typeof json === "string" ? json : "");
  } catch {
    try {
      detail = await res.text();
    } catch {
      /* sin detalle */
    }
  }
  if (typeof detail !== "string") detail = JSON.stringify(detail ?? "");
  detail = detail.slice(0, 400);

  switch (res.status) {
    case 401:
    case 403:
      return "La clave de API no es válida o no tiene permisos. Revisa AI_API_KEY en tu archivo .env.local y reinicia el servidor.";
    case 404:
      return `El modelo solicitado no existe en el proveedor (${res.status}). Revisa el nombre del modelo en el panel de configuración.`;
    case 429:
      return "Se alcanzó el límite de solicitudes del proveedor (429). Espera un momento y vuelve a intentarlo, o revisa tu cuota en el panel del proveedor.";
    case 500:
    case 502:
    case 503:
      if (/high demand|overloaded|unavailable/i.test(detail)) {
        return "El modelo está saturado ahora mismo (alta demanda). Espera unos segundos e inténtalo de nuevo, o elige otro modelo en el panel de configuración.";
      }
      return `El proveedor de IA tiene un problema temporal (${res.status}). Inténtalo de nuevo en unos segundos.`;
    default:
      return `Error del proveedor de IA (${res.status}). ${detail || ""}`.trim();
  }
}

/** Convierte el stream SSE de OpenAI (chat/completions) en texto plano. */
function sseToTextOpenAi(upstream: Response): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const delta = json?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length > 0) {
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              /* línea parcial o artefacto del proveedor: se ignora */
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

/** Convierte el stream SSE nativo de Gemini (streamGenerateContent) en texto plano. */
function sseToTextGemini(upstream: Response): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const parts = json?.candidates?.[0]?.content?.parts ?? [];
              for (const part of parts) {
                if (typeof part?.text === "string" && part.text.length > 0) {
                  controller.enqueue(encoder.encode(part.text));
                }
              }
            } catch {
              /* línea parcial: se ignora */
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

/** Respuesta texto-plano con los deltas en orden. */
function textResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** Error tipado para respuestas no OK del proveedor. */
async function upstreamError(res: Response): Promise<Error> {
  if (res.body) res.body.cancel();
  const msg = await readUpstreamError(res);
  return Object.assign(new Error(msg), { status: res.status });
}

/**
 * Llama al proveedor de IA y devuelve un stream de texto plano (deltas).
 * Soporta dos protocolos:
 *  - Gemini nativo (generativelanguage.googleapis.com): streamGenerateContent + x-goog-api-key
 *    (necesario para las claves nuevas que empiezan por "AQ.")
 *  - Resto (OpenAI compatible): chat/completions + Authorization Bearer
 */
export async function chatStream(
  messages: ChatMessage[],
  model: string
): Promise<Response> {
  const { getAiConfig } = await import("@/lib/config");
  const { baseUrl, apiKey } = getAiConfig();

  if (!apiKey) {
    throw Object.assign(new Error("AI_NOT_CONFIGURED"), { status: 503 });
  }

  let upstream: Response;

  if (isGemini(baseUrl)) {
    const base = geminiBase(baseUrl);
    const systemParts = messages.filter((m) => m.role === "system");
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    upstream = await fetch(
      `${base}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          ...(systemParts.length > 0
            ? {
                systemInstruction: {
                  parts: [{ text: systemParts.map((m) => m.content).join("\n") }],
                },
              }
            : {}),
          contents,
          generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
        }),
      }
    );
  } else {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.4,
        max_tokens: 4096,
      }),
    });
  }

  if (!upstream.ok) throw await upstreamError(upstream);

  return textResponse(
    isGemini(baseUrl) ? sseToTextGemini(upstream) : sseToTextOpenAi(upstream)
  );
}

/** Lista los modelos disponibles en el proveedor (para el panel de configuración). */
export async function listModels(): Promise<string[]> {
  const { getAiConfig } = await import("@/lib/config");
  const { baseUrl, apiKey } = getAiConfig();

  if (!apiKey) {
    throw Object.assign(new Error("AI_NOT_CONFIGURED"), { status: 503 });
  }

  const gemini = isGemini(baseUrl);
  const base = gemini ? geminiBase(baseUrl) : baseUrl;

  const res = await fetch(`${base}/models`, {
    headers: gemini ? { "x-goog-api-key": apiKey } : { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) throw await upstreamError(res);

  const json = await res.json();

  if (gemini) {
    // Formato nativo: { models: [{ name: "models/gemini-…", supportedGenerationMethods: [...] }] }
    const models: Array<{
      name?: string;
      supportedGenerationMethods?: string[];
    }> = json?.models ?? [];
    const unsuitable = /embedding|tts|imagen|veo|aqa|omni|audio/;
    return models
      .filter(
        (m) =>
          m.name &&
          (m.supportedGenerationMethods?.includes("generateContent") ?? true) &&
          !unsuitable.test(m.name)
      )
      .map((m) => m.name!.replace(/^models\//, ""))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 200);
  }

  // Formato OpenAI: { data: [{ id: "…" }] }
  const data: Array<{ id?: string }> = json?.data ?? json?.models ?? [];
  return data
    .map((m) => m.id)
    .filter((id): id is string => Boolean(id))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 200);
}
