"use client";

import { useMemo } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";

interface CodeEditorProps {
  code: string;
  language: string; // Identificador de lenguaje de Monaco
  onChange: (code: string) => void;
  /** Proporciona la instancia del editor para leer selecciones, etc. */
  onReady?: (editor: import("monaco-editor").editor.IStandaloneCodeEditor) => void;
}

/**
 * Editor basado en Monaco con tema oscuro propio de CodeMind.
 * Monaco carga por CDN en el cliente; no se consume en SSR.
 */
export default function CodeEditor({ code, language, onChange, onReady }: CodeEditorProps) {
  const options = useMemo(
    () => ({
      minimap: { enabled: false },
      fontSize: 13,
      lineNumbers: "on" as const,
      scrollBeyondLastLine: false,
      wordWrap: "on" as const,
      tabSize: 2,
      renderLineHighlight: "line" as const,
      smoothScrolling: true,
      padding: { top: 12, bottom: 12 },
      automaticLayout: true,
      fixedOverflowWidgets: true,
    }),
    []
  );

  function beforeMount(monaco: Monaco) {
    monaco.editor.defineTheme("codemind-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "5f6b85", fontStyle: "italic" },
        { token: "keyword", foreground: "c792ea" },
        { token: "string", foreground: "c3e88d" },
        { token: "number", foreground: "f78c6c" },
        { token: "type", foreground: "ffcb6b" },
      ],
      colors: {
        "editor.background": "#101423",
        "editor.lineHighlightBackground": "#1a2138",
        "editorLineNumber.foreground": "#4a5679",
        "editorGutter.background": "#101423",
      },
    });
  }

  return (
    <Editor
      height="100%"
      theme="codemind-dark"
      defaultLanguage="javascript"
      language={language}
      value={code}
      options={options}
      beforeMount={beforeMount}
      onMount={(editor) => onReady?.(editor)}
      onChange={(v) => onChange(v ?? "")}
      loading={
        <div className="flex h-full items-center justify-center text-xs text-slate-500">
          Cargando editor…
        </div>
      }
    />
  );
}
