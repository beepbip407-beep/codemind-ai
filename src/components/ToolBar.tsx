"use client";

import {
  BookOpen,
  Bug,
  FileText,
  FlaskConical,
  ListChecks,
  RefreshCcw,
  Wand2,
  Loader2,
} from "lucide-react";
import { AI_TOOLS } from "@/lib/tool-prompts";

const TOOL_META: Record<
  string,
  { label: string; icon: React.ReactNode; hint: string; color: string }
> = {
  generate: {
    label: "Generar código",
    icon: <Wand2 className="h-4 w-4" />,
    hint: "Crea código a partir de tu descripción",
    color: "hover:border-violet-500/60 hover:bg-violet-600/15 hover:text-violet-200",
  },
  explain: {
    label: "Explicar",
    icon: <BookOpen className="h-4 w-4" />,
    hint: "Explicación paso a paso del editor",
    color: "hover:border-sky-500/60 hover:bg-sky-600/15 hover:text-sky-200",
  },
  fix: {
    label: "Corregir errores",
    icon: <Bug className="h-4 w-4" />,
    hint: "Detecta y corrige errores del código",
    color: "hover:border-rose-500/60 hover:bg-rose-600/15 hover:text-rose-200",
  },
  refactor: {
    label: "Refactorizar",
    icon: <RefreshCcw className="h-4 w-4" />,
    hint: "Mejora estructura y legibilidad",
    color: "hover:border-amber-500/60 hover:bg-amber-600/15 hover:text-amber-200",
  },
  document: {
    label: "Documentar",
    icon: <FileText className="h-4 w-4" />,
    hint: "Genera documentación del código",
    color: "hover:border-emerald-500/60 hover:bg-emerald-600/15 hover:text-emerald-200",
  },
  tests: {
    label: "Crear pruebas",
    icon: <FlaskConical className="h-4 w-4" />,
    hint: "Pruebas automatizadas del código",
    color: "hover:border-fuchsia-500/60 hover:bg-fuchsia-600/15 hover:text-fuchsia-200",
  },
  convert: {
    label: "Convertir lenguaje",
    icon: <ListChecks className="h-4 w-4" />,
    hint: "Traduce el código a otro lenguaje",
    color: "hover:border-cyan-500/60 hover:bg-cyan-600/15 hover:text-cyan-200",
  },
};

interface ToolBarProps {
  onRunTool: (toolId: string) => void;
  busy: boolean;
  /** true cuando el editor está vacío y la herramienta lo requiere */
  warnEmptyEditor: (toolId: string) => void;
}

export default function ToolBar({ onRunTool, busy, warnEmptyEditor }: ToolBarProps) {
  const entries = Object.keys(AI_TOOLS);

  function handleClick(id: string) {
    if (AI_TOOLS[id]?.needsCode) {
      warnEmptyEditor(id);
      return;
    }
    onRunTool(id);
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="tool-bar">
      {entries.map((id) => {
        const meta = TOOL_META[id];
        return (
          <button
            key={id}
            disabled={busy}
            onClick={() => handleClick(id)}
            title={meta.hint}
            className={`flex items-center gap-2 rounded-xl border border-ink-700/80 bg-ink-850/80 px-3 py-2.5 text-xs font-medium text-slate-300 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-40 ${meta.color}`}
          >
            {meta.icon}
            {meta.label}
          </button>
        );
      })}
      {busy && (
        <span className="col-span-full flex items-center justify-center gap-2 text-xs text-indigo-300/80">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> La IA está trabajando…
        </span>
      )}
    </div>
  );
}
