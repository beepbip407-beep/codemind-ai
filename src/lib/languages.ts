export interface CodeLanguage {
  id: string;
  label: string;
  /** Identificador de lenguaje para Monaco Editor. */
  monaco: string;
  /** Extensión de archivo por defecto para descargar. */
  ext: string;
}

export const LANGUAGES: CodeLanguage[] = [
  { id: "javascript", label: "JavaScript", monaco: "javascript", ext: "js" },
  { id: "typescript", label: "TypeScript", monaco: "typescript", ext: "ts" },
  { id: "html", label: "HTML", monaco: "html", ext: "html" },
  { id: "css", label: "CSS", monaco: "css", ext: "css" },
  { id: "python", label: "Python", monaco: "python", ext: "py" },
  { id: "lua", label: "Lua", monaco: "lua", ext: "lua" },
  { id: "cpp", label: "C++", monaco: "cpp", ext: "cpp" },
  { id: "java", label: "Java", monaco: "java", ext: "java" },
  { id: "csharp", label: "C#", monaco: "csharp", ext: "cs" },
  { id: "go", label: "Go", monaco: "go", ext: "go" },
  { id: "rust", label: "Rust", monaco: "rust", ext: "rs" },
  { id: "php", label: "PHP", monaco: "php", ext: "php" },
  { id: "ruby", label: "Ruby", monaco: "ruby", ext: "rb" },
  { id: "sql", label: "SQL", monaco: "sql", ext: "sql" },
  { id: "bash", label: "Bash", monaco: "shell", ext: "sh" },
  { id: "json", label: "JSON", monaco: "json", ext: "json" },
  { id: "markdown", label: "Markdown", monaco: "markdown", ext: "md" },
];

export const DEFAULT_LANGUAGE = LANGUAGES[0];

export function findLanguage(monacoId: string): CodeLanguage {
  const lower = monacoId?.toLowerCase() ?? "";
  return (
    LANGUAGES.find((l) => l.id === lower) ??
    LANGUAGES.find((l) => l.monaco === lower) ??
    LANGUAGES.find((l) => lower.startsWith(l.id)) ??
    DEFAULT_LANGUAGE
  );
}
