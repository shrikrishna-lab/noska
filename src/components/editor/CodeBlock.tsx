import React, { useState, useRef, useEffect, useCallback } from "react";
import { Copy, Check, ChevronDown } from "lucide-react";
import type { CodeBlockData } from "../../../types/blocks";

const LANGUAGES = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "json", label: "JSON" },
  { id: "bash", label: "Bash" },
  { id: "sql", label: "SQL" },
  { id: "rust", label: "Rust" },
  { id: "go", label: "Go" },
  { id: "java", label: "Java" },
  { id: "cpp", label: "C++" },
  { id: "csharp", label: "C#" },
  { id: "ruby", label: "Ruby" },
  { id: "php", label: "PHP" },
  { id: "swift", label: "Swift" },
  { id: "kotlin", label: "Kotlin" },
  { id: "yaml", label: "YAML" },
  { id: "markdown", label: "Markdown" },
  { id: "xml", label: "XML" },
  { id: "dockerfile", label: "Dockerfile" },
  { id: "plaintext", label: "Plain text" },
];

interface CodeBlockProps {
  block: CodeBlockData;
  onPatch: (patch: Record<string, unknown>) => void;
  isLocked?: boolean;
  onDelete?: () => void;
}

let _hljs: any = null;
let _hljsPromise: Promise<void> | null = null;
function ensureHljs(): Promise<void> {
  if (!_hljsPromise) {
    _hljsPromise = import("highlight.js").then((m) => {
      _hljs = m.default;
      import("highlight.js/styles/github-dark.css").catch(() => {});
    });
  }
  return _hljsPromise;
}

export default function CodeBlock({ block, onPatch, isLocked, onDelete }: CodeBlockProps) {
  const [language, setLanguage] = useState(block.language || "javascript");
  const [copied, setCopied] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const [hljsReady, setHljsReady] = useState(!!_hljs);

  useEffect(() => {
    if (!_hljs) ensureHljs().then(() => setHljsReady(true));
  }, []);

  const highlighted = block.text && hljsReady
    ? _hljs.highlight(block.text, { language: language === "plaintext" ? "plaintext" : language }).value
    : block.text?.replace(/</g, "&lt;").replace(/>/g, "&gt;") || "";

  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent | PointerEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [langOpen]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(block.text || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [block.text]);

  const handleLanguageChange = useCallback((langId: string) => {
    setLanguage(langId);
    onPatch({ language: langId });
    setLangOpen(false);
  }, [onPatch]);

  const lineCount = (block.text || "").split("\n").length;

  return (
    <div className="my-2 rounded-xl border border-[var(--border-strong)] bg-[#0d1117] overflow-hidden group/code">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-[#30363d]">
        <div className="relative" ref={langRef}>
          <button
            onClick={() => !isLocked && setLangOpen(!langOpen)}
            disabled={isLocked}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-[#8b949e] hover:bg-[#30363d] hover:text-[#c9d1d9] transition cursor-pointer"
          >
            <code className="text-xs">&lt;/&gt;</code>
            {LANGUAGES.find(l => l.id === language)?.label || language}
            <ChevronDown size={10} />
          </button>
          {langOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 w-40 max-h-48 overflow-y-auto rounded-lg border border-[#30363d] bg-[#161b22] shadow-2xl scrollbar-thin">
              {LANGUAGES.map(l => (
                <button
                  key={l.id}
                  onClick={() => handleLanguageChange(l.id)}
                  className={`w-full text-left px-3 py-1 text-[11px] transition cursor-pointer ${
                    language === l.id ? "text-[#58a6ff] bg-[#1f2937]" : "text-[#8b949e] hover:bg-[#1f2937] hover:text-[#c9d1d9]"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isLocked && (
            <button
              onClick={onDelete}
              className="opacity-0 group-hover/code:opacity-100 px-2 py-0.5 rounded text-[11px] text-[#8b949e] hover:bg-[#30363d] hover:text-[#f85149] transition cursor-pointer"
            >
              Delete
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-[#8b949e] hover:bg-[#30363d] hover:text-[#c9d1d9] transition cursor-pointer"
          >
            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      <div className="relative">
        <textarea
          value={block.text || ""}
          onChange={(e) => onPatch({ text: e.target.value })}
          readOnly={isLocked}
          className="absolute inset-0 w-full h-full resize-none bg-transparent text-transparent caret-[#c9d1d9] outline-none font-mono text-[13px] leading-[1.6] px-4 py-3 z-10"
          placeholder="Type your code here..."
          spellCheck={false}
        />
        <div className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-[1.6] select-none" aria-hidden="true">
          <table className="border-collapse">
            <tbody>
              <tr>
                <td className="text-right pr-4 text-[#484f58] select-none align-top text-[13px] leading-[1.6]" style={{ minWidth: "3ch" }}>
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </td>
                <td>
                  <pre className="m-0" ref={codeRef}>
                    <code
                      className={`hljs language-${language}`}
                      dangerouslySetInnerHTML={{ __html: highlighted || " " }}
                    />
                  </pre>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
