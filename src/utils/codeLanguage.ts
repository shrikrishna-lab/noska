// Canonical code-fence language ids.
//
// Code block languages reach us from many places that never agree on spelling:
// our own defaults wrote `"plain"`, markdown imports write whatever token was in
// the fence (`js`, `sh`, `txt`, `C++`), Notion writes prose ("plain text",
// "visual basic"), and users pick from the CodeBlock dropdown (`plaintext`).
// highlight.js only accepts its own registered ids — `plain` is NOT one of them
// (it registers `plaintext` with aliases `text`/`txt`), so handing it an unknown
// id throws `Unknown language: "plain"`, which propagates out of render and
// takes down the surrounding React tree via the ErrorBoundary.
//
// This module is the single place that turns any of those inputs into an id
// that is safe to hand to highlight.js. Everything that reads or writes
// `block.language` should go through `normalizeCodeLanguage`.

export const PLAIN_LANGUAGE = "plaintext";

/** Spellings that mean "no syntax highlighting". */
const PLAIN_ALIASES = new Set([
  "",
  "none",
  "plain",
  "plaintext",
  "plain text",
  "text",
  "txt",
  "no highlight",
  "no-highlight",
]);

/**
 * Alias -> canonical id, restricted to ids the full `highlight.js` bundle
 * actually registers. Keys are lowercase. Values must stay in sync with
 * `src/components/editor/CodeBlock.tsx`'s LANGUAGES dropdown.
 */
const ALIASES: Record<string, string> = {
  // JS / TS
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  node: "javascript",
  ts: "typescript",
  tsx: "typescript",
  // Python
  py: "python",
  python3: "python",
  py3: "python",
  // Shell
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  terminal: "bash",
  // Data / config
  yml: "yaml",
  jsonc: "json",
  json5: "json",
  md: "markdown",
  mdown: "markdown",
  htm: "html",
  xhtml: "html",
  svg: "xml",
  toml: "ini",
  cfg: "ini",
  conf: "ini",
  // Other common fence spellings
  rb: "ruby",
  rs: "rust",
  kt: "kotlin",
  golang: "go",
  cs: "csharp",
  c: "c",
  "c++": "cpp",
  "objective-c": "objectivec",
  objc: "objectivec",
  bat: "dos",
  batch: "dos",
  ps1: "powershell",
  ps: "powershell",
  docker: "dockerfile",
  gql: "graphql",
  postgres: "pgsql",
  psql: "pgsql",
  "plain text": PLAIN_LANGUAGE,
};

/** Canonical ids we trust without consulting highlight.js. */
const CANONICAL = new Set([
  "javascript", "typescript", "python", "html", "css", "json", "bash", "sql",
  "rust", "go", "java", "cpp", "csharp", "ruby", "php", "swift", "kotlin",
  "yaml", "markdown", "xml", "dockerfile", PLAIN_LANGUAGE, "c", "objectivec",
  "ini", "powershell", "graphql", "pgsql", "lua", "r", "scala", "perl", "dart",
  "elixir", "erlang", "haskell", "clojure", "fsharp", "julia", "matlab",
  "diff", "plaintext", "handlebars", "less", "scss", "sql", "vbnet", "wasm",
]);

/**
 * Normalize any user/import/AI-authored language string into a canonical id.
 * Unknown values collapse to `plaintext` rather than being passed through, so
 * highlight.js can never be handed an id it does not know.
 */
export function normalizeCodeLanguage(raw: string | null | undefined): string {
  if (raw == null) return PLAIN_LANGUAGE;
  const trimmed = String(raw).trim();
  if (PLAIN_ALIASES.has(trimmed.toLowerCase())) return PLAIN_LANGUAGE;

  const lower = trimmed.toLowerCase();
  const aliased = ALIASES[lower];
  if (aliased) return aliased;

  // Highlight.js accepts things like `language-c++` if the caller prefixed it.
  const stripped = lower.startsWith("language-") ? lower.slice("language-".length) : lower;
  if (PLAIN_ALIASES.has(stripped)) return PLAIN_LANGUAGE;
  const aliasStripped = ALIASES[stripped];
  if (aliasStripped) return aliasStripped;
  if (CANONICAL.has(stripped)) return stripped;

  // Notion and other importers emit prose like "visual basic" or "C plus plus".
  // Fall back to plaintext instead of letting an unknown id reach highlight.js.
  return PLAIN_LANGUAGE;
}

/**
 * Last line of defence for the highlight call itself. Even if a language slips
 * through normalization (a future alias, a custom `registerLanguage`), a render
 * must never throw — an unhighlighted block beats a crashed React tree.
 */
export function safeHighlight(
  hljs: { highlight: (code: string, opts: { language: string }) => { value: string } } | null,
  code: string,
  language: string | null | undefined,
): string {
  if (!code) return "";
  const escaped = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (!hljs) return escaped;
  try {
    return hljs.highlight(code, { language: normalizeCodeLanguage(language) }).value;
  } catch {
    try {
      return hljs.highlight(code, { language: PLAIN_LANGUAGE }).value;
    } catch {
      return escaped;
    }
  }
}