"use client";

import { Fragment, useMemo } from "react";
import { Sparkles, User } from "lucide-react";
import CodeBlock from "./CodeBlock";
import type { ChatMessage } from "@/lib/types";

/**
 * Render minimalista de markdown para respuestas de IA:
 * - cercados de código → CodeBlock
 - **negrita**, `código en línea`, listas y párrafos
 */
const FENCE = /^([a-zA-Z0-9_+#-]*)$/;

export default function ChatBubble({
  message,
  streaming = false,
  onSendToEditor,
}: {
  message: ChatMessage;
  streaming?: boolean;
  onSendToEditor?: (code: string, language: string) => void;
}) {
  const isUser = message.role === "user";

  const parts = useMemo(() => {
    if (isUser) return null;
    const segments: Array<{ type: "text" | "code"; content: string; lang: string }> = [];
    const regex = /```([^\n`]*)\n?([\s\S]*?)(?:```|$)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(message.content)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: "text", content: message.content.slice(lastIndex, match.index), lang: "" });
      }
      const fenceLang = (match[1] ?? "").trim();
      const body = match[2] ?? "";
      segments.push({
        type: "code",
        content: body.replace(/\n$/, ""),
        lang: FENCE.test(fenceLang) ? fenceLang : "plaintext",
      });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < message.content.length) {
      segments.push({ type: "text", content: message.content.slice(lastIndex), lang: "" });
    }
    return segments;
  }, [message.content, isUser]);

  if (isUser) {
    return (
      <div className="animate-slide-up flex justify-end gap-3">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-indigo-600/90 px-4 py-2.5 text-sm leading-relaxed text-white shadow-lg shadow-indigo-950/40">
          {message.content}
        </div>
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-indigo-500/40 bg-indigo-950/60">
          <User className="h-3.5 w-3.5 text-indigo-300" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up flex gap-3">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-indigo-500/40 bg-gradient-to-br from-indigo-600 to-violet-700 shadow shadow-indigo-950/50">
        <Sparkles className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="prose-invert max-w-[92%] min-w-0 flex-1 space-y-2.5 text-sm leading-relaxed text-slate-200">
        {parts?.map((seg, i) =>
          seg.type === "code" ? (
            <CodeBlock key={i} code={seg.content} language={seg.lang} onSendToEditor={onSendToEditor} />
          ) : (
            <MarkdownText key={i} text={seg.content} />
          )
        )}
        {streaming && (
          <span className="inline-block h-4 w-2 animate-pulse-soft rounded-sm bg-indigo-400 align-middle" data-testid="cursor-streaming" />
        )}
      </div>
    </div>
  );
}

/** Convierte texto markdown simple a elementos React sin dependencias extra. */
function MarkdownText({ text }: { text: string }) {
  const blocks = useMemo(() => text.split(/\n{2,}/).filter((b) => b.trim().length > 0), [text]);

  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l));

        if (isList) {
          return (
            <ul key={i} className="ml-1 list-inside list-disc space-y-1 text-slate-300">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""))}</li>
              ))}
            </ul>
          );
        }

        // Títulos en markdown (## ...)
        if (/^#{1,4}\s+/.test(block.trim())) {
          const level = block.trim().match(/^#+/)![0].length;
          const content = block.trim().replace(/^#+\s+/, "");
          const Tag = (level <= 2 ? "h3" : "h4") as "h3" | "h4";
          return (
            <Tag key={i} className="font-semibold text-slate-100">
              {inline(content)}
            </Tag>
          );
        }

        return (
          <p key={i} className="whitespace-pre-wrap text-slate-300">
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && "\n"}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

/** **negrita** y `código en línea` */
function inline(text: string): React.ReactNode[] {
  const regex = /(\*\*[^*]+\*\*|`[^`\n]+`)/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      out.push(
        <strong key={out.length} className="font-semibold text-slate-100">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      out.push(
        <code key={out.length} className="rounded bg-ink-800 px-1 py-0.5 font-mono text-[12.5px] text-sky-300">
          {token.slice(1, -1)}
        </code>
      );
    }
    last = regex.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
