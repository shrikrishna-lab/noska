import React, { useState } from "react";
import { Sparkles, FileText, Download, Copy, Check, X, ArrowRight, ShieldAlert, ListPlus, Wand2, Layers } from "lucide-react";
import { CanvasElementData, Connector } from "./canvasStore";
import { Block } from "../../lib/supabaseService";
import { synthesizeCanvasAI, canvasToDocumentBlocks, documentBlocksToCanvasElements, AIReasoningMode, AIReasoningResult } from "./canvasBridge";

interface CanvasAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  elements: Record<string, CanvasElementData>;
  connectors: Connector[];
  pageBlocks: Block[];
  onApplyGeneratedCards: (cards: Array<{ text: string; color: string }>) => void;
  onApplyCategories: (categories: Record<string, string>) => void;
  onExportToDocument: (blocks: Block[]) => void;
  onImportFromDocument: (imported: { elements: Record<string, CanvasElementData>; connectors: Connector[]; positions: Record<string, { x: number; y: number }> }) => void;
}

export default function CanvasAIModal({
  isOpen,
  onClose,
  elements,
  connectors,
  pageBlocks,
  onApplyGeneratedCards,
  onApplyCategories,
  onExportToDocument,
  onImportFromDocument,
}: CanvasAIModalProps) {
  const [activeTab, setActiveTab] = useState<"ai" | "doc_bridge" | "export">("ai");
  const [aiMode, setAiMode] = useState<AIReasoningMode>("summarize");
  const [aiResult, setAiResult] = useState<AIReasoningResult | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const runAI = (mode: AIReasoningMode) => {
    setAiMode(mode);
    const res = synthesizeCanvasAI(elements, connectors, mode);
    setAiResult(res);
  };

  const handleCopyMarkdown = () => {
    const docBlocks = canvasToDocumentBlocks(elements, connectors);
    const md = docBlocks.map(b => {
      if (b.type === "h1") return `# ${b.text}\n`;
      if (b.type === "h2") return `## ${b.text}\n`;
      if (b.type === "todo") return `- [ ] ${b.text}`;
      return `- ${b.text}`;
    }).join("\n");

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      elements,
      connectors
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `noska-canvas-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl border border-black/10 dark:border-white/15 bg-white dark:bg-[#181a22] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-600 grid place-items-center">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text)]">Canvas Intelligence & Bridge</h3>
              <p className="text-xs text-slate-500">AI synthesis, document sync, and board exports</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full bg-black/5 dark:bg-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-white grid place-items-center transition cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-black/5 dark:border-white/5">
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-1.5 pb-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === "ai"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <Wand2 size={13} />
            <span>AI Reasoning</span>
          </button>
          <button
            onClick={() => setActiveTab("doc_bridge")}
            className={`flex items-center gap-1.5 pb-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === "doc_bridge"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <FileText size={13} />
            <span>Document Bridge</span>
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`flex items-center gap-1.5 pb-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === "export"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <Download size={13} />
            <span>Export & Share</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {/* TAB 1: AI Reasoning */}
          {activeTab === "ai" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => runAI("summarize")}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    aiMode === "summarize" && aiResult
                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200"
                      : "bg-black/[0.02] dark:bg-white/[0.03] border-black/8 dark:border-white/8 hover:border-black/20"
                  }`}
                >
                  <div className="text-xs font-bold mb-0.5">📊 Summarize</div>
                  <div className="text-[10.5px] text-slate-500 line-clamp-1">Board momentum overview</div>
                </button>

                <button
                  onClick={() => runAI("find_blockers")}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    aiMode === "find_blockers" && aiResult
                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200"
                      : "bg-black/[0.02] dark:bg-white/[0.03] border-black/8 dark:border-white/8 hover:border-black/20"
                  }`}
                >
                  <div className="text-xs font-bold mb-0.5">🚨 Find Blockers</div>
                  <div className="text-[10.5px] text-slate-500 line-clamp-1">Detect bottlenecks</div>
                </button>

                <button
                  onClick={() => runAI("generate_actions")}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    aiMode === "generate_actions" && aiResult
                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200"
                      : "bg-black/[0.02] dark:bg-white/[0.03] border-black/8 dark:border-white/8 hover:border-black/20"
                  }`}
                >
                  <div className="text-xs font-bold mb-0.5">⚡ Next Actions</div>
                  <div className="text-[10.5px] text-slate-500 line-clamp-1">Draft subtasks</div>
                </button>

                <button
                  onClick={() => runAI("categorize")}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    aiMode === "categorize" && aiResult
                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200"
                      : "bg-black/[0.02] dark:bg-white/[0.03] border-black/8 dark:border-white/8 hover:border-black/20"
                  }`}
                >
                  <div className="text-xs font-bold mb-0.5">🎨 Categorize</div>
                  <div className="text-[10.5px] text-slate-500 line-clamp-1">Semantic auto-color</div>
                </button>
              </div>

              {aiResult ? (
                <div className="space-y-3 p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
                  <div className="text-xs font-semibold text-[var(--text)] leading-relaxed">
                    {aiResult.summary}
                  </div>
                  {aiResult.insights.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-black/5 dark:border-white/5">
                      {aiResult.insights.map((ins, i) => (
                        <div key={i} className="text-xs text-slate-600 dark:text-slate-300">
                          {ins}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions for generated cards or categories */}
                  {aiResult.suggestedCards && aiResult.suggestedCards.length > 0 && (
                    <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">
                        {aiResult.suggestedCards.length} action cards ready
                      </span>
                      <button
                        onClick={() => {
                          onApplyGeneratedCards(aiResult.suggestedCards!);
                          onClose();
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition cursor-pointer"
                      >
                        <ListPlus size={13} />
                        <span>Add Cards to Board</span>
                      </button>
                    </div>
                  )}

                  {aiResult.suggestedCategories && Object.keys(aiResult.suggestedCategories).length > 0 && (
                    <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">
                        {Object.keys(aiResult.suggestedCategories).length} note categories ready
                      </span>
                      <button
                        onClick={() => {
                          onApplyCategories(aiResult.suggestedCategories!);
                          onClose();
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition cursor-pointer"
                      >
                        <Check size={13} />
                        <span>Apply Semantic Colors</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Select an AI analysis tool above to generate insights from your canvas notes.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Document Bridge */}
          {activeTab === "doc_bridge" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Export Canvas -> Document */}
                <div className="p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--text)]">
                    <FileText size={15} className="text-blue-500" />
                    <span>Canvas ➔ Document</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Convert current sticky notes & roadmap connections into structured page headings, tasks, and bullets.
                  </p>
                  <button
                    onClick={() => {
                      const newBlocks = canvasToDocumentBlocks(elements, connectors);
                      onExportToDocument(newBlocks);
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    <span>Append to Document</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                {/* Import Document -> Canvas */}
                <div className="p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--text)]">
                    <Layers size={15} className="text-amber-500" />
                    <span>Document ➔ Canvas</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Pull document headings, checklists, and notes directly onto the whiteboard as colored sticky cards ({pageBlocks.length} blocks available).
                  </p>
                  <button
                    onClick={() => {
                      const imported = documentBlocksToCanvasElements(pageBlocks);
                      onImportFromDocument(imported);
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    <span>Import to Canvas</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Export & Share */}
          {activeTab === "export" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03]">
                <div>
                  <div className="text-xs font-bold text-[var(--text)]">Copy Formatted Markdown</div>
                  <div className="text-[11px] text-slate-500">Copy structured notes and relationships to clipboard</div>
                </div>
                <button
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold transition cursor-pointer"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03]">
                <div>
                  <div className="text-xs font-bold text-[var(--text)]">Download JSON Canvas Backup</div>
                  <div className="text-[11px] text-slate-500">Complete board structure, positions, and connections</div>
                </div>
                <button
                  onClick={handleDownloadJSON}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold transition cursor-pointer"
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
