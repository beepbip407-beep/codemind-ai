import crypto from "crypto";
import { getAiConfig } from "@/lib/config";

/**
 * Ofuscación de modelos (marca blanca):
 * Los identificadores reales nunca salen del servidor en modo marca blanca.
 * Se codifican cifrados con AES-256-GCM usando una clave derivada de la API key
 * (expo secret en memoria del servidor). Un jugador curioso solo verá tokens
 * opacos; el servidor los descifra al procesar la petición.
 */

function keyFor(): Buffer {
  const { apiKey } = getAiConfig();
  return crypto.createHash("sha256").update(`codemind::${apiKey}`).digest();
}

/** Codifica un identificador real de modelo en un token opaco. */
export function maskModel(realId: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyFor(), iv);
  const enc = Buffer.concat([cipher.update(realId, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

/** Descifra un token opaco; devuelve null si es inválido. */
export function unmaskModel(token: string): string | null {
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length < 29) return null; // 12 iv + 16 tag + mínimo payload
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", keyFor(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
