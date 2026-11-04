import "server-only";

/**
 * Configuración del proveedor de IA, leída ÚNICAMENTE en el servidor.
 * Nunca se expone la API key al cliente.
 */
export function getAiConfig() {
  const baseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const apiKey = process.env.AI_API_KEY ?? "";
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  const providerName = process.env.AI_PROVIDER_NAME || "el proveedor configurado";
  const rateLimit = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 20) || 20;

  return { baseUrl, apiKey, model, providerName, rateLimit };
}

/** Indica si el proveedor de IA está configurado correctamente. */
export function isAiConfigured(): boolean {
  const { apiKey, baseUrl } = getAiConfig();
  return Boolean(apiKey) && Boolean(baseUrl);
}
