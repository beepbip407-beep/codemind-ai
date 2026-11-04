"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BrainCircuit,
  Copy,
  Eraser,
  Menu,
  MessageSquare,
  PanelRight,
  Send,
  Square,
  TriangleAlert,
  X,
} from "lucide-react";
import Sidebar from "./Sidebar";
import ChatBubble from "./ChatBubble";
import ToolBar from "./ToolBar";
import CodeEditor from "./CodeEditor";
import SettingsModal from "./SettingsModal";
import { AI_TOOLS, buildToolMessage } from "@/lib/tool-prompts";
import { DEFAULT_LANGUAGE, LANGUAGES, findLanguage } from "@/lib/languages";
import {
  loadConversations,
  loadCurrentId,
  saveCurrentId,
  saveConversations,
  titleFromMessage,
} from "@/lib/storage";
import type { ChatMessage, Conversation } from "@/lib/types";

const MODEL_KEY = "codemind.model";
const MAX_CONTEXT_MESSAGES = 30;

function newConversation(): Conversation {
  return {
    id: crypto.randomUUID(),
    title: "Nueva conversación",
    createdAt: Date.now(),
    messages: [],
  };
}

export default function Workspace() {
  // ---------- Conversaciones ----------
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // ---------- Chat en curso ----------
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ---------- Editor ----------
  const [code, setCode] = useState(
    "// CodeMind AI · escribe o pega tu código aquí\n// Selecciona algo y usa las herramientas de IA sobre la selección\n"
  );
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE.monaco);
  const editorRef = useRef<import("monaco-editor").editor.IStandaloneCodeEditor | null>(null);

  // ---------- UI ----------
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [model, setModel] = useState("");
  const [providerName, setProviderName] = useState("Proveedor de IA");
  const [aiConfigured, setAiConfigured] = useState(true);
  const [mobileTab, setMobileTab] = useState<"chat" | "editor">("chat");

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );
  const messages = active?.messages ?? [];

  // ---------- Persistencia ----------
  useEffect(() => {
    const convs = loadConversations();
    const current = loadCurrentId();
    setConversations(convs);
    setActiveId(current && convs.some((c) => c.id === current) ? current : convs[0]?.id ?? null);
    setHydrated(true);

    const storedModel = localStorage.getItem(MODEL_KEY);
    if (storedModel) setModel(storedModel);

    // Estado del proveedor (sin exponer nada sensible)
    fetch("/api/health")
      .then((r) => r.json())
      .then((j) => {
        setAiConfigured(Boolean(j?.aiConfigured));
        if (j?.providerName) setProviderName(j.providerName);
        if (j?.defaultModel && !storedModel) setModel(j.defaultModel);
      })
      .catch(() => setAiConfigured(false));
  }, []);

  useEffect(() => {
    if (hydrated) saveConversations(conversations);
  }, [conversations, hydrated]);

  useEffect(() => {
    if (hydrated) saveCurrentId(activeId);
  }, [activeId, hydrated]);

  // ---------- Gestión de conversaciones ----------
  function createConversation(): string {
    const conv = newConversation();
    setConversations((prev) => [...prev, conv]);
    setActiveId(conv.id);
    setSidebarOpen(false);
    setError(null);
    return conv.id;
  }

  function deleteConversation(id: string) {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (id === activeId) setActiveId(next[0]?.id ?? null);
      return next;
    });
  }

  function renameConversation(id: string, title: string) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }

  function updateActiveMessages(updater: (prev: ChatMessage[]) => ChatMessage[]) {
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, messages: updater(c.messages) } : c))
    );
  }

  // ---------- Envío a la IA (streaming real) ----------
  const send = useCallback(
    async (userText: string) => {
      const text = userText.trim();
      if (!text || streaming) return;

      const convId = activeId ?? createConversation();
      const history =
        conversations
          .find((c) => c.id === convId)
          ?.messages.slice(-MAX_CONTEXT_MESSAGES) ?? [];

      const userMessage: ChatMessage = { role: "user", content: text };
      const assistantIdPlaceholder = { role: "assistant" as const, content: "" };

      // Título automático si la conversación es nueva
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId && c.messages.length === 0
            ? { ...c, title: titleFromMessage(text) }
            : c
        )
      );

      setInput("");
      setError(null);
      setStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      // Actualiza el último mensaje del asistente delta a delta
      const patch = (fn: (content: string) => string) =>
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c;
            const msgs = [...c.messages];
            const last = msgs[msgs.length - 1];
            if (last?.role === "assistant") {
              msgs[msgs.length - 1] = { role: "assistant", content: fn(last.content) };
            }
            return { ...c, messages: msgs };
          })
        );

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...history, userMessage],
            model: model || undefined,
          }),
          signal: controller.signal,
        });

        // Inserta el par de mensajes (el marcador del asistente se rellena en streaming)
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? { ...c, messages: [...c.messages, userMessage, assistantIdPlaceholder] }
              : c
          )
        );

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error ?? `Error ${res.status} al contactar la IA.`);
        }
        if (!res.body) throw new Error("Respuesta sin contenido del servidor.");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          patch(() => acc);
        }
        patch((prev) => (prev.trim().length === 0 ? prev : prev));
      } catch (err) {        if ((err as Error).name === "AbortError") {
          // Cancelado por el usuario: conservamos lo generado hasta ahora
          patch((prev) => prev + "\n\n_(generación detenida)_");
        } else {
          const msg = (err as Error).message || "Error inesperado.";
          setError(msg);
          // Elimina el marcador vacío del asistente
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== convId) return c;
              const msgs = [...c.messages];
              if (msgs[msgs.length - 1]?.role === "assistant" && msgs[msgs.length - 1].content === "") {
                msgs.pop();
              }
              return { ...c, messages: msgs };
            })
          );
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [activeId, streaming, conversations, model]
  );

  // ---------- Herramientas de IA ----------
  const selectedCode = useCallback((): string | null => {
    const ed = editorRef.current;
    if (!ed) return null;
    const sel = ed.getSelection();
    const modelCheck = ed.getModel();
    if (sel && modelCheck && !sel.isEmpty()) {
      return modelCheck.getValueInRange(sel);
    }
    return null;
  }, []);

  function runTool(toolId: string) {
    const tool = AI_TOOLS[toolId];
    if (!tool) return;

    if (tool.needsCode) {
      const selection = selectedCode();
      const source = selection ?? code;
      if (!source.trim()) {
        setError("La herramienta «" + toolId + "» necesita código: escribe algo en el editor primero.");
        return;
      }
      const message = buildToolMessage(toolId, source, findLanguage(language), "");
      if (message) void send(message);
    } else {
      // "Generar código": usa el texto del cuadro del chat como descripción
      if (!input.trim()) {
        setError(
          "Escribe primero una descripción de lo que quieres construir (por ejemplo: «un juego de snake en Python»)."
        );
        return;
      }
      void send(input);
    }
  }

  function warnEmptyEditor(toolId: string) {
    if (!code.trim() && !selectedCode()?.trim()) {
      setError("La herramienta necesita código: escribe algo en el editor primero.");
    } else {
      runTool(toolId);
    }
  }

  // Acciones del editor
  function copyEditorCode() {
    void navigator.clipboard.writeText(code);
  }
  function downloadEditorCode() {
    const lang = findLanguage(language);
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codemind.${lang.ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function clearEditor() {
    setCode("");
    editorRef.current?.focus();
  }
  function loadIntoEditor(codeText: string, codeLanguage: string) {
    const lang = findLanguage(codeLanguage);
    setLanguage(lang.monaco);
    setCode(codeText);
    setMobileTab("editor");
  }

  const editorHeaderLang = findLanguage(language);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <BrainCircuit className="h-5 w-5 animate-pulse-soft text-indigo-400" /> Cargando CodeMind…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          setSidebarOpen(false);
        }}
        onNew={createConversation}
        onDelete={deleteConversation}
        onRename={renameConversation}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        model={model}
        providerName={providerName}
        aiConfigured={aiConfigured}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior */}
        <header className="flex items-center justify-between gap-3 border-b border-ink-700/60 bg-ink-900/60 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-ink-800 hover:text-slate-200 md:hidden"
              aria-label="Abrir historial"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="truncate text-sm font-semibold text-slate-200">
              {active?.title ?? "Nueva conversación"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Selector de pestañas en móvil */}
            <div className="flex rounded-lg border border-ink-700 p-0.5 md:hidden">
              <button
                onClick={() => setMobileTab("chat")}
                className={`rounded-md px-2.5 py-1 text-xs flex items-center gap-1 ${
                  mobileTab === "chat" ? "bg-indigo-600/30 text-indigo-200" : "text-slate-400"
                }`}
              >
                <MessageSquare className="h-3 w-3" />
              </button>
              <button
                onClick={() => setMobileTab("editor")}
                className={`rounded-md px-2.5 py-1 text-xs flex items-center gap-1 ${
                  mobileTab === "editor" ? "bg-indigo-600/30 text-indigo-200" : "text-slate-400"
                }`}
              >
                <PanelRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="animate-slide-up mx-4 mt-3 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-200">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p className="flex-1 leading-relaxed">{error}</p>
            <button onClick={() => setError(null)} aria-label="Descartar error">
              <X className="h-3.5 w-3.5 hover:text-rose-100" />
            </button>
          </div>
        )}

        {/* Área principal: chat (izquierda) + editor (derecha) */}
        <div className="flex min-h-0 flex-1 gap-4 p-4">
          {/* Panel de chat */}
          <section
            className={`flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-ink-700/70 bg-ink-900/50 backdrop-blur ${
              mobileTab === "chat" ? "flex" : "hidden"
            } md:flex`}
          >
            <div className="flex items-center justify-between border-b border-ink-700/60 px-4 py-2.5">
              <span className="text-xs font-medium uppercase tracking-widest text-slate-500">
                Chat de programación
              </span>
              <span className="text-[10px] text-slate-500">
                {messages.length} {messages.length === 1 ? "mensaje" : "mensajes"} · contexto mantenido
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-700 shadow-lg shadow-indigo-950/50">
                    <BrainCircuit className="h-6 w-6 text-white" />
                  </div>
                  <p className="max-w-sm text-sm text-slate-400">
                    Pide cualquier cosa: <span className="text-slate-300">«genera una API REST en Python»</span>,{" "}
                    <span className="text-slate-300">«corrige este script»</span> o usa las herramientas de abajo.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {messages.map((m, i) => (
                    <ChatBubble
                      key={i}
                      message={m}
                      streaming={streaming && i === messages.length - 1 && m.role === "assistant"}
                      onSendToEditor={loadIntoEditor}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Herramientas de IA */}
            <div className="border-t border-ink-700/60 px-4 py-3">
              <ToolBar
                onRunTool={runTool}
                busy={streaming}
                warnEmptyEditor={warnEmptyEditor}
              />
            </div>

            {/* Entrada de chat */}
            <form
              className="flex items-end gap-2 border-t border-ink-700/60 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                rows={2}
                placeholder="Describe qué quieres hacer… (El código del editor se enviará con las herramientas)"
                className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-ink-700 bg-ink-950/80 px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              {streaming ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-500/50 bg-rose-600/20 text-rose-200 transition hover:bg-rose-600/40"
                  title="Detener generación"
                >
                  <Square className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-950/50 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Enviar (Enter)"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </form>
          </section>

          {/* Panel del editor */}
          <section
            className={`flex min-h-0 w-[46%] min-w-0 flex-col rounded-2xl border border-ink-700/70 bg-ink-900/50 backdrop-blur ${
              mobileTab === "editor" ? "flex" : "hidden"
            } md:flex`}
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-ink-700/60 px-3 py-2">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="rounded-lg border border-ink-700 bg-ink-850 px-2 py-1.5 text-xs text-slate-200 focus:border-indigo-500/60 focus:outline-none"
                aria-label="Lenguaje del editor"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.monaco} value={l.monaco}>
                    {l.label}
                  </option>
                ))}
              </select>
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={copyEditorCode}
                  disabled={!code}
                  title="Copiar todo el código"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-ink-800 hover:text-indigo-300 disabled:opacity-30"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={downloadEditorCode}
                  disabled={!code}
                  title="Descargar código"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-ink-800 hover:text-indigo-300 disabled:opacity-30"
                >
                  <ArrowDownIcon />
                </button>
                <button
                  onClick={clearEditor}
                  disabled={!code}
                  title="Limpiar editor"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-ink-800 hover:text-rose-300 disabled:opacity-30"
                >
                  <Eraser className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-b-2xl">
              <CodeEditor code={code} language={language} onChange={setCode} onReady={(ed) => (editorRef.current = ed)} />
            </div>
            <div className="border-t border-ink-700/60 px-3 py-1.5 text-[10px] text-slate-500">
              {editorHeaderLang.label} · las herramientas de IA usan tu selección o todo el editor
            </div>
          </section>
        </div>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        providerName={providerName}
        currentModel={model}
        onSelectModel={(m) => {
          setModel(m);
          localStorage.setItem(MODEL_KEY, m);
        }}
        aiConfigured={aiConfigured}
      />
    </div>
  );
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M12 3v14" strokeLinecap="round" />
      <path d="m7 12 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21h14" strokeLinecap="round" />
    </svg>
  );
}
