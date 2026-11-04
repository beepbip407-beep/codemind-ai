import type { Metadata, Viewport } from "next";
import { BrainCircuit } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeMind AI — Tu asistente de programación con IA",
  description:
    "Genera, explica, corrige, refactoriza y prueba código con inteligencia artificial. Editor Monaco integrado, chat con contexto y herramientas de IA.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0e17",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-ink-950 text-slate-200">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-indigo-600 focus:px-3 focus:py-1"
        >
          Saltar al contenido
        </a>
        {children}
        <footer className="border-t border-ink-700/60 px-4 py-3 text-center text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <BrainCircuit className="h-3.5 w-3.5 text-indigo-400" />
            CodeMind AI — Tu copiloto de programación con <strong className="text-slate-400">inteligencia artificial</strong>
          </span>
        </footer>
      </body>
    </html>
  );
}
