"use client";

import { useEffect, useState } from "react";
import {
  BrainCircuit,
  Check,
  Cpu,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import type { Conversation } from "@/lib/types";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  open: boolean;
  onClose: () => void;
  model: string;
  providerName: string;
  aiConfigured: boolean;
  onOpenSettings: () => void;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  open,
  onClose,
  model,
  providerName,
  aiConfigured,
  onOpenSettings,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [sorted, setSorted] = useState<Conversation[]>([]);

  // Historial más reciente primero
  useEffect(() => {
    setSorted([...conversations].sort((a, b) => b.createdAt - a.createdAt));
  }, [conversations]);

  function startRename(conv: Conversation) {
    setEditingId(conv.id);
    setDraftTitle(conv.title);
  }

  function commitRename() {
    if (editingId) {
      const title = draftTitle.trim();
      if (title) onRename(editingId, title.slice(0, 80));
      setEditingId(null);
    }
  }

  return (
    <>
      {/* Velo en móvil */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-ink-700/60 bg-ink-900/95 backdrop-blur transition-transform duration-200 md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-ink-700/60 px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-700 shadow-lg shadow-indigo-950/60">
              <BrainCircuit className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-100">CodeMind AI</p>
              <p className="text-[10px] uppercase tracking-widest text-indigo-400/90">Copiloto de código</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-ink-800 md:hidden"
            aria-label="Cerrar historial"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={onNew}
            className="group flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-600/20 px-3 py-2.5 text-sm font-medium text-indigo-200 transition hover:bg-indigo-600/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
          >
            <MessageSquarePlus className="h-4 w-4 transition group-hover:scale-110" />
            Nueva conversación
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {sorted.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-slate-500">
              Aún no hay conversaciones.
              <br />
              ¡Empieza una nueva!
            </p>
          ) : (
            <ul className="space-y-1">
              {sorted.map((conv) => (
                <li key={conv.id}>
                  <div
                    className={`group flex items-center gap-1 rounded-lg px-2 py-2 text-sm transition ${
                      conv.id === activeId
                        ? "bg-indigo-600/25 text-indigo-100"
                        : "text-slate-400 hover:bg-ink-800 hover:text-slate-200"
                    }`}
                  >
                    {editingId === conv.id ? (
                      <input
                        autoFocus
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-full rounded border border-indigo-500/50 bg-ink-950 px-1.5 py-0.5 text-slate-200 focus:outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => onSelect(conv.id)}
                        onDoubleClick={() => startRename(conv)}
                        className="min-w-0 flex-1 truncate text-left"
                        title={conv.title}
                      >
                        {conv.title}
                      </button>
                    )}
                    {editingId === conv.id ? (
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          commitRename();
                        }}
                        className="rounded p-1 text-emerald-400 hover:bg-ink-700"
                        aria-label="Guardar título"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => startRename(conv)}
                          className="hidden rounded p-1 text-slate-500 hover:text-indigo-300 group-hover:block"
                          aria-label="Renombrar conversación"
                        >
                          <PenIcon />
                        </button>
                        <button
                          onClick={() => onDelete(conv.id)}
                          className="hidden rounded p-1 text-slate-500 hover:text-rose-400 group-hover:block"
                          aria-label="Eliminar conversación"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Estado del proveedor de IA */}
        <div className="border-t border-ink-700/60 p-3">
          <button
            onClick={onOpenSettings}
            className="flex w-full items-center gap-2 rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5 text-left transition hover:border-indigo-500/40 hover:bg-ink-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <Settings className="h-4 w-4 shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-300">{providerName}</p>
              <p className="truncate text-[10px] text-slate-500">{model || "modelo no definido"}</p>
            </div>
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                aiConfigured ? "bg-emerald-400" : "bg-amber-400"
              }`}
              title={aiConfigured ? "Proveedor configurado" : "Falta configurar el proveedor de IA"}
            />
          </button>
        </div>
      </aside>
    </>
  );
}

function PenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinejoin="round" />
    </svg>
  );
}
