import React, { useState, useEffect, ComponentType } from "react";
import type { GenericBlock } from "../../../types/blocks";

interface LazyMermaidBlockProps {
  block: GenericBlock;
  onPatch: (patch: Partial<GenericBlock>) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isLocked?: boolean;
  innerRef?: React.Ref<HTMLTextAreaElement>;
}

let _MermaidBlock: ComponentType<LazyMermaidBlockProps> | null = null;
let _promise: Promise<void> | null = null;
function loadMermaidBlock(): Promise<void> {
  if (!_promise) {
    _promise = import("./MermaidBlock").then((m) => {
      _MermaidBlock = m.default;
    });
  }
  return _promise;
}

export default function LazyMermaidBlock(props: LazyMermaidBlockProps) {
  const [ready, setReady] = useState(!!_MermaidBlock);

  useEffect(() => {
    if (!_MermaidBlock) loadMermaidBlock().then(() => setReady(true));
  }, []);

  if (!ready || !_MermaidBlock) {
    return (
      <div className="my-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--muted)] italic text-center">
        Loading diagram editor…
      </div>
    );
  }

  return <_MermaidBlock {...props} />;
}
