import type { Conversation } from "./types";

const KEY_CONVERSATIONS = "codemind.conversations.v1";
const KEY_CURRENT = "codemind.current.v1";

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(KEY_CONVERSATIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is Conversation =>
        c &&
        typeof c.id === "string" &&
        typeof c.title === "string" &&
        Array.isArray(c.messages)
    );
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]) {
  try {
    localStorage.setItem(KEY_CONVERSATIONS, JSON.stringify(conversations));
  } catch {
    /* cuota excedida: se ignora */
  }
}

export function loadCurrentId(): string | null {
  return localStorage.getItem(KEY_CURRENT);
}

export function saveCurrentId(id: string | null) {
  if (id) localStorage.setItem(KEY_CURRENT, id);
  else localStorage.removeItem(KEY_CURRENT);
}

/** Título automático a partir del primer mensaje del usuario. */
export function titleFromMessage(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 48 ? `${clean.slice(0, 45)}…` : clean || "Conversación";
}
