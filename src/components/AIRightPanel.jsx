import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Sparkles, ChevronDown, BookOpen, PenLine, BarChart3,
  CheckSquare, Languages, Wand2, Table, Brain,
  FileText, ListTodo, Code2, Globe, Cpu, Settings2,
  Calendar, Inbox, LayoutDashboard, LayoutGrid, Hash, Users, Briefcase,
  Home, MessageSquare, History, RotateCcw, SlidersHorizontal,
  Plus, Link, Paperclip, Search, Mic, AtSign, Terminal,
  ChevronRight
} from "lucide-react";
import { aiManager } from "../ai/AIManager";
import { getAgentList, getAgent } from "../ai/agents";
import { uid, now } from "../utils/helpers";
import { getAllRelations } from "../utils/pageLinks";
import { hasToolCalls, stripToolCalls, executeAllToolCalls } from "../ai/tools";

const SPRING = { type: "spring", stiffness: 400, damping: 28 };
const SPRING_STIFF = { type: "spring", stiffness: 500, damping: 35 };

const LANGUAGES = [
  "Spanish", "French", "German", "Italian", "Portuguese",
  "Japanese", "Korean", "Chinese", "Arabic", "Russian",
  "Dutch", "Polish", "Turkish", "Vietnamese", "Thai"
];

const AI_ACTIONS = [
  { id: "summarize", icon: BookOpen, label: "Summarize", prompt: "Summarize this page in 3 concise bullet points" },
  { id: "rewrite", icon: PenLine, label: "Rewrite", prompt: "Rewrite this page to be clearer and more concise" },
  { id: "translate", icon: Languages, label: "Translate", prompt: "Translate this page to {lang}. Keep the structure." },
  { id: "analyze", icon: BarChart3, label: "Analyze", prompt: "Analyze this page and give 5 key insights" },
  { id: "extract", icon: CheckSquare, label: "Extract Tasks", prompt: "Extract all action items and tasks from this page" },
  { id: "improve", icon: Wand2, label: "Improve Writing", prompt: "Improve the writing quality of this page" },
  { id: "table", icon: Table, label: "Generate Table", prompt: "Create a structured table from the content on this page" },
  { id: "database", icon: LayoutDashboard, label: "Database", prompt: "Convert this page content into a database" },
  { id: "explain", icon: Brain, label: "Explain", prompt: "Explain the content of this page in simple terms" },
  { id: "grammar", icon: FileText, label: "Fix Grammar", prompt: "Fix any grammar and spelling issues on this page" },
  { id: "outline", icon: ListTodo, label: "Outline", prompt: "Create a structured outline with sections and subsections" },
  { id: "docs", icon: Code2, label: "Documentation", prompt: "Generate API documentation from this content" }
];

const QUICK_ACTIONS = [
  { id: "summarize", icon: BookOpen, label: "Summarize" },
  { id: "translate", icon: Languages, label: "Translate" },
  { id: "rewrite", icon: PenLine, label: "Rewrite" },
  { id: "extract", icon: CheckSquare, label: "Extract Tasks" },
  { id: "continue", icon: MessageSquare, label: "Continue" },
  { id: "generate", icon: Sparkles, label: "Generate" },
  { id: "flashcards", icon: LayoutDashboard, label: "Flashcards" },
];

const VIEW_META = {
  page: { icon: Globe, label: "Page" },
  home: { icon: Home, label: "Home" },
  calendar: { icon: Calendar, label: "Calendar" },
  inbox: { icon: Inbox, label: "Inbox" },
  canvas: { icon: LayoutDashboard, label: "Canvas" },
  graph: { icon: LayoutGrid, label: "Graph" },
  chats: { icon: Hash, label: "Chats" },
  shared: { icon: Users, label: "Shared" },
  meetings: { icon: Briefcase, label: "Meetings" },
};

export default function AIRightPanel({
  open, onClose, page, pages, appView, pageMode,
  apiKey, aiProvider, nvidiaKey,
  aiChats = [], activeChatId, onChatsChange, onActiveChat, onNewChat,
  onSelectChat, onDeleteChat, onRenameChat, onPagePatch, onInsert,
  onAppend, onReplaceText, onToast, toolContext
}) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState("assistant");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [targetLang, setTargetLang] = useState("Spanish");
  const [tokenEstimate, setTokenEstimate] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const pageId = page?.id;
  const relations = useMemo(() => {
    if (!pageId) return { backlinks: [], outgoing: [] };
    return getAllRelations(pageId, pages);
  }, [pageId, pages]);
  const linkedPages = useMemo(() => {
    const seen = new Set();
    return [...relations.backlinks, ...relations.outgoing].filter(l => {
      if (seen.has(l.pageId)) return false;
      seen.add(l.pageId);
      return true;
    });
  }, [relations]);
  const [showHistory, setShowHistory] = useState(false);

  const messagesEndRef = useRef(null);
  const composerRef = useRef(null);

  const currentAgent = getAgent(activeAgent);
  const agents = getAgentList();
  const isConfigured = aiManager.isConfigured();
  const providerName = aiManager.getActiveProviderName();
  const modelName = aiManager.getActiveModelName();

  const currentView = useMemo(() => {
    const effectiveView = pageMode === "canvas" ? "canvas" : pageMode === "graph" ? "graph" : appView;
    return VIEW_META[effectiveView] || { icon: Globe, label: "Workspace" };
  }, [appView, pageMode]);

  const contextLabel = useMemo(() => {
    if (page && (appView === "page" || appView === undefined)) {
      return page.title || "Untitled";
    }
    return currentView.label;
  }, [page, appView, currentView]);

  useEffect(() => {
    if (activeChatId) {
      const chat = aiChats.find(c => c.id === activeChatId);
      if (chat?.messages?.length) {
        setMessages(chat.messages);
      }
    } else {
      setMessages([]);
    }
  }, [activeChatId, open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const ensureActiveChat = useCallback(() => {
    let chatId = activeChatId;
    if (!chatId) {
      chatId = uid();
      const chat = { id: chatId, name: "New Chat", messages: [], createdAt: now(), updatedAt: now(), chatType: "private" };
      onChatsChange?.([...aiChats, chat]);
      onActiveChat?.(chatId);
    }
    return chatId;
  }, [activeChatId, aiChats, onChatsChange, onActiveChat]);

  const handleSend = useCallback(async (text) => {
    if (!text?.trim() || loading) return;
    const chatId = ensureActiveChat();
    const userMsg = { id: uid(), role: "user", content: text, createdAt: now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setPrompt("");
    setLoading(true);

    setTokenEstimate(prev => prev + Math.ceil(text.length / 4));

    const chats = aiChats.map(c => c.id === chatId ? { ...c, messages: updatedMessages, updatedAt: now() } : c);
    onChatsChange?.(chats);

    try {
      const result = await aiManager.sendConversation({
        messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        page, pages,
      });

      let processedMessages = updatedMessages;

      if (hasToolCalls(result)) {
        const cleaned = stripToolCalls(result);
        if (cleaned?.trim()) {
          const toolMsg = { id: uid(), role: "assistant", content: cleaned, createdAt: now() };
          processedMessages = [...processedMessages, toolMsg];
          setMessages(processedMessages);
        }
        const toolResults = await executeAllToolCalls(result, toolContext);
        const toolResultText = toolResults.map(r => {
          const success = r.error ? `Error: ${r.error}` : JSON.stringify(r.result, null, 2);
          return `Tool: ${r.name}\nResult: ${success}`;
        }).join("\n\n");
        const followUp = await aiManager.sendConversation({
          messages: [
            ...processedMessages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: `Tool execution results:\n${toolResultText}\n\nSummarize or continue based on these results.` }
          ],
          page, pages,
        });
        const finalContent = hasToolCalls(followUp) ? stripToolCalls(followUp) : followUp;
        const finalMsg = { id: uid(), role: "assistant", content: finalContent, createdAt: now() };
        processedMessages = [...processedMessages, finalMsg];
      } else {
        const aiMsg = { id: uid(), role: "assistant", content: result, createdAt: now() };
        processedMessages = [...processedMessages, aiMsg];
      }

      setTokenEstimate(prev => prev + Math.ceil(result.length / 4));

      setMessages(processedMessages);
      const finalChats = chats.map(c => c.id === chatId ? { ...c, messages: processedMessages, updatedAt: now() } : c);
      onChatsChange?.(finalChats);
    } catch (err) {
      const friendly = err?.message?.includes("not configured") || err?.message?.includes("API key")
        ? "AI provider not configured. Add an API key in Settings → AI Providers."
        : err?.message?.includes("fetch") || err?.message?.includes("network") || err?.message?.includes("Failed to fetch")
          ? "Network error. Check your internet connection and try again."
          : err?.message?.includes("timeout") || err?.message?.includes("timed out")
            ? "AI request timed out. Try again or use a different model."
            : `AI request failed. Please try again.`;
      const errMsg = { id: uid(), role: "assistant", content: friendly, createdAt: now() };
      setMessages([...updatedMessages, errMsg]);
      onChatsChange?.(chats.map(c => c.id === chatId ? { ...c, messages: [...updatedMessages, errMsg], updatedAt: now() } : c));
    } finally {
      setLoading(false);
    }
  }, [loading, messages, aiChats, activeChatId, page, pages, appView, pageMode, apiKey, aiProvider, nvidiaKey, toolContext, onChatsChange, onActiveChat, ensureActiveChat]);

  const handleQuickAction = useCallback((actionId) => {
    const action = AI_ACTIONS.find(a => a.id === actionId) || QUICK_ACTIONS.find(a => a.id === actionId);
    if (!action) return;
    const filled = action.prompt ? action.prompt.replace(/\{lang\}/g, targetLang) : `/${action.label.toLowerCase()}`;
    setPrompt(filled);
    setTimeout(() => composerRef.current?.focus?.(), 50);
  }, [targetLang]);

  const handleSwitchAgent = useCallback((agentId) => {
    setActiveAgent(agentId);
  }, []);

  const hasMessages = messages.length > 0;
  const ViewIcon = currentView.icon;
  const chatHistory = useMemo(() => {
    return aiChats.filter(c => c.messages?.length > 0).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [aiChats]);

  const selectedText = page?.blocks?.find(b => b.selected)?.text || "";
  const currentHistory = chatHistory.slice(0, 5);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-50 bg-black/15 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-0 right-0 z-50 h-full w-[380px] max-w-[90vw] bg-[var(--panel)] border-l border-[var(--border)] shadow-[var(--shadow-floating)] flex flex-col"
          >
            {/* ===== HEADER ===== */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)] shrink-0">
              <div className="w-5 h-5 rounded-md bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                <Sparkles size={10} className="text-[var(--accent)]" />
              </div>
              <span className="text-[12px] font-semibold text-[var(--text)] flex-1 tracking-tight">AI</span>
              <div className="flex items-center gap-1">
                {isConfigured && (
                  <span className="text-[9px] text-[var(--muted)] bg-[var(--surface-2)]/60 px-1.5 py-0.5 rounded font-mono truncate max-w-[90px]">
                    {modelName}
                  </span>
                )}
                <span className="flex items-center gap-0.5 rounded-md bg-[var(--surface-2)]/60 px-1.5 py-0.5 text-[8px] text-[var(--muted)] font-mono">
                  <kbd className="leading-none">&#8984;K</kbd>
                </span>
                <button
                  onClick={onClose}
                  className="p-1 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition"
                  aria-label="Close AI panel"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* ===== PROVIDER · MODEL · HISTORY · MODES ===== */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)] shrink-0 min-h-[30px] bg-[var(--surface-2)]/30">
              <span className="flex items-center gap-1 text-[9px] text-[var(--muted)]">
                <Cpu size={8} />
                <span className="capitalize">{providerName}</span>
              </span>
              <span className="text-[8px] text-[var(--border)]">·</span>
              <span className="text-[9px] text-[var(--muted)] truncate max-w-[80px]">{modelName}</span>
              <span className="text-[8px] text-[var(--border)]">·</span>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center gap-1 text-[9px] transition ${showHistory ? 'text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--text-secondary)]'}`}
              >
                <History size={8} />
                History
              </button>
              <div className="flex-1" />
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="bg-transparent text-[9px] text-[var(--muted)] outline-none cursor-pointer hover:text-[var(--text-secondary)] transition"
                aria-label="Target language"
              >
                {LANGUAGES.slice(0, 5).map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            {/* ===== SCROLLABLE BODY ===== */}
            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
              {/* ===== QUICK ACTIONS ===== */}
              <div className="px-3 py-2.5 border-b border-[var(--border)]">
                <div className="flex flex-wrap gap-1">
                  {QUICK_ACTIONS.map((action) => (
                    <motion.button
                      key={action.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleQuickAction(action.id)}
                      className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)]/40 hover:bg-[var(--accent)]/8 hover:border-[var(--accent)]/20 px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent)] transition"
                    >
                      <action.icon size={9} className="shrink-0" />
                      {action.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* ===== CONTEXT INFO ===== */}
              <div className="px-3 py-2 border-b border-[var(--border)] space-y-1.5">
                <div className="flex items-center gap-2 text-[9px]">
                  <Globe size={9} className="text-[var(--accent)] shrink-0" />
                  <span className="text-[var(--text-secondary)] font-medium">Current page</span>
                  <span className="text-[var(--muted)] truncate">{page?.title || contextLabel}</span>
                </div>
                {selectedText && (
                  <div className="flex items-start gap-2 text-[9px]">
                    <PenLine size={9} className="text-[var(--muted)] shrink-0 mt-0.5" />
                    <span className="text-[var(--muted)] line-clamp-1">{selectedText}</span>
                  </div>
                )}
                {attachments.length > 0 && (
                  <div className="flex items-center gap-2 text-[9px]">
                    <Paperclip size={9} className="text-[var(--muted)] shrink-0" />
                    <span className="text-[var(--muted)]">{attachments.length} attachment{attachments.length > 1 ? 's' : ''}</span>
                  </div>
                )}
                {linkedPages.length > 0 && (
                  <div className="flex items-center gap-2 text-[9px]">
                    <Link size={9} className="text-[var(--muted)] shrink-0" />
                    <span className="text-[var(--muted)]">{linkedPages.length} linked page{linkedPages.length > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              {/* ===== CONVERSATION ===== */}
              <div className="px-3 py-2 space-y-1.5 min-h-[80px]">
                {!hasMessages && !loading && (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/6 flex items-center justify-center mb-2">
                      <Sparkles size={14} className="text-[var(--accent)]" />
                    </div>
                    <p className="text-[11px] font-medium text-[var(--text)] mb-0.5">Ask anything</p>
                    <p className="text-[9px] text-[var(--muted)] max-w-[200px] leading-relaxed">
                      {page
                        ? `Ask about "${page.title}" or give general instructions`
                        : "Write, search, edit pages, or analyze your workspace"
                      }
                    </p>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <ChatMessageBubble
                    key={msg.id}
                    message={msg}
                    index={i}
                    total={messages.length}
                    page={page}
                    onInsert={onInsert}
                    onReplaceText={onReplaceText}
                    onToast={onToast}
                  />
                ))}

                {loading && (
                  <div className="flex items-center gap-2 py-1 px-1">
                    <div className="flex gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce" style={{animationDelay: '0ms'}} />
                      <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce" style={{animationDelay: '100ms'}} />
                      <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce" style={{animationDelay: '200ms'}} />
                    </div>
                    <span className="text-[9px] text-[var(--muted)]">{currentAgent.name} is thinking...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* ===== AI ACTIONS ===== */}
              <div className="border-t border-[var(--border)]">
                <button
                  onClick={() => setActionsOpen(!actionsOpen)}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-medium text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)] transition"
                  aria-expanded={actionsOpen}
                >
                  <Sparkles size={8} className="text-[var(--accent)]" />
                  <span>AI Actions</span>
                  <span className="text-[8px] text-[var(--muted)] ml-0.5">({AI_ACTIONS.length})</span>
                  <motion.div
                    animate={{ rotate: actionsOpen ? 180 : 0 }}
                    transition={SPRING}
                    className="ml-auto"
                  >
                    <ChevronDown size={9} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {actionsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-1 px-3 pb-2.5">
                        {AI_ACTIONS.map((action, i) => (
                          <motion.button
                            key={action.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.08, delay: i * 0.015 }}
                            whileHover={{ scale: 1.01, backgroundColor: "var(--hover)" }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleQuickAction(action.id)}
                            className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)]/20 hover:border-[var(--accent)]/15 px-2 py-1.5 text-left transition"
                          >
                            <action.icon size={8} className="text-[var(--accent)] shrink-0" />
                            <span className="text-[9px] text-[var(--text-secondary)] truncate">{action.label}</span>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ===== ADVANCED ===== */}
              <div className="border-t border-[var(--border)]">
                <button
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-medium text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)] transition"
                  aria-expanded={advancedOpen}
                >
                  <Settings2 size={8} className="text-[var(--muted)]" />
                  <span>Advanced</span>
                  <motion.div
                    animate={{ rotate: advancedOpen ? 180 : 0 }}
                    transition={SPRING}
                    className="ml-auto"
                  >
                    <ChevronDown size={9} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {advancedOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-2.5 space-y-2">
                        {/* Agent */}
                        <div>
                          <label className="text-[7px] font-semibold text-[var(--muted)] block mb-1 uppercase tracking-widest">Agent</label>
                          <div className="flex flex-wrap gap-1">
                            {agents.map((a) => (
                              <button
                                key={a.id}
                                onClick={() => handleSwitchAgent(a.id)}
                                className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] transition ${
                                  activeAgent === a.id
                                    ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                                    : 'bg-[var(--surface)]/30 text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--hover)]'
                                }`}
                              >
                                <span>{a.icon}</span>
                                <span>{a.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Provider + Model */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[7px] font-semibold text-[var(--muted)] block mb-1 uppercase tracking-widest">Provider</label>
                            <div className="flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface)]/30 px-1.5 py-1">
                              <Cpu size={7} className="text-[var(--muted)] shrink-0" />
                              <span className="text-[9px] text-[var(--text-secondary)] capitalize truncate">{providerName}</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[7px] font-semibold text-[var(--muted)] block mb-1 uppercase tracking-widest">Model</label>
                            <div className="flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface)]/30 px-1.5 py-1">
                              <span className="text-[9px] text-[var(--text-secondary)] truncate" title={modelName}>{modelName}</span>
                            </div>
                          </div>
                        </div>

                        {/* Language */}
                        <div>
                          <label className="text-[7px] font-semibold text-[var(--muted)] block mb-1 uppercase tracking-widest">Target Language</label>
                          <div className="flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface)]/30 px-1.5 py-1">
                            <Languages size={7} className="text-[var(--muted)] shrink-0" />
                            <select
                              value={targetLang}
                              onChange={(e) => setTargetLang(e.target.value)}
                              className="flex-1 bg-transparent text-[9px] text-[var(--text-secondary)] outline-none appearance-none cursor-pointer"
                            >
                              {LANGUAGES.map((lang) => (
                                <option key={lang} value={lang}>{lang}</option>
                              ))}
                            </select>
                            <ChevronDown size={7} className="text-[var(--muted)] pointer-events-none" />
                          </div>
                        </div>

                        {/* Usage */}
                        <div>
                          <label className="text-[7px] font-semibold text-[var(--muted)] block mb-1 uppercase tracking-widest">Usage</label>
                          <div className="flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface)]/30 px-1.5 py-1">
                            <span className="text-[9px] text-[var(--text-secondary)]">
                              {tokenEstimate > 0 ? `~${tokenEstimate.toLocaleString()} tokens` : 'No activity yet'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ===== CHAT HISTORY ===== */}
              {showHistory && currentHistory.length > 0 && (
                <div className="border-t border-[var(--border)]">
                  <div className="px-3 py-2 space-y-1">
                    <div className="text-[8px] font-semibold text-[var(--muted)] uppercase tracking-wider px-1">Recent conversations</div>
                    {currentHistory.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => { onSelectChat?.(chat.id); setShowHistory(false); }}
                        className={`w-full flex items-center gap-2 rounded px-1.5 py-1 text-left transition text-[9px] hover:bg-[var(--hover)] ${
                          chat.id === activeChatId ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        <MessageSquare size={8} className="shrink-0" />
                        <span className="truncate flex-1">{chat.name || 'Untitled'}</span>
                        <span className="text-[8px] text-[var(--muted)] shrink-0">{chat.messages?.length || 0} msgs</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Spacer for composer */}
              <div className="h-2" />
            </div>

            {/* ===== CONTEXT PILLS ABOVE COMPOSER ===== */}
            <div className="shrink-0 px-3 pt-1.5 pb-0 flex items-center gap-1 flex-wrap border-t border-[var(--border)]">
              {page && (
                <span className="flex items-center gap-1 rounded-md bg-[var(--accent)]/8 px-1.5 py-0.5 text-[9px] font-medium text-[var(--accent)]">
                  <Globe size={8} />
                  {page.title?.slice(0, 18)}
                </span>
              )}
              {currentAgent && (
                <span className="flex items-center gap-1 rounded-md bg-[var(--surface-2)]/60 px-1.5 py-0.5 text-[9px] text-[var(--text-secondary)]">
                  <Sparkles size={8} />
                  {currentAgent.name}
                </span>
              )}
              {isConfigured && (
                <span className="flex items-center gap-1 rounded-md bg-[var(--surface-2)]/60 px-1.5 py-0.5 text-[8px] text-[var(--muted)] font-mono">
                  {modelName}
                </span>
              )}
              <span className="flex items-center gap-1 rounded-md bg-[var(--surface-2)]/60 px-1.5 py-0.5 text-[8px] text-[var(--muted)]">
                <Cpu size={7} />
                {providerName}
              </span>
            </div>

            {/* ===== COMPACT COMPOSER ===== */}
            <div className="shrink-0 px-3 pb-2.5 pt-1.5">
              <div className={`rounded-lg border transition-all duration-200 bg-[var(--surface)] ${
                prompt ? 'border-[var(--accent)]/20 shadow-[0_0_0_1px_var(--accent-alpha)]' : 'border-[var(--border)]'
              }`}>
                <div className="flex items-end gap-1 px-2 py-1">
                  <div className="flex items-center gap-0.5">
                    <button className="p-1 rounded text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)] transition" title="Attach">
                      <Plus size={10} />
                    </button>
                    <button className="p-1 rounded text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)] transition" title="Search">
                      <Search size={10} />
                    </button>
                    <button className="p-1 rounded text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)] transition" title="Voice input">
                      <Mic size={10} />
                    </button>
                    <button className="p-1 rounded text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)] transition" title="Mention">
                      <AtSign size={10} />
                    </button>
                    <button className="p-1 rounded text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)] transition" title="Commands">
                      <Terminal size={10} />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      ref={composerRef}
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend(prompt);
                        }
                      }}
                      placeholder="Ask anything..."
                      className="w-full bg-transparent text-[11px] text-[var(--text)] outline-none placeholder:text-[var(--muted)] px-1 py-1"
                    />
                  </div>
                  {loading ? (
                    <button
                      onClick={() => {}}
                      className="flex items-center gap-1 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 px-1.5 py-1 text-[9px] font-medium transition"
                    >
                      <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />
                    </button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSend(prompt)}
                      disabled={!prompt.trim()}
                      className="flex items-center gap-1 rounded-md bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-25 px-1.5 py-1 text-[9px] font-medium transition"
                    >
                      Send
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ChatMessageBubble({ message, index, total, page, onInsert, onReplaceText, onToast }) {
  const isUser = message.role === 'user';
  const isFirstAi = index === 0 && !isUser;

  const handleCopy = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => onToast?.('Copied to clipboard')).catch(() => {});
  }, [onToast]);

  const handleInsertBelow = useCallback((text) => {
    const blocks = text.split('\n').filter(Boolean).map(t => ({ id: uid(), type: 'text', text: t }));
    onInsert?.(blocks);
    onToast?.('Inserted below current blocks');
  }, [onInsert, onToast]);

  const handleReplacePage = useCallback((text) => {
    onReplaceText?.(text);
    onToast?.('Page content replaced');
  }, [onReplaceText, onToast]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28, delay: index === total - 1 ? 0.03 : 0 }}
      className={`group relative ${isUser ? 'ml-auto' : 'mr-auto'} max-w-[90%]`}
    >
      <div className={`rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed ${
        isUser
          ? 'bg-[var(--accent)] text-white shadow-sm'
          : 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)]'
      }`}>
        {/* AI icon */}
        {!isUser && !isFirstAi && (
          <div className="absolute -left-5 top-1.5 w-3.5 h-3.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center">
            <span className="text-[6px]">✦</span>
          </div>
        )}

        {/* Content */}
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.text || message.content}</span>
        ) : (
          <div className="ai-md-container" dangerouslySetInnerHTML={{ __html: message.html || message.text || message.content }} />
        )}

        {/* Reactions + Actions */}
        {!isUser && (message.text || message.content) && message.text !== '...' && message.content !== '...' && (
          <div className="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {['👍', '👎', '⭐'].map(r => (
              <button
                key={r}
                className="grid h-3.5 w-3.5 place-items-center rounded text-[8px] text-[var(--muted)] hover:bg-[var(--hover)] transition"
              >
                {r}
              </button>
            ))}
            <span className="w-px h-2.5 bg-[var(--border)] mx-0.5" />
            <button
              onClick={() => handleInsertBelow(message.text || message.content)}
              className="text-[8px] text-[var(--muted)] hover:text-[var(--text-secondary)] px-1 py-0.5 rounded hover:bg-[var(--hover)] transition"
            >
              Insert below
            </button>
            <button
              onClick={() => handleReplacePage(message.text || message.content)}
              className="text-[8px] text-[var(--muted)] hover:text-[var(--text-secondary)] px-1 py-0.5 rounded hover:bg-[var(--hover)] transition"
            >
              Replace
            </button>
            <button
              onClick={() => handleCopy(message.text || message.content)}
              className="text-[8px] text-[var(--muted)] hover:text-[var(--text-secondary)] px-1 py-0.5 rounded hover:bg-[var(--hover)] transition"
            >
              Copy
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
