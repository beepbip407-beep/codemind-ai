import { NextRequest, NextResponse } from "next/server";
import { getAiConfig, isAiConfigured } from "@/lib/config";
import { rateLimit } from "@/lib/rate-limit";
import { listModels } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/models
 * Devuelve los modelos disponibles del proveedor. Nunca expone la API key.
 */
export async function GET(req: NextRequest) {
  const { rateLimit: maxPerMinute, providerName } = getAiConfig();

  if (!rateLimit(req, maxPerMinute * 2)) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera unos momentos." },
      { status: 429 }
    );
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      {
        error:
          "No hay proveedor de IA configurado. Define AI_API_KEY y AI_BASE_URL en .env.local y reinicia el servidor.",
      },
      { status: 503 }
    );
  }

  try {
    const models = await listModels();
    return NextResponse.json({
      provider: providerName,
      default: getAiConfig().model,
      models,
    });
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 500;
    const message = (err as Error).message;
    return NextResponse.json(
      { error: message },
      { status: status >= 400 && status < 600 ? status : 500 }
    );
  }
}
