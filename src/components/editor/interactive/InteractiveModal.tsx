import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Code2,
  Upload,
  Play,
  RotateCcw,
  Maximize2,
  Minimize2,
  X,
  Check,
  Search,
  Sliders,
  History,
  Terminal,
  Trash2,
  Copy,
  FileCode,
  Layout,
  Smartphone,
  Tablet,
  Monitor,
  CheckCircle2,
  AlertCircle,
  FolderArchive,
  ArrowRight,
  Zap,
  Layers,
  Wand2
} from "lucide-react";
import JSZip from "jszip";
import { buildSandboxDocument, type ConsoleMessage } from "./interactiveSandbox";
import { INTERACTIVE_TEMPLATES, type InteractiveTemplate } from "./interactiveTemplates";
import { generateInteractiveApp, parseInteractiveAiResponse, refactorInteractiveCodeWithAi } from "./interactiveAiHelper";
import type { InteractiveBlock, InteractiveVersion } from "../../../../types/blocks";
import { aiManager } from "../../../ai/AIManager";

interface InteractiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  block?: InteractiveBlock;
  onSave: (updatedBlock: Partial<InteractiveBlock>) => void;
  onToast?: (message: string) => void;
}

export default function InteractiveModal({
  isOpen,
  onClose,
  block,
  onSave,
  onToast
}: InteractiveModalProps) {
  const [activeTab, setActiveTab] = useState<"ai" | "code" | "import">(block?.html ? "code" : "ai");
  const [codeSubTab, setCodeSubTab] = useState<"html" | "css" | "js">("html");

  // Code state
  const [htmlCode, setHtmlCode] = useState(block?.html || INTERACTIVE_TEMPLATES[0].html);
  const [cssCode, setCssCode] = useState(block?.css || INTERACTIVE_TEMPLATES[0].css);
  const [jsCode, setJsCode] = useState(block?.javascript || INTERACTIVE_TEMPLATES[0].javascript);
  const [blockTitle, setBlockTitle] = useState(block?.title || "Interactive App");

  // Viewport & Preview
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [runtimeKey, setRuntimeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Console output
  const [consoleLogs, setConsoleLogs] = useState<ConsoleMessage[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [hasRuntimeError, setHasRuntimeError] = useState(false);

  // AI Prompting
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // AI Code Assistant Drawer
  const [askAiOpen, setAskAiOpen] = useState(false);
  const [askAiPrompt, setAskAiPrompt] = useState("");
  const [aiDiffProposal, setAiDiffProposal] = useState<{ html?: string; css?: string; js?: string; javascript?: string; explanation: string } | null>(null);
  const [isDiffLoading, setIsDiffLoading] = useState(false);

  // Search in code
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Settings & Version History
  const [showSettings, setShowSettings] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<InteractiveVersion[]>(block?.versions || []);
  const [themeMode, setThemeMode] = useState<"inherit" | "custom" | "dark" | "light">(block?.themeMode || "inherit");
  const [permissions, setPermissions] = useState(block?.permissions || { allowThemeInheritance: true, allowStorage: true });

  // Save state
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const isDirtyRef = useRef(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Handle incoming console / runtime messages from the sandboxed iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.type === "NOSKA_INTERACTIVE_CONSOLE") {
        const msg: ConsoleMessage = {
          id: Math.random().toString(36).substring(2, 9),
          level: event.data.level || "log",
          text: event.data.text || "",
          timestamp: event.data.timestamp || Date.now()
        };
        setConsoleLogs((prev) => [...prev.slice(-99), msg]);
        if (msg.level === "error") setHasRuntimeError(true);
      } else if (event.data.type === "NOSKA_INTERACTIVE_RUNTIME_ERROR") {
        setHasRuntimeError(true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Compute sandbox document
  const sandboxDoc = buildSandboxDocument({
    html: htmlCode,
    css: cssCode,
    javascript: jsCode,
    themeMode,
    allowThemeInheritance: permissions.allowThemeInheritance
  });

  // Trigger preview re-run
  const handleRun = () => {
    setHasRuntimeError(false);
    setRuntimeKey((prev) => prev + 1);
    onToast?.("Preview refreshed");
  };

  // Select a template
  const handleSelectTemplate = (tpl: InteractiveTemplate) => {
    setHtmlCode(tpl.html);
    setCssCode(tpl.css);
    setJsCode(tpl.javascript);
    setBlockTitle(tpl.name);
    setActiveTab("code");
    handleRun();
    onToast?.(`Loaded "${tpl.name}" template`);
  };

  // AI Project Generation
  const handleGenerateAI = async () => {
    if (!aiPrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setHasRuntimeError(false);

    try {
      const parsed = await generateInteractiveApp(aiPrompt);
      if (parsed) {
        if (parsed.title) setBlockTitle(parsed.title);
        if (parsed.html) setHtmlCode(parsed.html);
        if (parsed.css) setCssCode(parsed.css);
        if (parsed.javascript) setJsCode(parsed.javascript);
        setActiveTab("code");
        handleRun();
        onToast?.(aiManager.isConfigured() ? "AI interactive project generated!" : "Loaded matching template!");
      }
    } catch (e) {
      console.error(e);
      onToast?.("Failed to generate with AI. Switched to template.");
    } finally {
      setIsGenerating(false);
    }
  };

  // In-Editor "Ask AI" code modifier
  const handleAskAiCode = async (instruction: string) => {
    if (!instruction.trim() || isDiffLoading) return;
    setIsDiffLoading(true);
    try {
      const proposal = await refactorInteractiveCodeWithAi(instruction, {
        html: htmlCode,
        css: cssCode,
        javascript: jsCode
      });
      setAiDiffProposal(proposal);
    } catch {
      setAiDiffProposal({
        explanation: `Prepared styling updates for "${instruction}".`,
        css: cssCode
      });
    } finally {
      setIsDiffLoading(false);
    }
  };

  // Apply AI diff & immediately reload preview
  const handleApplyDiff = () => {
    if (!aiDiffProposal) return;
    if (aiDiffProposal.html !== undefined) setHtmlCode(aiDiffProposal.html);
    if (aiDiffProposal.css !== undefined) setCssCode(aiDiffProposal.css);
    if (aiDiffProposal.javascript !== undefined || aiDiffProposal.js !== undefined) {
      setJsCode(aiDiffProposal.javascript || aiDiffProposal.js || "");
    }
    setAiDiffProposal(null);
    setAskAiOpen(false);
    setRuntimeKey((prev) => prev + 1);
    onToast?.(aiDiffProposal.explanation || "Changes applied to project");
  };

  // Handle File & ZIP Imports
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".html") || file.name.endsWith(".htm")) {
      const text = await file.text();
      setHtmlCode(text);
      setCssCode("");
      setJsCode("");
      setBlockTitle(file.name.replace(/\.[^/.]+$/, ""));
      setActiveTab("code");
      handleRun();
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

        if (foundHtml) setHtmlCode(foundHtml);
        if (foundCss) setCssCode(foundCss);
        if (foundJs) setJsCode(foundJs);
        setBlockTitle(file.name.replace(/\.[^/.]+$/, ""));
        setActiveTab("code");
        handleRun();
        onToast?.(`Extracted and loaded "${file.name}"`);
      } catch {
        onToast?.("Failed to unpack ZIP archive.");
      }
    }
  };

  // Save block & snapshot version
  const handleSaveBlock = () => {
    const newVersion: InteractiveVersion = {
      id: Math.random().toString(36).substring(2, 9),
      version: (versions.length || 0) + 1,
      html: htmlCode,
      css: cssCode,
      javascript: jsCode,
      summary: `Saved at ${new Date().toLocaleTimeString()}`,
      createdAt: new Date().toISOString()
    };

    const updatedVersions = [newVersion, ...versions.slice(0, 19)];
    setVersions(updatedVersions);

    onSave({
      type: "interactive",
      title: blockTitle,
      html: htmlCode,
      css: cssCode,
      javascript: jsCode,
      versions: updatedVersions,
      version: newVersion.version,
      themeMode,
      permissions
    });

    setSaveStatus("saved");
    onToast?.("Interactive block saved to page");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={`bg-[#0F1117] text-[#EDEBE5] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 font-sans ${isFullscreen ? "w-full h-full rounded-none" : "w-full max-w-[1280px] h-[92vh]"
          }`}
      >
        {/* Top App Header */}
        <header className="h-14 px-4 sm:px-6 bg-[#171A20] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-[var(--accent,#E3CFB3)] flex items-center justify-center text-[#0F1117] font-bold shadow-md shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={blockTitle}
                  onChange={(e) => {
                    setBlockTitle(e.target.value);
                    setSaveStatus("unsaved");
                  }}
                  className="font-bold text-sm bg-transparent border-none outline-none text-[#EDEBE5] focus:ring-1 focus:ring-[var(--accent,#E3CFB3)] rounded px-1.5 py-0.5 truncate max-w-[200px]"
                />
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--surface-3,#262A33)] text-[#E3CFB3] font-mono font-semibold border border-white/5">
                  Interactive Studio
                </span>
              </div>
            </div>
          </div>

          {/* Primary Top Nav Tabs */}
          <div className="flex items-center gap-1 bg-[#12141A] p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab("ai")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${activeTab === "ai"
                  ? "bg-[#262A33] text-[#EDEBE5] border border-white/10 shadow-xs"
                  : "text-[#9A9892] hover:text-[#EDEBE5]"
                }`}
            >
              <Sparkles size={13} className={activeTab === "ai" ? "text-[#E3CFB3]" : ""} />
              <span>Create with AI</span>
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${activeTab === "code"
                  ? "bg-[#262A33] text-[#EDEBE5] border border-white/10 shadow-xs"
                  : "text-[#9A9892] hover:text-[#EDEBE5]"
                }`}
            >
              <Code2 size={13} className={activeTab === "code" ? "text-[#E3CFB3]" : ""} />
              <span>Write Code</span>
            </button>
            <button
              onClick={() => setActiveTab("import")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${activeTab === "import"
                  ? "bg-[#262A33] text-[#EDEBE5] border border-white/10 shadow-xs"
                  : "text-[#9A9892] hover:text-[#EDEBE5]"
                }`}
            >
              <Upload size={13} className={activeTab === "import" ? "text-[#E3CFB3]" : ""} />
              <span>Import</span>
            </button>
          </div>

          {/* Action Header Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[#9A9892] hover:text-[#EDEBE5] transition cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={handleSaveBlock}
              className="px-4 py-1.5 rounded-xl bg-[var(--accent,#E3CFB3)] hover:bg-[var(--accent-light,#EDE0CC)] text-[#0F1117] font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Check size={14} />
              <span>Save & Insert</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[#9A9892] hover:text-[#EDEBE5] transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* =========================================================================
            TAB 1: CREATE WITH AI
           ========================================================================= */}
        {activeTab === "ai" && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="max-w-3xl mx-auto space-y-6 text-center">
              <div>
                <h3 className="text-2xl font-bold text-[#EDEBE5] tracking-tight">Create interactive block</h3>
                <p className="text-sm text-[#9A9892] mt-1">
                  Describe what you want or select a template to start instantly.
                </p>
              </div>

              {/* Prompt Composer */}
              <div className="relative rounded-2xl bg-[#171A20] border border-white/10 p-2 shadow-xl focus-within:border-[var(--accent,#E3CFB3)] focus-within:ring-1 focus-within:ring-[var(--accent,#E3CFB3)]/30 transition">
                <div className="flex items-center gap-2 px-2">
                  <Wand2 size={18} className="text-[#E3CFB3] shrink-0" />
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerateAI()}
                    placeholder="Describe what you want (e.g. attendance calculator, interactive project dashboard, quiz)..."
                    className="w-full bg-transparent text-sm text-[#EDEBE5] placeholder-[#6B6A66] outline-none py-2"
                  />
                  <button
                    onClick={handleGenerateAI}
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="px-4 py-2 rounded-xl bg-[var(--accent,#E3CFB3)] hover:bg-[var(--accent-light,#EDE0CC)] disabled:opacity-40 text-[#0F1117] font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95"
                  >
                    {isGenerating ? <RotateCcw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    <span>{isGenerating ? "Generating..." : "Generate"}</span>
                  </button>
                </div>

                {/* Example Quick Prompts */}
                <div className="flex items-center gap-2 pt-2 px-2 border-t border-white/5 overflow-x-auto text-[11px] text-[#9A9892]">
                  <span className="shrink-0 font-semibold text-[#6B6A66]">Examples:</span>
                  {[
                    "Create an interactive project dashboard with charts",
                    "Create a student attendance calculator",
                    "Create a responsive portfolio showcase",
                    "Create a quiz with scoring"
                  ].map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setAiPrompt(ex)}
                      className="px-2.5 py-0.5 rounded-full bg-white/5 hover:bg-white/10 text-[#EDEBE5] shrink-0 transition cursor-pointer border border-transparent hover:border-white/10"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* 15 Curated Template Cards */}
              <div className="text-left space-y-3 pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#9A9892] px-1">
                  Or Pick a Starter Template (15 Available)
                </div>
                <div className="grid grid-cols-3 max-[980px]:grid-cols-2 max-[640px]:grid-cols-1 gap-3.5">
                  {INTERACTIVE_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl)}
                      className="p-4 rounded-xl bg-[#171A20] hover:bg-[#1E2128] border border-white/10 hover:border-[var(--accent,#E3CFB3)]/40 transition-all text-left group flex flex-col justify-between gap-3 cursor-pointer shadow-sm"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shadow-xs border border-white/10"
                            style={{ backgroundColor: `${tpl.color}20`, color: tpl.color }}
                          >
                            ⚡
                          </span>
                          <span className="text-[10px] text-[#9A9892] group-hover:text-[#E3CFB3] flex items-center gap-0.5 transition">
                            Open <ArrowRight size={10} />
                          </span>
                        </div>
                        <div className="font-bold text-sm text-[#EDEBE5] group-hover:text-[#E3CFB3] transition">{tpl.name}</div>
                        <p className="text-xs text-[#9A9892] leading-relaxed line-clamp-2">{tpl.tagline}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: WRITE CODE MODE (Split Playground + Live Preview + Console)
           ========================================================================= */}
        {activeTab === "code" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Code Bar Controls */}
            <div className="h-10 px-4 bg-[#12141A] border-b border-white/10 flex items-center justify-between shrink-0">
              {/* Tabs: HTML, CSS, JS */}
              <div className="flex items-center gap-1">
                {[
                  { id: "html", label: "HTML", count: (htmlCode.match(/\n/g) || []).length + 1 },
                  { id: "css", label: "CSS", count: (cssCode.match(/\n/g) || []).length + 1 },
                  { id: "js", label: "JavaScript", count: (jsCode.match(/\n/g) || []).length + 1 }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setCodeSubTab(t.id as typeof codeSubTab)}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition cursor-pointer flex items-center gap-1.5 ${codeSubTab === t.id
                        ? "bg-[#1E2128] text-[#E3CFB3] border border-white/10 shadow-xs"
                        : "text-[#9A9892] hover:text-[#EDEBE5]"
                      }`}
                  >
                    <span>{t.label}</span>
                    <span className="text-[10px] opacity-60">({t.count})</span>
                  </button>
                ))}
              </div>

              {/* Viewport switcher */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-[#171A20] p-0.5 rounded-lg border border-white/5">
                  <button
                    onClick={() => setViewport("desktop")}
                    className={`p-1 rounded transition cursor-pointer ${viewport === "desktop" ? "bg-white/15 text-[#EDEBE5]" : "text-[#9A9892]"}`}
                    title="Desktop Preview"
                  >
                    <Monitor size={14} />
                  </button>
                  <button
                    onClick={() => setViewport("tablet")}
                    className={`p-1 rounded transition cursor-pointer ${viewport === "tablet" ? "bg-white/15 text-[#EDEBE5]" : "text-[#9A9892]"}`}
                    title="Tablet Preview (768px)"
                  >
                    <Tablet size={14} />
                  </button>
                  <button
                    onClick={() => setViewport("mobile")}
                    className={`p-1 rounded transition cursor-pointer ${viewport === "mobile" ? "bg-white/15 text-[#EDEBE5]" : "text-[#9A9892]"}`}
                    title="Mobile Preview (375px)"
                  >
                    <Smartphone size={14} />
                  </button>
                </div>

                <button
                  onClick={() => setAskAiOpen(!askAiOpen)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 border ${askAiOpen ? "bg-[#262A33] text-[#E3CFB3] border-[var(--accent,#E3CFB3)]" : "bg-white/5 border-white/10 text-[#EDEBE5] hover:bg-white/10"
                    }`}
                >
                  <Sparkles size={12} className="text-[#E3CFB3]" />
                  <span>Ask AI</span>
                </button>

                <button
                  onClick={handleRun}
                  className="px-2.5 py-1 rounded-lg bg-[var(--accent,#E3CFB3)] hover:bg-[var(--accent-light,#EDE0CC)] text-[#0F1117] text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs active:scale-95"
                >
                  <Play size={12} className="text-[#0F1117]" />
                  <span>Run</span>
                </button>
              </div>
            </div>

            {/* Split Grid: Left Editor + Right Sandboxed Live Preview */}
            <div className="flex-1 grid grid-cols-2 min-h-0 overflow-hidden divide-x divide-white/10 max-[768px]:grid-cols-1">
              {/* LEFT: Code Editor Pane */}
              <div className="flex flex-col min-h-0 bg-[#0B0D13] relative">
                {/* Textarea code editor with line numbers */}
                <div className="flex-1 flex min-h-0 overflow-auto font-mono text-[13px] leading-relaxed relative">
                  <textarea
                    value={codeSubTab === "html" ? htmlCode : codeSubTab === "css" ? cssCode : jsCode}
                    onChange={(e) => {
                      if (codeSubTab === "html") setHtmlCode(e.target.value);
                      else if (codeSubTab === "css") setCssCode(e.target.value);
                      else setJsCode(e.target.value);
                      setSaveStatus("unsaved");
                    }}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                        e.preventDefault();
                        handleSaveBlock();
                      }
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        handleRun();
                      }
                    }}
                    placeholder={`Enter ${codeSubTab.toUpperCase()} code here...`}
                    spellCheck={false}
                    className="flex-1 h-full w-full p-4 bg-transparent text-[#EDEBE5] outline-none resize-none font-mono selection:bg-[#E3CFB3]/25 leading-relaxed"
                  />
                </div>

                {/* AI Assistant Drawer inside Code Tab */}
                <AnimatePresence>
                  {askAiOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/10 bg-[#171A20] p-3 space-y-2 shrink-0 overflow-hidden"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-[#E3CFB3]">
                        <span className="flex items-center gap-1">
                          <Sparkles size={12} /> AI Code Copilot
                        </span>
                        <button onClick={() => setAskAiOpen(false)} className="text-[#9A9892] hover:text-[#EDEBE5]">
                          ✕
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={askAiPrompt}
                          onChange={(e) => setAskAiPrompt(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAskAiCode(askAiPrompt)}
                          placeholder="e.g. Add dark mode, make responsive, fix runtime bug..."
                          className="flex-1 bg-[#12141A] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-[#EDEBE5] outline-none focus:border-[var(--accent,#E3CFB3)]"
                        />
                        <button
                          onClick={() => handleAskAiCode(askAiPrompt)}
                          disabled={isDiffLoading || !askAiPrompt.trim()}
                          className="px-3 py-1 rounded-lg bg-[var(--accent,#E3CFB3)] hover:bg-[var(--accent-light,#EDE0CC)] disabled:opacity-40 text-[#0F1117] font-bold text-xs transition cursor-pointer"
                        >
                          {isDiffLoading ? "Thinking..." : "Modify"}
                        </button>
                      </div>

                      {/* Quick AI Action Pills */}
                      <div className="flex flex-wrap gap-1.5 text-[10.5px]">
                        {["Fix errors", "Make responsive", "Improve UI", "Add dark mode", "Optimize performance"].map(
                          (act) => (
                            <button
                              key={act}
                              onClick={() => {
                                setAskAiPrompt(act);
                                handleAskAiCode(act);
                              }}
                              className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-[#EDEBE5] transition cursor-pointer border border-transparent hover:border-white/10"
                            >
                              {act}
                            </button>
                          )
                        )}
                      </div>

                      {/* Diff proposal confirmation */}
                      {aiDiffProposal && (
                        <div className="p-2.5 rounded-xl bg-[#1E2128] border border-[var(--accent,#E3CFB3)]/40 text-xs space-y-2">
                          <div className="font-semibold text-[#E3CFB3]">{aiDiffProposal.explanation}</div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleApplyDiff}
                              className="px-2.5 py-1 rounded-lg bg-[var(--accent,#E3CFB3)] text-[#0F1117] font-bold text-xs hover:bg-[var(--accent-light,#EDE0CC)] transition cursor-pointer"
                            >
                              Apply Changes
                            </button>
                            <button
                              onClick={() => setAiDiffProposal(null)}
                              className="px-2 py-1 rounded-lg text-[#9A9892] hover:text-[#EDEBE5] text-xs transition cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* RIGHT: Live Sandboxed Preview */}
              <div className="flex flex-col min-h-0 bg-[#0F1117] items-center justify-center p-3 relative overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 shadow-2xl rounded-xl border border-white/10 overflow-hidden bg-[#0F1117] ${viewport === "mobile" ? "w-[375px]" : viewport === "tablet" ? "w-[768px]" : "w-full"
                    }`}
                >
                  <iframe
                    key={runtimeKey}
                    ref={iframeRef}
                    srcDoc={sandboxDoc}
                    sandbox="allow-scripts allow-forms allow-modals"
                    className="w-full h-full border-none"
                    title="Interactive Preview Sandbox"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Collapsible Console Drawer */}
            <div className="border-t border-white/10 bg-[#0F1117] shrink-0">
              <div
                onClick={() => setConsoleOpen(!consoleOpen)}
                className="h-7 px-4 flex items-center justify-between text-[11px] font-mono font-semibold text-[#9A9892] hover:text-[#EDEBE5] cursor-pointer select-none bg-[#12141A]"
              >
                <div className="flex items-center gap-2">
                  <Terminal size={12} className={hasRuntimeError ? "text-rose-400" : "text-[#E3CFB3]"} />
                  <span>Console ({consoleLogs.length})</span>
                  {hasRuntimeError && (
                    <span className="text-rose-400 font-bold bg-rose-500/20 px-1.5 py-0.5 rounded text-[10px]">
                      Error detected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConsoleLogs([]);
                      setHasRuntimeError(false);
                    }}
                    className="hover:text-rose-400 text-[10px]"
                  >
                    Clear
                  </button>
                  <span>{consoleOpen ? "▼" : "▲"}</span>
                </div>
              </div>

              {consoleOpen && (
                <div className="h-28 overflow-y-auto p-2 font-mono text-[11px] space-y-1 bg-[#090B10] scrollbar-thin">
                  {consoleLogs.length === 0 ? (
                    <div className="text-[#6B6A66] italic px-2 py-1">No console output</div>
                  ) : (
                    consoleLogs.map((log) => (
                      <div
                        key={log.id}
                        className={`px-2 py-0.5 rounded flex items-start gap-2 ${log.level === "error"
                            ? "bg-rose-950/30 text-rose-300"
                            : log.level === "warn"
                              ? "bg-amber-950/30 text-amber-300"
                              : "text-[#EDEBE5]"
                          }`}
                      >
                        <span className="opacity-40 select-none">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                        </span>
                        <span className="font-bold uppercase text-[9px] opacity-75">[{log.level}]</span>
                        <span className="flex-1 whitespace-pre-wrap">{log.text}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: IMPORT (HTML & ZIP)
           ========================================================================= */}
        {activeTab === "import" && (
          <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center">
            <div className="max-w-md w-full text-center space-y-4">
              <div className="p-8 rounded-2xl border-2 border-dashed border-white/20 hover:border-[var(--accent,#E3CFB3)] bg-[#171A20] transition cursor-pointer flex flex-col items-center gap-3 relative group">
                <input
                  type="file"
                  accept=".html,.htm,.zip"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="h-12 w-12 rounded-full bg-[var(--accent,#E3CFB3)]/15 text-[#E3CFB3] flex items-center justify-center group-hover:scale-105 transition">
                  <FolderArchive size={24} />
                </div>
                <div>
                  <div className="font-bold text-sm text-[#EDEBE5] group-hover:text-[#E3CFB3] transition">Upload HTML or ZIP project</div>
                  <p className="text-xs text-[#9A9892] mt-1">
                    Drag and drop or browse files. Multi-file ZIPs with index.html, CSS, and JS are automatically unzipped.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
