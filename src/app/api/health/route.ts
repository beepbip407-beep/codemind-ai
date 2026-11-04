import { NextResponse } from "next/server";
import { getAiConfig, isAiConfigured } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Estado del servidor y del proveedor de IA. No expone claves.
 */
export async function GET() {
  const { providerName, model, providerBrand, hideProvider } = getAiConfig();
  return NextResponse.json({
    ok: true,
    aiConfigured: isAiConfigured(),
    providerName: hideProvider ? providerBrand : providerName,
    defaultModel: hideProvider ? "auto" : model,
  });
}
