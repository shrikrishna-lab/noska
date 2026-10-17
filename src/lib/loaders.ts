let _katexPromise: Promise<typeof import("katex")["default"]> | null = null;

export function loadKatex(): Promise<typeof import("katex")["default"]> {
  if (!_katexPromise) {
    _katexPromise = import("katex").then((m) => {
      import("katex/dist/katex.min.css");
      return m.default;
    });
  }
  return _katexPromise;
}

/**
 * NOTE: delegates to the shared on-demand loader (core + only the grammar(s)
 * actually requested). Importing the full `highlight.js` bundle here would
 * pull ~900 kB of grammars into whatever chunk first called this.
 */
export { loadHighlighter as loadHighlightJs } from "../utils/highlightLoader";
