import { z } from "zod";

/** Esquema del cuerpo de /api/chat — valida todo lo que entra al backend. */
export const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z
          .string()
          .min(1, "El mensaje no puede estar vacío")
          .max(8000, "El mensaje es demasiado largo (máx. 8000 caracteres)"),
      })
    )
    .min(1, "Necesitas al menos un mensaje")
    .max(40, "Demasiados mensajes en la conversación"),
  model: z.string().max(256).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

/** Esquema del cuerpo de /api/models */
export const modelsRequestSchema = z.object({
  model: z.string().max(256).optional(),
});
