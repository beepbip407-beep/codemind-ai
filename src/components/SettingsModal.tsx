"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, Server, X } from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  providerName: string;
  currentModel: string;
  onSelectModel: (model: string) => void;
  aiConfigured: boolean;
}

interface ModelEntry {
  label: string;
  value: string;
}

interface ModelsResponse {
  provider?: string;
  default?: string;
  masked?: boolean;
  models?: ModelEntry[];
  error?: string;
}

export default function SettingsModal({
  open,
  onClose,
  providerName,
  currentModel,
  onSelectModel,
  aiConfigured,
}: SettingsModalProps) {
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch("/api/models")
      .then((res) =>
        res.json().then((json: ModelsResponse) => ({ ok: res.ok, json }))
      )
      .then(({ ok, json }) => {
        if (!ok) {
          setError(json.error ?? "No se pudieron cargar los modelos.");
        } else {
          setModels(json.models ?? []);
        }
      })
      .catch(() => setError("No hubo respuesta del servidor. ¿Está en ejecución?"))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const filtered = models.filter((m) =>
    m.label.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-slide-up flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Configuración de IA"
      >
        <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Server className="h-5 w-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Configuración de IA</h2>
              <p className="text-xs text-slate-500">
                Proveedor: <span className="text-slate-300">{providerName}</span>
                {aiConfigured ? " · clave cargada desde el servidor" : " · sin clave (revisa .env.local)"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-ink-800 hover:text-slate-200"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-ink-700/70 bg-ink-850/60 px-5 py-3 text-xs leading-relaxed text-slate-400">
          La API key <strong className="text-slate-300">nunca</strong> se envía al navegador: vive
          solo en <code className="rounded bg-ink-800 px-1 text-indigo-300">.env.local</code>. Aquí
          eliges qué modelo usará la plataforma.
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {aiConfigured === false ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200">
              <p className="font-semibold">Proveedor de IA no configurado</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>Copia <code>.env.example</code> a <code>.env.local</code>.</li>
                <li>Define <code>AI_API_KEY</code> con tu clave y <code>AI_BASE_URL</code> del proveedor.</li>
                <li>Reinicia el servidor (<code>npm run dev</code>) y vuelve a abrir este panel.</li>
              </ol>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando modelos del proveedor…
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs leading-relaxed text-rose-200">
              <p className="font-semibold">No se pudieron listar los modelos</p>
              <p className="mt-1 text-rose-200/80">{error}</p>
            </div>
          ) : (
            <>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filtrar modelos (p. ej. «gpt-4», «llama»…)"
                className="mb-3 w-full rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:outline-none"
              />
              {filtered.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">
                  Ningún motor coincide con «{filter}».
                </p>
              ) : (
                <ul className="space-y-1">
                  {filtered.map((m) => (
                    <li key={m.value}>
                      <button
                        onClick={() => {
                          onSelectModel(m.value);
                          onClose();
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${
                          m.value === currentModel
                            ? "bg-indigo-600/30 text-indigo-100"
                            : "text-slate-300 hover:bg-ink-800"
                        }`}
                      >
                        <span className="truncate">{m.label}</span>
                        {m.value === currentModel && (
                          <Check className="h-3.5 w-3.5 text-indigo-300" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="border-t border-ink-700/70 px-5 py-3 text-[11px] text-slate-500">
          La lista se consulta en vivo a <code className="text-slate-400">GET /api/models</code>{" "}
          <RefreshCw className="inline h-3 w-3" /> Cada petición usa este motor en /api/chat.
        </div>
      </div>
    </div>
  );
}
