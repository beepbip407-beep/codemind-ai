import { NextRequest } from "next/server";

/**
 * Límite de peticiones en memoria (token bucket por IP).
 * Suficiente para una instancia; escala a Redis si despliegas varias instancias.
 */
const buckets = new Map<string, { tokens: number; last: number }>();

export function rateLimit(req: NextRequest, maxPerMinute: number): boolean {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "local";

  const now = Date.now();
  const bucket = buckets.get(ip) ?? { tokens: maxPerMinute, last: now };

  // Recarga 1 token por (60000 / max) ms
  const elapsedMs = now - bucket.last;
  const refill = (elapsedMs / 60000) * maxPerMinute;
  bucket.tokens = Math.min(maxPerMinute, bucket.tokens + refill);
  bucket.last = now;

  if (bucket.tokens < 1) {
    buckets.set(ip, bucket);
    return false;
  }
  bucket.tokens -= 1;
  buckets.set(ip, bucket);

  // Limpieza preventiva de buckets viejos (más de 10 min inactivos)
  if (buckets.size > 500) {
    for (const [key, b] of buckets) {
      if (now - b.last > 10 * 60_000) buckets.delete(key);
    }
  }
  return true;
}
