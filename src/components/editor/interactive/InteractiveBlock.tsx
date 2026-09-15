import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  Edit3,
  AlertCircle,
  FileCode,
  LayoutDashboard,
  Presentation,
  FileSpreadsheet,
  HelpCircle,
  Smartphone,
  Gamepad2,
  Wand2,
  ChevronRight,
  FolderArchive,
  ExternalLink,
  MoreHorizontal,
  Copy,
  AlignLeft,
  AlignCenter,
  AlignRight
} from "lucide-react";
import JSZip from "jszip";
import { buildSandboxDocument } from "./interactiveSandbox";
import InteractiveModal from "./InteractiveModal";
import { INTERACTIVE_TEMPLATES, type InteractiveTemplate } from "./interactiveTemplates";
import { generateInteractiveApp } from "./interactiveAiHelper";
import type { InteractiveBlock as InteractiveBlockType } from "../../../../types/blocks";
import { aiManager } from "../../../ai/AIManager";

interface InteractiveBlockProps {
  block: InteractiveBlockType;
  onPatch: (patch: Partial<InteractiveBlockType>) => void;
  onDelete?: () => void;
  isLocked?: boolean;
  onToast?: (message: string) => void;
}

export default function InteractiveBlock({
  block,
  onPatch,
  onDelete,
  isLocked,
  onToast
}: InteractiveBlockProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [runtimeKey, setRuntimeKey] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [quickAiPrompt, setQuickAiPrompt] = useState("");
  const [isQuickGenerating, setIsQuickGenerating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isConfigured = Boolean(block.html && block.html.trim().length > 0);

  // Dynamic Theme state observer
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });
    return () => observer.disconnect();
  }, []);

  // Sandboxed document compilation with active theme inheritance
  const sandboxDoc = useMemo(() => {
    return buildSandboxDocument({
      html: block.html || "",
      css: block.css || "",
      javascript: block.javascript || "",
      blockId: block.id,
      themeMode: block.themeMode === "custom" ? "custom" : (isDark ? "dark" : "light"),
      allowThemeInheritance: block.permissions?.allowThemeInheritance ?? true
    });
  }, [block.html, block.css, block.javascript, block.id, block.themeMode, block.permissions?.allowThemeInheritance, isDark]);

  // Listen for runtime error messages from sandbox
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "NOSKA_INTERACTIVE_RUNTIME_ERROR" && e.data.blockId === block.id) {
        setHasError(true);
        setErrorMessage(e.data.message || "Runtime execution error in sandbox");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [block.id]);

  const width = block.width;
  const height = block.height || 400;
  const align = block.align || "left";

  const handleSetAlign = (newAlign: "left" | "center" | "right") => {
    if (isLocked) return;
    onPatch({ align: newAlign });
    onToast?.(`Aligned block to ${newAlign}`);
  };

  const handleSetPresetWidth = (preset: "compact" | "medium" | "wide" | "full") => {
    if (isLocked) return;
    let targetW: number | string | undefined;
    if (preset === "compact") targetW = 480;
    else if (preset === "medium") targetW = 720;
    else if (preset === "wide") targetW = 960;
    else targetW = "100%";
    onPatch({ width: targetW });
    onToast?.(`Set width to ${preset}`);
  };

  const handleResetSize = () => {
    if (isLocked) return;
    onPatch({ width: undefined, height: 400, align: "left" });
    onToast?.("Reset block size to default");
  };

  const handleRefresh = useCallback(() => {
    setHasError(false);
    setErrorMessage("");
    setRuntimeKey((prev) => prev + 1);
    onToast?.("Interactive block reloaded");
  }, [onToast]);

  const handleSelectTemplate = (tpl: InteractiveTemplate) => {
    onPatch({
      type: "interactive",
      title: tpl.name,
      html: tpl.html,
      css: tpl.css,
      javascript: tpl.javascript,
      version: 1
    });
    setRuntimeKey((prev) => prev + 1);
    onToast?.(`Loaded "${tpl.name}" interactive template`);
  };

  const handleQuickGenerate = async () => {
    if (!quickAiPrompt.trim() || isQuickGenerating) return;
    setIsQuickGenerating(true);
    try {
      const parsed = await generateInteractiveApp(quickAiPrompt);
      if (parsed) {
        onPatch({
          type: "interactive",
          title: parsed.title || "Interactive App",
          html: parsed.html || "",
          css: parsed.css || "",
          javascript: parsed.javascript || "",
          version: 1
        });
        setRuntimeKey((prev) => prev + 1);
        onToast?.(aiManager.isConfigured() ? "Interactive block generated with AI!" : "Interactive block generated from template!");
      }
    } catch {
      handleSelectTemplate(INTERACTIVE_TEMPLATES[0]);
    } finally {
      setIsQuickGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".html") || file.name.endsWith(".htm")) {
      const text = await file.text();
      onPatch({
        type: "interactive",
        title: file.name.replace(/\.[^/.]+$/, ""),
        html: text,
        css: "",
        javascript: "",
        version: 1
      });
      setRuntimeKey((prev) => prev + 1);
      onToast?.(`Imported "${file.name}"`);
    } else if (file.name.endsWith(".zip")) {
      try {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(file);
        let foundHtml = "";
        let foundCss = "";
        let foundJs = "";

        for (const [filename, fileObj] of Object.entries(loadedZip.files)) {
          if (fileObj.dir) continue;
          if (/index\.html$/i.test(filename) || (!foundHtml && /\.html$/i.test(filename))) {
            foundHtml = await fileObj.async("text");
          } else if (/\.css$/i.test(filename)) {
            foundCss += (await fileObj.async("text")) + "\n";
          } else if (/\.js$/i.test(filename)) {
            foundJs += (await fileObj.async("text")) + "\n";
          }
        }

        if (foundHtml) {
          onPatch({
            type: "interactive",
            title: file.name.replace(/\.[^/.]+$/, ""),
            html: foundHtml,
            css: foundCss,
            javascript: foundJs,
            version: 1
          });
          setRuntimeKey((prev) => prev + 1);
          onToast?.(`Loaded archive "${file.name}"`);
        }
      } catch {
        onToast?.("Failed to extract ZIP archive");
      }
    }
  };

  const [isCardExpanded, setIsCardExpanded] = useState(true);

  // ─── UNCONFIGURED / INLINE CREATION STATE ───
  if (!isConfigured) {
    return (
      <div className="my-2 select-none font-sans max-w-full">
        <AnimatePresence mode="wait" initial={false}>
          {!isCardExpanded ? (
            /* Compact Single-Line Bar (Matching user screenshot) */
            <motion.div
              key="compact-bar"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ type: "spring", stiffness: 450, damping: 32 }}
              onClick={() => setIsCardExpanded(true)}
              className="group flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:border-black/[0.15] dark:hover:border-white/[0.15] transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-lg bg-blue-500/10 dark:bg-blue-400/15 text-blue-600 dark:text-blue-400 flex items-center justify-center transition group-hover:scale-105">
                  <Code2 size={14} />
                </div>
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition">
                  Create or upload HTML
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 dark:text-neutral-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition">
                <span>Open card</span>
                <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </motion.div>
          ) : (
            /* Apple-Level Expanded Interactive Creation Card */
            <motion.div
              key="expanded-card"
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -6 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="rounded-2xl border border-black/[0.08] dark:border-white/[0.12] bg-white/95 dark:bg-[#151821]/95 backdrop-blur-2xl text-neutral-900 dark:text-neutral-100 p-5 shadow-xl space-y-4.5 transition-all"
            >
              {/* Top Header Row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/20 flex items-center gap-1.5 shadow-2xs">
                    <Sparkles size={12} className="animate-pulse" />
                    <span>Interactive</span>
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    Create with AI, write code, or import project
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setModalOpen(true)}
                    className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 cursor-pointer transition px-2.5 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                  >
                    <span>Open Studio</span>
                    <ChevronRight size={13} />
                  </button>
                  <button
                    onClick={() => setIsCardExpanded(false)}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                    title="Collapse card"
                  >
                    <Minimize2 size={13} />
                  </button>
                </div>
              </div>

              {/* Upload Dropzone with Fluid Hover */}
              <motion.div
                whileHover={{ scale: 1.008 }}
                whileTap={{ scale: 0.995 }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300/80 dark:border-neutral-700/80 hover:border-blue-500 dark:hover:border-blue-400 rounded-xl p-5 text-center bg-neutral-50/60 dark:bg-[#1A1D26]/60 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 group shadow-2xs"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".html,.htm,.zip"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                  <Code2 size={16} />
                  <span>Upload HTML file or ZIP project</span>
                </div>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Or drag and drop project archive here
                </span>
              </motion.div>

              {/* Create with AI & Starter Templates Section */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 px-0.5">
                  Create with AI & Starter Templates
                </div>

                <div className="grid grid-cols-3 max-[720px]:grid-cols-2 max-[480px]:grid-cols-1 gap-2.5">
                  {[
                    { id: "slides", label: "Slides", icon: Presentation, bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25" },
                    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25" },
                    { id: "report", label: "Report", icon: FileSpreadsheet, bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25" },
                    { id: "explainer", label: "Explainer", icon: HelpCircle, bg: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/25" },
                    { id: "prototype", label: "Prototype", icon: Smartphone, bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25" },
                    { id: "game", label: "Game", icon: Gamepad2, bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" }
                  ].map((item) => {
                    const Icon = item.icon;
                    const tpl = INTERACTIVE_TEMPLATES.find((t) => t.id === item.id);
                    return (
                      <motion.button
                        key={item.id}
                        whileHover={{ y: -2, scale: 1.015 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => tpl && handleSelectTemplate(tpl)}
                        className="p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/90 dark:bg-[#1A1D26] hover:bg-neutral-100 dark:hover:bg-[#222733] hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex items-center gap-3 text-left cursor-pointer group shadow-2xs"
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${item.bg} shadow-2xs`}>
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-neutral-800 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
                            {item.label}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Inline Prompt Input with Apple-Level Glow */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-300/90 dark:border-neutral-700 bg-neutral-50/80 dark:bg-[#1A1D26] focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-2xs">
                    <Wand2 size={14} className="text-neutral-400 shrink-0" />
                    <input
                      type="text"
                      value={quickAiPrompt}
                      onChange={(e) => setQuickAiPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleQuickGenerate()}
                      placeholder="Or describe your idea (e.g. project budget tracker, quiz)..."
                      className="w-full bg-transparent text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 outline-none"
                    />
                    <span className="text-[9px] font-bold text-neutral-500 dark:text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-200/70 dark:bg-[#262A33] border border-neutral-300/70 dark:border-neutral-700 uppercase">
                      AI
                    </span>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleQuickGenerate}
                    disabled={isQuickGenerating || !quickAiPrompt.trim()}
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
                  >
                    {isQuickGenerating ? <RotateCcw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    <span>{isQuickGenerating ? "Generating..." : "Generate"}</span>
                  </motion.button>
                </div>
              </div>

              {/* Studio Modal Popup */}
              {modalOpen && (
                <InteractiveModal
                  isOpen={modalOpen}
                  onClose={() => setModalOpen(false)}
                  block={block}
                  onSave={(patch) => {
                    onPatch(patch);
                    setRuntimeKey((prev) => prev + 1);
                  }}
                  onToast={onToast}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── CONFIGURED INTERACTIVE RUNTIME VIEW ───
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isMenuOpen]);

  const handleCopyCode = async () => {
    const combined = `<!-- ${block.title || "Interactive Block"} -->\n<style>\n${block.css || ""}\n</style>\n${block.html || ""}\n<script>\n${block.javascript || ""}\n</script>`;
    try {
      await navigator.clipboard.writeText(combined);
      onToast?.("Code copied to clipboard!");
    } catch {
      onToast?.("Failed to copy code");
    }
  };

  // ─── CONFIGURED INTERACTIVE RUNTIME VIEW ───
  return (
    <>
      <div
        className={`w-full h-full min-h-[260px] rounded-2xl border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 bg-white dark:bg-[#151821] group/interactive relative shadow-sm hover:shadow-md transition-all flex flex-col ${
          isFullscreen ? "fixed inset-0 z-[1000] rounded-none m-0 bg-white dark:bg-[#151821] w-full h-full" : ""
        }`}
      >
        {/* Top Header Bar (Matching Noska Card Aesthetic) */}
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-black/[0.06] dark:border-white/[0.08] bg-neutral-50/80 dark:bg-[#11141B] select-none shrink-0 transition-colors rounded-t-2xl">
          {/* Left: Document/File Title */}
          <div className="flex items-center gap-2 min-w-0">
            <FileCode size={13} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
            <span className="text-[11.5px] font-mono font-medium text-neutral-700 dark:text-neutral-300 truncate">
              {block.title ? `${block.title.toLowerCase().replace(/\s+/g, "_")}.html` : "interactive.html"}
            </span>
          </div>

          {/* Right Action Icons (⤢, ↗, ···) */}
          <div className="flex items-center gap-1">
            {!isLocked && (
              <button
                onClick={() => setModalOpen(true)}
                className="h-6 w-6 rounded-md flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Open Studio (↗)"
              >
                <ExternalLink size={13} />
              </button>
            )}

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-6 w-6 rounded-md flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen presentation (⤢)"}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>

            {/* More Options Dropdown (···) */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="h-6 w-6 rounded-md flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="More options (···)"
              >
                <MoreHorizontal size={14} />
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-white/95 dark:bg-[#1E2128]/95 backdrop-blur-xl border border-black/10 dark:border-white/15 shadow-xl py-1.5 z-50 text-xs font-medium text-neutral-800 dark:text-neutral-200"
                  >
                    <button
                      onClick={() => {
                        setModalOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
                    >
                      <Edit3 size={13} className="text-blue-500" />
                      <span>Edit in Studio</span>
                    </button>
                    <button
                      onClick={() => {
                        handleRefresh();
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
                    >
                      <RotateCcw size={13} className="text-neutral-400" />
                      <span>Reload Sandbox</span>
                    </button>
                    <button
                      onClick={() => {
                        handleCopyCode();
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
                    >
                      <Copy size={13} className="text-neutral-400" />
                      <span>Copy Source Code</span>
                    </button>

                    {/* Alignment submenu item */}
                    <div className="px-3 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-1">
                      Alignment & Size
                    </div>
                    <div className="flex items-center px-2 py-1 gap-1">
                      <button
                        onClick={() => {
                          handleSetAlign("left");
                          setIsMenuOpen(false);
                        }}
                        className={`flex-1 py-1 text-[11px] rounded flex items-center justify-center gap-1 transition ${
                          align === "left" ? "bg-blue-500/10 text-blue-600 font-bold" : "hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >
                        <AlignLeft size={11} /> Left
                      </button>
                      <button
                        onClick={() => {
                          handleSetAlign("center");
                          setIsMenuOpen(false);
                        }}
                        className={`flex-1 py-1 text-[11px] rounded flex items-center justify-center gap-1 transition ${
                          align === "center" ? "bg-blue-500/10 text-blue-600 font-bold" : "hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >
                        <AlignCenter size={11} /> Center
                      </button>
                      <button
                        onClick={() => {
                          handleSetAlign("right");
                          setIsMenuOpen(false);
                        }}
                        className={`flex-1 py-1 text-[11px] rounded flex items-center justify-center gap-1 transition ${
                          align === "right" ? "bg-blue-500/10 text-blue-600 font-bold" : "hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >
                        <AlignRight size={11} /> Right
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1 px-2 py-1">
                      <button
                        onClick={() => {
                          handleSetPresetWidth("compact");
                          setIsMenuOpen(false);
                        }}
                        className="px-2 py-1 text-[11px] rounded hover:bg-black/5 dark:hover:bg-white/5 text-left transition"
                      >
                        Compact (480px)
                      </button>
                      <button
                        onClick={() => {
                          handleSetPresetWidth("medium");
                          setIsMenuOpen(false);
                        }}
                        className="px-2 py-1 text-[11px] rounded hover:bg-black/5 dark:hover:bg-white/5 text-left transition"
                      >
                        Medium (720px)
                      </button>
                      <button
                        onClick={() => {
                          handleSetPresetWidth("wide");
                          setIsMenuOpen(false);
                        }}
                        className="px-2 py-1 text-[11px] rounded hover:bg-black/5 dark:hover:bg-white/5 text-left transition"
                      >
                        Wide (960px)
                      </button>
                      <button
                        onClick={() => {
                          handleSetPresetWidth("full");
                          setIsMenuOpen(false);
                        }}
                        className="px-2 py-1 text-[11px] rounded hover:bg-black/5 dark:hover:bg-white/5 text-left transition"
                      >
                        Full Width (100%)
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        handleResetSize();
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
                    >
                      <Minimize2 size={13} className="text-neutral-400" />
                      <span>Reset Dimensions</span>
                    </button>
                    {!isLocked && onDelete && (
                      <>
                        <div className="h-px bg-neutral-200 dark:bg-white/10 my-1" />
                        <button
                          onClick={() => {
                            onDelete();
                            setIsMenuOpen(false);
                          }}
                          className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors text-left cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>Delete Block</span>
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Sandboxed iframe execution */}
        <div className="flex-1 w-full min-h-0 relative overflow-hidden bg-white dark:bg-[#0F1117] rounded-b-2xl">
          <iframe
            key={runtimeKey}
            srcDoc={sandboxDoc}
            sandbox="allow-scripts allow-forms allow-modals"
            className="w-full h-full border-none block"
            title={block.title || "Interactive Block Sandbox"}
          />
        </div>

        {/* Fallback Runtime Error Banner */}
        {hasError && (
          <div className="absolute bottom-4 left-4 right-4 z-20 p-3 rounded-xl bg-[#171A20]/95 border border-rose-500/40 backdrop-blur-xl text-[var(--text,#EDEBE5)] text-xs flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertCircle size={15} className="text-rose-400" />
              </div>
              <div className="truncate">
                <span className="font-bold text-rose-300">Execution Notice:</span> {errorMessage}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setModalOpen(true)}
                className="px-3 py-1 rounded-lg bg-[var(--accent,#E3CFB3)] hover:bg-[var(--accent-light,#EDE0CC)] text-[#0F1117] font-bold text-xs transition cursor-pointer"
              >
                Fix in Studio
              </button>
              <button
                onClick={handleRefresh}
                className="px-2.5 py-1 rounded-lg bg-[#262A33] hover:bg-[#2E333C] text-[var(--text,#EDEBE5)] font-semibold text-xs border border-[var(--border)] transition cursor-pointer"
              >
                Reload
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Studio Modal */}
      {modalOpen && (
        <InteractiveModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          block={block}
          onSave={(patch) => {
            onPatch(patch);
            setRuntimeKey((prev) => prev + 1);
          }}
          onToast={onToast}
        />
      )}
    </>
  );
}

