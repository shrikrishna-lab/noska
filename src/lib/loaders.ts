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

let _hljsPromise: Promise<typeof import("highlight.js")["default"]> | null = null;

export function loadHighlightJs(): Promise<typeof import("highlight.js")["default"]> {
  if (!_hljsPromise) {
    _hljsPromise = import("highlight.js").then((m) => {
      import("highlight.js/styles/github-dark.css");
      return m.default;
    });
  }
  return _hljsPromise;
}
