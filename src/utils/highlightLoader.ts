import type { HLJSApi, LanguageFn } from "highlight.js";

/**
 * On-demand highlight.js loader.
 *
 * The full `highlight.js` bundle ships ~190 grammars (~900 kB minified /
 * ~300 kB gzipped) and the old dynamic import pulled ALL of them into the
 * editor the moment a single code block mounted. Code blocks only ever need
 * one language at a time, and `normalizeCodeLanguage` guarantees the id is
 * canonical, so we load `highlight.js/lib/core` plus exactly the grammar(s)
 * the rendered blocks ask for.
 *
 * Degradation rules (mirrors src/utils/codeLanguage.ts):
 *   - plaintext is built into the core — resolved with zero extra requests.
 *   - unknown/unmapped ids resolve the core without registering anything;
 *     `safeHighlight` then falls back to plaintext instead of throwing.
 */

type LanguageModule = { default: LanguageFn };

const LANGUAGE_LOADERS: Record<string, () => Promise<LanguageModule>> = {
  javascript: () => import("highlight.js/lib/languages/javascript"),
  typescript: () => import("highlight.js/lib/languages/typescript"),
  python: () => import("highlight.js/lib/languages/python"),
  // highlight.js registers html/xhtml/svg as aliases of xml.
  html: () => import("highlight.js/lib/languages/xml"),
  xml: () => import("highlight.js/lib/languages/xml"),
  css: () => import("highlight.js/lib/languages/css"),
  json: () => import("highlight.js/lib/languages/json"),
  bash: () => import("highlight.js/lib/languages/bash"),
  sql: () => import("highlight.js/lib/languages/sql"),
  rust: () => import("highlight.js/lib/languages/rust"),
  go: () => import("highlight.js/lib/languages/go"),
  java: () => import("highlight.js/lib/languages/java"),
  cpp: () => import("highlight.js/lib/languages/cpp"),
  csharp: () => import("highlight.js/lib/languages/csharp"),
  ruby: () => import("highlight.js/lib/languages/ruby"),
  php: () => import("highlight.js/lib/languages/php"),
  swift: () => import("highlight.js/lib/languages/swift"),
  kotlin: () => import("highlight.js/lib/languages/kotlin"),
  yaml: () => import("highlight.js/lib/languages/yaml"),
  markdown: () => import("highlight.js/lib/languages/markdown"),
  dockerfile: () => import("highlight.js/lib/languages/dockerfile"),
  c: () => import("highlight.js/lib/languages/c"),
  objectivec: () => import("highlight.js/lib/languages/objectivec"),
  ini: () => import("highlight.js/lib/languages/ini"),
  powershell: () => import("highlight.js/lib/languages/powershell"),
  graphql: () => import("highlight.js/lib/languages/graphql"),
  pgsql: () => import("highlight.js/lib/languages/pgsql"),
  lua: () => import("highlight.js/lib/languages/lua"),
  r: () => import("highlight.js/lib/languages/r"),
  scala: () => import("highlight.js/lib/languages/scala"),
  perl: () => import("highlight.js/lib/languages/perl"),
  dart: () => import("highlight.js/lib/languages/dart"),
  elixir: () => import("highlight.js/lib/languages/elixir"),
  erlang: () => import("highlight.js/lib/languages/erlang"),
  haskell: () => import("highlight.js/lib/languages/haskell"),
  clojure: () => import("highlight.js/lib/languages/clojure"),
  fsharp: () => import("highlight.js/lib/languages/fsharp"),
  julia: () => import("highlight.js/lib/languages/julia"),
  matlab: () => import("highlight.js/lib/languages/matlab"),
  diff: () => import("highlight.js/lib/languages/diff"),
  handlebars: () => import("highlight.js/lib/languages/handlebars"),
  less: () => import("highlight.js/lib/languages/less"),
  scss: () => import("highlight.js/lib/languages/scss"),
  vbnet: () => import("highlight.js/lib/languages/vbnet"),
  wasm: () => import("highlight.js/lib/languages/wasm"),
};

let _corePromise: Promise<HLJSApi> | null = null;
let _styleLoaded = false;
const _registered = new Map<string, Promise<void>>();

function loadCore(): Promise<HLJSApi> {
  if (!_corePromise) {
    _corePromise = import("highlight.js/lib/core").then((m) => m.default);
  }
  return _corePromise;
}

function registerLanguage(hljs: HLJSApi, id: string): Promise<void> {
  let pending = _registered.get(id);
  if (pending) return pending;
  const loader = LANGUAGE_LOADERS[id];
  if (!loader) {
    // No grammar on tap for this id — resolve so the caller degrades to
    // plaintext via safeHighlight instead of retrying forever.
    const resolved = Promise.resolve();
    _registered.set(id, resolved);
    return resolved;
  }
  pending = loader()
    .then((mod) => {
      hljs.registerLanguage(id, mod.default);
    })
    .catch((error) => {
      // A failed grammar fetch must not take the block down; fall back.
      console.warn(`[highlight] failed to load grammar "${id}"`, error);
    });
  _registered.set(id, pending);
  return pending;
}

/**
 * Resolve the shared highlighter, registering `language` when it has a
 * grammar. `language` is expected to be a `normalizeCodeLanguage` canonical
 * id (any spelling it accepts). Plaintext needs no grammar.
 */
export async function loadHighlighter(language?: string | null): Promise<HLJSApi> {
  const hljs = await loadCore();
  if (!_styleLoaded) {
    _styleLoaded = true;
    import("highlight.js/styles/github-dark.css").catch(() => {});
  }
  const id = language && language !== "plaintext" ? language : null;
  if (id) await registerLanguage(hljs, id);
  return hljs;
}
