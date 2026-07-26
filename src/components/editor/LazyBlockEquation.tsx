import React, { useState, useEffect } from "react";

let _katex: any = null;
let _katexPromise: Promise<void> | null = null;
function getKatex(): Promise<any> {
  if (!_katexPromise) {
    _katexPromise = import("katex").then((m) => {
      _katex = m.default;
      import("katex/dist/katex.min.css");
    });
  }
  return _katexPromise;
}

export default function LazyBlockEquation({ text, displayMode, className, onFocus, onBlur, isFocused, children }: {
  text: string;
  displayMode: boolean;
  className?: string;
  isFocused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  children?: React.ReactNode;
}) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    if (!text) { setHtml(""); return; }
    getKatex().then(() => {
      try {
        setHtml(_katex.renderToString(text, { throwOnError: false, displayMode }));
      } catch {}
    });
  }, [text, displayMode]);

  if (isFocused || !text) {
    return <>{children}</>;
  }

  return (
    <div
      className={className}
      onMouseDown={(e) => {
        e.preventDefault();
        onFocus?.();
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
