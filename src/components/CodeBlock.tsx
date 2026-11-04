"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  Check,
  Copy,
  PencilLine,
  Sparkles,
} from "lucide-react";
import hljs from "highlight.js/lib/common";
import { findLanguage } from "@/lib/languages";

interface CodeBlockProps {
  code: string;
  language: string; // Identificador del cercado, p. ej. "python"
  onSendToEditor?: (code: string, language: string) => void;
}

export default function CodeBlock({ code, language, onSendToEditor }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lang = useMemo(() => findLanguage(language), [language]);

  const highlighted = useMemo(() => {
    try {
      if (hljs.getLanguage(lang.monaco) || hljs.getLanguage(lang.id)) {
        return hljs.highlight(code, { language: hljs.getLanguage(lang.monaco) ? lang.monaco : lang.id }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch {
      return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  }, [code, lang]);

  const lineCount = useMemo(() => code.split("\n").length, [code]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* portapapeles no disponible */
    }
  }

  function download() {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codemind-snippet.${lang.ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="group/code overflow-hidden rounded-xl border border-ink-700/70 bg-ink-900/90">
      <div className="flex items-center justify-between border-b border-ink-700/70 bg-ink-850/80 px-3 py-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {lang.label} · {lineCount} {lineCount === 1 ? "línea" : "líneas"}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={copy}
            title="Copiar código"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-ink-700/60 hover:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={download}
            title={`Descargar archivo .${lang.ext}`}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-ink-700/60 hover:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onSendToEditor?.(code, language)}
            title="Abrir en el editor"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-ink-700/60 hover:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <PencilLine className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <pre className="max-h-[420px] overflow-auto p-3 text-[13px] leading-relaxed">
        <code
          className="hljs font-mono"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  );
}
