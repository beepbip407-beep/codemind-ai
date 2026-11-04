import { NextRequest, NextResponse } from "next/server";
import { chatRequestSchema } from "@/lib/chat-schema";
import { getAiConfig, isAiConfigured } from "@/lib/config";
import { rateLimit } from "@/lib/rate-limit";
import { SYSTEM_PROMPT } from "@/lib/tool-prompts";
import { chatStream } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/chat
 * Proxy seguro hacia el proveedor de IA. La API key vive solo en el servidor.
 * El cliente envía el historial validado; aquí se añade el prompt de sistema
 * y se transmite la respuesta delta a delta.
 */
export async function POST(req: NextRequest) {
  const { rateLimit: maxPerMinute, hideProvider } = getAiConfig();

  if (!rateLimit(req, maxPerMinute)) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera unos segundos e inténtalo de nuevo." },
      { status: 429 }
    );
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      {
        error:
          "El proveedor de IA no está configurado. Copia .env.example a .env.local, define AI_API_KEY y AI_BASE_URL, y reinicia el servidor.",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición no válido." }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Los datos enviados no son válidos.";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { messages, model } = parsed.data;

  // En modo marca blanca, el modelo solo puede llegar como token cifrado
  // (o "auto" = por defecto). Nombres literales se redirigen al modelo por defecto.
  let effectiveModel = model || getAiConfig().model;
  if (hideProvider) {
    if (model && model !== "auto") {
      const { unmaskModel } = await import("@/lib/identify");
      effectiveModel = unmaskModel(model) ?? getAiConfig().model;
    } else {
      effectiveModel = getAiConfig().model;
    }
  }

  try {
    return await chatStream(
      [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      effectiveModel
    );
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500;
    const message = (err as Error).message;
    if (message === "AI_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          error:
            "El proveedor de IA no está configurado. Define AI_API_KEY en .env.local y reinicia el servidor.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: message },
      { status: status >= 400 && status < 600 ? status : 500 }
    );
  }
}
