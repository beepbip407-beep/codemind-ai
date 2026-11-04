import { NextRequest, NextResponse } from "next/server";
import { getAiConfig, isAiConfigured } from "@/lib/config";
import { rateLimit } from "@/lib/rate-limit";
import { listModels } from "@/lib/ai";
import { maskModel } from "@/lib/identify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/models
 * Devuelve los modelos disponibles del proveedor. Nunca expone la API key.
 * En modo marca blanca (HIDE_PROVIDER=true) devuelve etiquetas genéricas
 * ("Motor 1"…) con tokens cifrados como value; el modelo real no viaja al cliente.
 */
export async function GET(req: NextRequest) {
  const { rateLimit: maxPerMinute, providerName, providerBrand, model: defaultModel, hideProvider } =
    getAiConfig();

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
    const visibleName = hideProvider ? providerBrand : providerName;

    if (hideProvider) {
      // Etiquetas genéricas; el identificador real viaja cifrado en `value`
      const maskedModels = models.map((real, i) => ({
        label: `Motor ${i + 1}`,
        value: maskModel(real),
      }));
      return NextResponse.json({
        provider: visibleName,
        default: "auto",
        masked: true,
        models: [{ label: "Motor recomendado", value: "auto" }, ...maskedModels],
      });
    }

    return NextResponse.json({
      provider: visibleName,
      default: defaultModel,
      masked: false,
      models: models.map((m) => ({ label: m, value: m })),
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
