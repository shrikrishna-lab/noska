import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  X, Sparkles, ChevronDown, BookOpen, PenLine, BarChart3,
  CheckSquare, Languages, Wand2, Table, Brain,
  FileText, ListTodo, Code2, Globe, Cpu, Settings2,
  Calendar, Inbox, LayoutDashboard, LayoutGrid, Hash, Users, Briefcase,
  Home, MessageSquare, History, RotateCcw, SlidersHorizontal,
  Plus, Link, Paperclip, Search, Mic, AtSign, Terminal,
  ChevronRight, Bot, Zap, ShieldCheck, CheckCircle2, XCircle,
  Loader2, Clock, ArrowUp, Check, ThumbsUp, ThumbsDown, Copy,
  ArrowDownToLine, Trash2, RefreshCw, Square, Volume2, VolumeX
} from "lucide-react";
import { aiManager } from "../ai/AIManager";
import { getAllProviders, getProvider } from "../ai/providers";
import { getAgentList, getAgent } from "../ai/agents";
import { uid, now, timeAgo } from "../utils/helpers";
import { getAllRelations } from "../utils/pageLinks";
import { hasToolCalls, stripToolCalls, executeAllToolCalls } from "../ai/tools";
import { matchNavigationCommand, viewLabel } from "../lib/viewTargets";
import { loadReminders, subscribeReminders } from "../lib/reminders";
import { renderAIMarkdown } from "../utils/aiMarkdownRenderer";
import {
  classifyIntent,
  classifyIntentSmart,
  isAgenticIntent,
  agentRuntime,
  proposeAgent,
  proposeAutomation,
  describeTrigger,
  respondToApproval,
  getPendingApprovals,
  subscribeApprovals,
} from "../ai/runtime";
import type { AgentProposal, AutomationProposal, ApprovalRequest, StepProgress } from "../ai/runtime";
import { saveAgent, blankAgent } from "../features/agents/agentStore";
import { saveAutomation, blankAutomation } from "../features/automations/automationStore";
import { refreshDefinitions } from "../intelligence/triggerService";
import { useStreamBuffer } from "./ai/useStreamBuffer";
import { capture } from "../lib/posthog";
import type { Page, AIChat } from "../lib/supabaseService";
import type { Block } from "../../types/blocks";
import { LiquidMetalButton } from "./ui/liquid-metal-button";

const SPRING = { type: "spring", stiffness: 400, damping: 28 } as const;
const SPRING_STIFF = { type: "spring", stiffness: 500, damping: 35 } as const;

const LANGUAGES = [
  "Spanish", "French", "German", "Italian", "Portuguese",
  "Japanese", "Korean", "Chinese", "Arabic", "Russian",
  "Dutch", "Polish", "Turkish", "Vietnamese", "Thai"
];

/** Shared shape for the AI_ACTIONS / QUICK_ACTIONS entries below — `icon`
 * is always a real lucide-react component here (unlike Sidebar.jsx's
 * NoskaNavItem, no inline zero-arg icon components are used in this
 * file), so a plain LucideIcon is accurate without needing the wider
 * union pattern PageTree.tsx uses for its mixed icon sets. */
interface AIActionDef {
  id: string;
  icon: LucideIcon;
  label: string;
  prompt?: string;
}

const AI_ACTIONS: AIActionDef[] = [
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

const QUICK_ACTIONS: AIActionDef[] = [
  { id: "summarize", icon: BookOpen, label: "Summarize" },
  { id: "translate", icon: Languages, label: "Translate" },
  { id: "rewrite", icon: PenLine, label: "Rewrite" },
  { id: "extract", icon: CheckSquare, label: "Extract Tasks" },
  { id: "continue", icon: MessageSquare, label: "Continue" },
  { id: "generate", icon: Sparkles, label: "Generate" },
  { id: "flashcards", icon: LayoutDashboard, label: "Flashcards" },
];

/** Intent-level power actions (#27/#38/#39) — these prefill requests that
 * route through the runtime's proposal flow or tool-capable steps. */
const WORKFLOW_ACTIONS: AIActionDef[] = [
  {
    id: "agentify",
    icon: Bot,
    label: "Agent",
    prompt: "Create an agent that regularly reviews \"{title}\" and keeps it up to date: check its todos, summarize progress, and flag anything stale.",
  },
  {
    id: "automate_this",
    icon: Zap,
    label: "Automation",
    prompt: "Every week, review \"{title}\" and create a summary of what changed.",
  },
  {
    id: "study_cards",
    icon: Brain,
    label: "Study cards",
    prompt: "Turn this page's key concepts into flashcard question-answer pairs as todo items.",
  },
  {
    id: "into_tasks",
    icon: ListTodo,
    label: "Tasks",
    prompt: "Extract every action item on this page into clear todo blocks with owners where identifiable.",
  },
  {
    id: "into_summary",
    icon: BookOpen,
    label: "Summary",
    prompt: "Add a concise summary section at the top of this page capturing its key points.",
  },
];

interface ViewMetaEntry {
  icon: LucideIcon;
  label: string;
}

const VIEW_META: Record<string, ViewMetaEntry> = {
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

/** Chat message shape actually produced/consumed here and in
 * ChatMessageBubble below — `text`/`html` are legacy/alternate fields
 * some older messages may carry (read via `message.text || message.content`
 * throughout), kept optional rather than assumed present since this file
 * never normalizes them away. `runSteps` marks a live agentic progress
 * bubble emitted by the shared runtime. */
interface AIChatMessage {
  id: string;
  role: string;
  content?: string;
  text?: string;
  html?: string;
  createdAt?: string;
  model?: string;
  provider?: string;
  latencyMs?: number;
  runId?: string;
  runSteps?: StepProgress[];
  runStatus?: "running" | "completed" | "failed" | "interrupted";
  /** Live model text streamed while the run is in progress. */
  liveText?: string;
}

/** Shape of `toolContext`, passed straight through to
 * `executeAllToolCalls` (src/ai/tools.ts) — mirrors the object literal
 * built by `toolContext` in src/App.tsx's `useMemo`. `actions` methods are
 * typed loosely (parameters that tools.ts passes positionally) since
 * tools.ts itself accepts them untyped (`context.actions.createPage(...)`
 * etc. with no shared interface declared there); redefining a stricter
 * shape here wouldn't be enforced on the producing side anyway. */
interface ToolContextActions {
  createPage: (title: string, icon?: string, content?: string, tags?: string) => string;
  openView: (view: string) => string;
  openPage: (pageId: string) => string;
  renamePage: (title: string) => void;
  appendBlocks: (blocks: Block[]) => void;
  setPageTags: (tags: unknown[]) => void;
  updateAnyPage: (id: string, patch: Partial<Page>) => void;
  replaceBlocks: (blocks: Block[]) => void;
  insertBlock: (index: number, block: Block) => void;
  deleteBlock: (blockId: string) => void;
  updateBlockById: (blockId: string, patch: Record<string, unknown>) => void;
  undo: () => void;
  redo: () => void;
}

interface ToolContextShape {
  currentPage: Page | undefined;
  pages: Page[];
  actions: ToolContextActions;
}

interface AIRightPanelProps {
  open: boolean;
  onClose: () => void;
  page: Page | undefined;
  pages: Page[];
  appView: string;
  pageMode: string;
  /** Pages open in other panes/tabs (split-view context) — surfaced to the
   * AI so "the other pane" is meaningful and agents can target them. */
  openPanePages?: Page[];
  apiKey: string;
  aiProvider: string;
  nvidiaKey: string;
  aiChats?: AIChat[];
  activeChatId: string | null;
  onChatsChange?: (chats: AIChat[]) => void;
  onActiveChat?: (chatId: string | null) => void;
  onNewChat?: (chatId?: string | null) => void;
  onSelectChat?: (chatId: string) => void;
  onDeleteChat?: (chatId: string) => void;
  onRenameChat?: (chatId: string, name: string) => void;
  onPagePatch?: (patch: Partial<Page>) => void;
  onInsert?: (blocks: Block[]) => void;
  onAppend?: (blocks: Block[]) => void;
  onReplaceText?: (text: string) => void;
  onToast?: (message: string) => void;
  toolContext: ToolContextShape;
  /** Locked (over-limit) workspace: sending is disabled, panel is read-only. */
  locked?: boolean;
  /** Spoken command handed off from the voice agent (unknown to the
   * deterministic parser) — auto-sent through the agentic pipeline. */
  seedPrompt?: string | null;
  onSeedConsumed?: () => void;
}

export default function AIRightPanel({
  open, onClose, page, pages, appView, pageMode, openPanePages = [],
  apiKey, aiProvider, nvidiaKey,
  aiChats = [], activeChatId, onChatsChange, onActiveChat, onNewChat,
  onSelectChat, onDeleteChat, onRenameChat, onPagePatch, onInsert,
  onAppend, onReplaceText, onToast, toolContext, seedPrompt, onSeedConsumed,
  locked = false
}: AIRightPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState("assistant");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [targetLang, setTargetLang] = useState("Spanish");
  const [tokenEstimate, setTokenEstimate] = useState(0);
  const [attachments, setAttachments] = useState<unknown[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

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
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [aiMode, setAiMode] = useState("Inspiration");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);

  const currentAgent = getAgent(activeAgent);
  const agents = getAgentList();
  const isConfigured = aiManager.isConfigured();
  const providerName = aiManager.getActiveProviderName();
  const modelName = aiManager.getActiveModelName();
  const activeModelId = aiManager.getActiveModel();
  const allProviders = useMemo(() => getAllProviders(), []);

  const filteredProviders = useMemo(() => {
    if (!modelSearch.trim()) return allProviders;
    const q = modelSearch.toLowerCase();
    return allProviders
      .map((prov) => {
        const matchesProv = prov.name.toLowerCase().includes(q) || prov.id.toLowerCase().includes(q);
        const matchingModels = prov.models.filter(
          (m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
        );
        if (matchesProv) return prov;
        if (matchingModels.length > 0) return { ...prov, models: matchingModels };
        return null;
      })
      .filter(Boolean) as typeof allProviders;
  }, [allProviders, modelSearch]);

  const handleSelectModel = (providerId: string, modelId: string) => {
    aiManager.setActiveProvider(providerId, modelId);
    setShowModelPicker(false);
    onToast?.(`Switched AI Model to ${modelId}`);
  };

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
        setMessages(chat.messages as AIChatMessage[]);
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
      const chat = { id: chatId, name: "New Chat", messages: [], createdAt: now(), updatedAt: now(), chatType: "private" } as unknown as AIChat;
      onChatsChange?.([...aiChats, chat]);
      onActiveChat?.(chatId);
    }
    return chatId;
  }, [activeChatId, aiChats, onChatsChange, onActiveChat]);

  /** Live agentic run state — progress bubble + proposal card. */
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeSteps, setActiveSteps] = useState<StepProgress[]>([]);
  const [agentProposal, setAgentProposal] = useState<AgentProposal | null>(null);
  const [automationProposal, setAutomationProposal] = useState<AutomationProposal | null>(null);
  const [proposalBusy, setProposalBusy] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  /** Draft answers for clarification requests (keyed by approval id). */
  const [clarifyDrafts, setClarifyDrafts] = useState<Record<string, string>>({});
  /** Spoken replies: final assistant messages are read aloud when enabled. */
  const [autoSpeak, setAutoSpeak] = useState(() => {
    try { return localStorage.getItem("noska_ai_autospeak") === "1"; } catch { return false; }
  });
  const spokenIdRef = useRef<string | null>(null);

  const toggleAutoSpeak = useCallback(() => {
    setAutoSpeak(prev => {
      const next = !prev;
      try { localStorage.setItem("noska_ai_autospeak", next ? "1" : "0"); } catch { /* ignore */ }
      if (!next && typeof window !== "undefined") window.speechSynthesis?.cancel();
      return next;
    });
  }, []);

  useEffect(() => {
    if (!autoSpeak || loading) return;
    const last = messages[messages.length - 1];
    const text = String(last?.content || "").trim();
    if (!last || last.role !== "assistant" || last.runSteps || !text || spokenIdRef.current === last.id) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    spokenIdRef.current = last.id;
    const speakable = text
      .replace(/```[\s\S]*?```/g, " Code block omitted. ")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)]*)\)/g, "$1")
      .replace(/[*_#>`~|]/g, " ")
      .replace(/\s{2,}/g, " ")
      .slice(0, 800);
    if (!speakable.trim()) return;
    const utterance = new SpeechSynthesisUtterance(speakable);
    utterance.rate = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [messages, autoSpeak, loading]);

  // Stop speaking when the panel closes or the component unmounts.
  useEffect(() => {
    if (!open && typeof window !== "undefined") window.speechSynthesis?.cancel();
    return () => { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); };
  }, [open]);

  // ── Proactive suggestions (conservative) ─────────────────────────────
  // Surface up to 3 starter prompts from live workspace state on a fresh
  // chat. They never auto-run — tapping one just sends the prompt.
  const [remindersTick, setRemindersTick] = useState(0);
  useEffect(() => subscribeReminders(() => setRemindersTick(t => t + 1)), []);
  const suggestions = useMemo(() => {
    void remindersTick;
    const out: string[] = [];
    try {
      const pending = loadReminders().filter(r => !r.dismissed);
      const today = new Date().toISOString().slice(0, 10);
      const dueToday = pending.filter(r => String(r.date || "").slice(0, 10) === today).length;
      if (dueToday > 0) out.push(`Catch me up on today (${dueToday} reminder${dueToday === 1 ? "" : "s"} due)`);
      else if (pending.length > 0) out.push("Catch me up on everything");
      const pages = toolContext.pages || [];
      const openTodos = pages.reduce((sum, p) => p.trashed ? sum : sum + (p.blocks || []).filter(b => b.type === "todo" && !b.checked).length, 0);
      if (openTodos >= 3) out.push(`What should I tackle first from my ${openTodos} open todos?`);
      const staleCount = pages.filter(p => !p.trashed && p.updatedAt && Date.now() - new Date(p.updatedAt).getTime() > 30 * 864e5).length;
      if (staleCount >= 3) out.push(`Review my ${staleCount} pages untouched for a month`);
    } catch { /* suggestions are best-effort */ }
    return out.slice(0, 3);
  }, [toolContext.pages, remindersTick]);

  useEffect(() => subscribeApprovals((list) => setPendingApprovals(list)), []);

  // ── Live streaming (rAF-batched) + stop support ───────────────────────
  const streamBuffer = useStreamBuffer();
  const abortRef = useRef<AbortController | null>(null);
  const streamingMsgIdRef = useRef<string | null>(null);
  useEffect(() => {
    streamBuffer.onFlush((accumulated) => {
      const targetId = streamingMsgIdRef.current;
      if (!targetId) return;
      setMessages(prev => prev.map(m => m.id === targetId ? { ...m, content: stripToolCalls(accumulated) } : m));
    });
  }, [streamBuffer]);

  const handleSend = useCallback(async (text: string) => {
    if (!text?.trim() || loading) return;
    if (lockedRef.current) {
      onToast?.("This workspace is locked and read-only — upgrade your plan to use AI. Import and export still work.");
      return;
    }
    const chatId = ensureActiveChat();
    const userMsg: AIChatMessage = { id: uid(), role: "user", content: text, createdAt: now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setPrompt("");
    setLoading(true);

    capture("ai_generation", { model: aiProvider, provider: aiProvider });
    setTokenEstimate(prev => prev + Math.ceil(text.length / 4));

    const existing = aiChats.find(c => c.id === chatId);
    const updatedChat: AIChat = existing
      ? { ...existing, messages: updatedMessages, updatedAt: now(), name: (existing.name === "New Chat" || !existing.name) ? text.slice(0, 36) : existing.name }
      : { id: chatId, name: text.slice(0, 36), messages: updatedMessages, createdAt: now(), updatedAt: now(), chatType: "private" } as unknown as AIChat;
    
    const chats = existing
      ? (aiChats.map(c => c.id === chatId ? updatedChat : c) as unknown as AIChat[])
      : ([...aiChats, updatedChat] as unknown as AIChat[]);
    onChatsChange?.(chats);

    // ── Deterministic navigation fast-path ("open inbox", "go to my tasks",
    // "open page X") — instant and free, never depends on the model emitting
    // a tool call. Only fires on clean navigation phrasings. ──
    const fastNav = matchNavigationCommand(text, toolContext.pages);
    if (fastNav) {
      let reply = "";
      if (fastNav.kind === "view") {
        toolContext.actions.openView?.(fastNav.view!);
        reply = `Opened **${viewLabel(fastNav.view!)}** for you.`;
      } else if (fastNav.pageId) {
        toolContext.actions.openPage?.(fastNav.pageId);
        reply = `Opened **${fastNav.pageTitle}**.`;
      }
      if (reply) {
        const navMsg: AIChatMessage = { id: uid(), role: "assistant", content: reply, createdAt: now() };
        const navMessages = [...updatedMessages, navMsg];
        setMessages(navMessages);
        onChatsChange?.(chats.map(c => c.id === chatId ? { ...c, messages: navMessages, updatedAt: now() } : c) as unknown as AIChat[]);
        return;
      }
    }

    // ── Intelligent routing (rules first, LLM refinement for ambiguous
    // multi-step asks) ───────────────────────────────────────────────────
    const intentResult = await classifyIntentSmart(text);

    try {
      if (intentResult.intent === "agent_intent" || intentResult.intent === "automation_intent") {
        // Propose — never silently create (product rule).
        setLoading(false);
        setProposalBusy(true);
        try {
          if (intentResult.intent === "agent_intent") {
            setAgentProposal(await proposeAgent(text));
          } else {
            setAutomationProposal(await proposeAutomation(text));
          }
        } finally {
          setProposalBusy(false);
        }
        const infoMsg: AIChatMessage = {
          id: uid(), role: "assistant", createdAt: now(),
          content: intentResult.intent === "agent_intent"
            ? "I've drafted an agent for you below — review it before creating."
            : "I've drafted an automation for you below — review it before creating.",
        };
        setMessages(prev => [...prev, infoMsg]);
        return;
      }

      if (isAgenticIntent(intentResult.intent) && aiManager.isConfigured()) {
        // ── Agentic execution with live progress ─────────────────────
        const progressMsgId = uid();
        const progressMsg: AIChatMessage = { id: progressMsgId, role: "assistant", createdAt: now(), runSteps: [], runStatus: "running", runId: "" };
        setMessages([...updatedMessages, progressMsg]);

        // Split-pane context (#36): tell the worker about other open panes
        // so "the page in the other pane" is actionable.
        const otherPanes = openPanePages.filter(p => p.id !== page?.id);
        const paneNote = otherPanes.length > 0
          ? `\n\nOther pages currently open in split panes: ${otherPanes.slice(0, 5).map(p => `"${p.title}"`).join(", ")}. If the user refers to another open page, work on that one.`
          : "";

        const run = await agentRuntime.execute({
          goal: text,
          sourceId: "noska-ai",
          sourceKind: "ai",
          trigger: "manual",
          instructions: paneNote || undefined,
          // Recent conversation so the agent resolves follow-ups ("now add a
          // todo to that page") against what was said before.
          history: updatedMessages.slice(0, -1).map(m => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: String(m.content || m.text || ""),
          })).filter(m => m.content.trim()).slice(-8),
          getContext: () => ({ currentPage: toolContext.currentPage, pages: toolContext.pages, actions: toolContext.actions as unknown as Record<string, (...args: unknown[]) => unknown> }),
          onProgress: (steps, r) => {
            setActiveRunId(r.id);
            setActiveSteps(steps);
            setMessages(prev => prev.map(m => m.id === progressMsgId ? { ...m, runSteps: steps, runStatus: r.status as AIChatMessage["runStatus"], runId: r.id } : m));
          },
          onLiveText: (chunk) => {
            setMessages(prev => prev.map(m => m.id === progressMsgId ? { ...m, liveText: chunk } : m));
          },
        });

        setActiveRunId(null);
        const finalContent = run.summary || (run.status === "completed" ? "Done." : "Something went wrong — see the steps above.");
        const finalMsg: AIChatMessage = { id: uid(), role: "assistant", content: finalContent, createdAt: now(), model: modelName, provider: providerName };
        let doneMessages = [...updatedMessages, progressMsg];
        // Replace the progress bubble's status; append summary message
        doneMessages = doneMessages.map(m => m.id === progressMsgId ? { ...m, runSteps: run.steps, runStatus: run.status as AIChatMessage["runStatus"] } : m);
        doneMessages = [...doneMessages, finalMsg];
        setMessages(doneMessages);
        onChatsChange?.(chats.map(c => c.id === chatId ? { ...c, messages: doneMessages, updatedAt: now() } : c) as unknown as AIChat[]);
        return;
      }

      // ── Plain conversational Q&A — streamed live with rAF batching ──
      const startedAt = Date.now();
      const assistantMeta = { model: modelName, provider: providerName, latencyMs: 0 };
      const aiMsgId = uid();
      const aiPlaceholder: AIChatMessage = { id: aiMsgId, role: "assistant", content: "", createdAt: now(), ...assistantMeta };
      setMessages([...updatedMessages, aiPlaceholder]);

      // Selection-aware context: whatever block the user has selected on the
      // page is appended to the API payload (not the stored chat message) as
      // the primary focus hint, without changing the visible chat history.
      const apiMessages: Array<{ role: string; content: string }> = updatedMessages.map(m => ({ role: m.role, content: m.content || m.text || "" }));
      const selectedBlock = page?.blocks?.find((b) => (b as unknown as { selected?: boolean }).selected);
      const selectedText = (selectedBlock as unknown as { text?: string } | undefined)?.text || "";
      if (selectedText.trim() && apiMessages.length > 0) {
        const last = apiMessages[apiMessages.length - 1];
        apiMessages[apiMessages.length - 1] = {
          ...last,
          content: `${last.content}\n\n[System] The user has selected this text on the page — treat it as the primary focus when relevant:\n"""\n${selectedText}\n"""`,
        };
      }

      const controller = new AbortController();
      abortRef.current = controller;
      streamingMsgIdRef.current = aiMsgId;
      streamBuffer.reset();

      let streamed = "";
      try {
        streamed = await aiManager.stream({
          messages: apiMessages,
          page, pages,
          agent: activeAgent,
          signal: controller.signal,
          onChunk: (partial) => streamBuffer.appendChunk(partial),
        });
      } finally {
        streamBuffer.flush();
        streamingMsgIdRef.current = null;
        abortRef.current = null;
      }
      const latencyMs = Date.now() - startedAt;
      setTokenEstimate(prev => prev + Math.ceil(streamed.length / 4));

      let processedMessages: AIChatMessage[] = [...updatedMessages];

      if (hasToolCalls(streamed)) {
        const cleaned = stripToolCalls(streamed);
        if (cleaned?.trim()) {
          const toolMsg: AIChatMessage = { id: uid(), role: "assistant", content: cleaned, createdAt: now(), ...assistantMeta, latencyMs };
          processedMessages = [...processedMessages, toolMsg];
          setMessages(processedMessages);
        }
        const toolResults = await executeAllToolCalls(streamed, toolContext);
        const toolResultText = toolResults.map((r: { name: string; error?: string; result?: unknown }) => {
          const success = r.error ? `Error: ${r.error}` : JSON.stringify(r.result, null, 2);
          return `Tool: ${r.name}\nResult: ${success}`;
        }).join("\n\n");

        // Follow-up synthesis — also streamed so users see progress immediately.
        const followUpId = uid();
        const followUpPlaceholder: AIChatMessage = { id: followUpId, role: "assistant", content: "", createdAt: now(), ...assistantMeta };
        setMessages(prev => [...prev.filter(m => m.id !== aiMsgId || cleaned?.trim()), followUpPlaceholder]);
        streamingMsgIdRef.current = followUpId;
        streamBuffer.reset();
        let followUp = "";
        try {
          followUp = await aiManager.stream({
            messages: [
              ...apiMessages,
              ...(cleaned?.trim() ? [{ role: "assistant", content: cleaned }] : []),
              { role: "user", content: `Tool execution results:\n${toolResultText}\n\nSummarize or continue based on these results.` },
            ],
            page, pages,
            agent: activeAgent,
            signal: controller.signal,
            onChunk: (partial) => streamBuffer.appendChunk(partial),
          });
        } finally {
          streamBuffer.flush();
          streamingMsgIdRef.current = null;
        }
        const finalContent = hasToolCalls(followUp) ? stripToolCalls(followUp) : followUp;
        processedMessages = [...processedMessages, { id: followUpId, role: "assistant", content: finalContent, createdAt: now(), ...assistantMeta, latencyMs }];
      } else {
        const aiMsg: AIChatMessage = { id: aiMsgId, role: "assistant", content: streamed, createdAt: now(), ...assistantMeta, latencyMs };
        processedMessages = [...processedMessages, aiMsg];
      }

      setMessages(processedMessages);
      const finalChats = chats.map(c => c.id === chatId ? { ...c, messages: processedMessages, updatedAt: now() } : c) as unknown as AIChat[];
      onChatsChange?.(finalChats);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : undefined;
      const stopped = message === "Generation stopped." || (err as { type?: string })?.type === "cancelled";
      const friendly = stopped
        ? "Generation stopped."
        : message?.includes("not configured") || message?.includes("API key")
          ? "AI provider not configured. Add an API key in Settings → AI Providers."
          : message?.includes("fetch") || message?.includes("network") || message?.includes("Failed to fetch")
            ? "Network error. Check your internet connection and try again."
            : message?.includes("timeout") || message?.includes("timed out")
              ? "AI request timed out. Try again or use a different model."
              : message || "AI request failed. Please try again.";
      const errMsg: AIChatMessage = { id: uid(), role: "assistant", content: friendly, createdAt: now(), model: modelName, provider: providerName };
      setMessages([...updatedMessages, errMsg]);
      onChatsChange?.(chats.map(c => c.id === chatId ? { ...c, messages: [...updatedMessages, errMsg], updatedAt: now() } : c) as unknown as AIChat[]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, aiChats, activeChatId, page, pages, appView, pageMode, activeAgent, openPanePages, apiKey, aiProvider, nvidiaKey, toolContext, onChatsChange, onActiveChat, ensureActiveChat, streamBuffer]);

  const handleStop = useCallback(() => {
    if (activeRunId) agentRuntime.abort(activeRunId);
    abortRef.current?.abort();
    abortRef.current = null;
  }, [activeRunId]);

  // ── Voice-agent handoff ───────────────────────────────────────────────
  // A spoken command the deterministic voice parser couldn't handle arrives
  // as seedPrompt and runs through the full agentic pipeline here.
  const consumedSeedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !seedPrompt || consumedSeedRef.current === seedPrompt) return;
    if (loading) return;
    consumedSeedRef.current = seedPrompt;
    onSeedConsumed?.();
    void handleSend(seedPrompt);
    // handleSend intentionally excluded: it changes every render; the seed
    // guard above ensures each seed fires exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seedPrompt, loading]);

  const handleQuickAction = useCallback((actionId: string) => {
    const action = AI_ACTIONS.find(a => a.id === actionId) || QUICK_ACTIONS.find(a => a.id === actionId) || WORKFLOW_ACTIONS.find(a => a.id === actionId);
    if (!action) return;
    const filled = action.prompt
      ? action.prompt.replace(/\{lang\}/g, targetLang).replace(/\{title\}/g, page?.title || "this page")
      : `/${action.label.toLowerCase()}`;
    // Workflow actions route into the proposal flow immediately.
    if (action.id === "agentify" || action.id === "automate_this") {
      void handleSend(filled);
      return;
    }
    setPrompt(filled);
    setTimeout(() => composerRef.current?.focus?.(), 50);
  }, [targetLang, page, handleSend]);

  const handleSwitchAgent = useCallback((agentId: string) => {
    setActiveAgent(agentId);
  }, []);

  const handleCreateAgentFromProposal = useCallback(async (proposal: AgentProposal) => {
    setProposalBusy(true);
    try {
      await saveAgent(blankAgent({
        name: proposal.name || "New Agent",
        description: proposal.description,
        icon: proposal.icon,
        instructions: proposal.instructions,
        trigger: proposal.trigger,
        contextScope: proposal.contextScope,
        permissions: proposal.permissions,
        status: "active",
      }));
      await refreshDefinitions();
      setAgentProposal(null);
      onToast?.(`Agent "${proposal.name}" created`);
      capture("agent_created_via_ai", { name: proposal.name });
    } catch {
      onToast?.("Couldn't create the agent — try again");
    } finally {
      setProposalBusy(false);
    }
  }, [onToast]);

  const handleCreateAutomationFromProposal = useCallback(async (proposal: AutomationProposal) => {
    setProposalBusy(true);
    try {
      await saveAutomation(blankAutomation({
        name: proposal.name || "New Automation",
        description: proposal.description,
        icon: proposal.icon,
        trigger: proposal.trigger,
        conditions: proposal.conditions ?? null,
        permissions: proposal.permissions,
        steps: proposal.actions.map(a => ({ id: uid(), label: a.label, kind: a.kind, instruction: a.instruction, toolName: a.toolName, toolParams: a.toolParams })),
        status: "active",
      }));
      await refreshDefinitions();
      setAutomationProposal(null);
      onToast?.(`Automation "${proposal.name}" created`);
      capture("automation_created_via_ai", { name: proposal.name });
    } catch {
      onToast?.("Couldn't create the automation — try again");
    } finally {
      setProposalBusy(false);
    }
  }, [onToast]);

  const hasMessages = messages.length > 0;
  const ViewIcon = currentView.icon;
  const chatHistory = useMemo(() => {
    return aiChats.filter(c => c.messages?.length > 0).sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  }, [aiChats]);

  const selectedText = page?.blocks?.find((b) => (b as unknown as { selected?: boolean }).selected)?.text || "";
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
            className="fixed inset-0 z-50 bg-[var(--bg)]/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%', opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.8 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="fixed top-0 right-0 z-50 h-full w-[410px] max-w-[92vw] bg-[var(--panel)] text-[var(--text)] border-l border-[var(--border)] shadow-[var(--shadow-floating)] flex flex-col font-sans select-none"
          >
            {/* ===== MINIMALIST THEMED HEADER ===== */}
            <div className="flex items-center justify-between px-3.5 py-3 border-b border-[var(--border)] shrink-0 bg-[var(--surface)]/40 backdrop-blur-md">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] shadow-2xs shrink-0">
                  <Sparkles size={12} />
                </div>
                <span className="text-[13px] font-semibold text-[var(--text)] tracking-tight shrink-0">Noska AI</span>
                
                {/* ── Interactive Model Picker Trigger ── */}
                <button
                  type="button"
                  onClick={() => setShowModelPicker(!showModelPicker)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--surface-2)]/70 hover:bg-[var(--hover)] border border-[var(--border)] text-[10px] font-mono text-[var(--text-secondary)] hover:text-[var(--text)] transition cursor-pointer truncate max-w-[140px]"
                  title="Select AI Model"
                >
                  <Cpu size={10} className="text-[var(--accent)] shrink-0" />
                  <span className="truncate">{modelName}</span>
                  <ChevronDown size={9} className="text-[var(--muted)] shrink-0" />
                </button>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    setPrompt("");
                  }}
                  className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition cursor-pointer"
                  title="New chat"
                >
                  <Plus size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    showHistory
                      ? "text-[var(--accent)] bg-[var(--accent)]/10"
                      : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]"
                  }`}
                  title="Chat history"
                >
                  <History size={14} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition cursor-pointer"
                  aria-label="Close AI panel"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* ===== MODEL SELECTOR POPOVER ===== */}
            <AnimatePresence>
              {showModelPicker && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b border-[var(--border)] bg-[var(--surface)] p-3.5 shrink-0 shadow-lg z-20 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text)] flex items-center gap-1.5">
                      <Cpu size={12} className="text-[var(--accent)]" />
                      Select AI Model
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowModelPicker(false)}
                      className="text-[11px] text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--surface-2)]/80 border border-[var(--border)] text-xs">
                    <Search size={11} className="text-[var(--muted)] shrink-0" />
                    <input
                      type="text"
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      placeholder="Search models (e.g. Llama, Claude, GPT)..."
                      className="flex-1 bg-transparent text-[11px] text-[var(--text)] outline-none border-none placeholder:text-[var(--muted)]"
                    />
                    {modelSearch && (
                      <button type="button" onClick={() => setModelSearch("")} className="text-[10px] text-[var(--muted)] hover:text-[var(--text)]">
                        <X size={10} />
                      </button>
                    )}
                  </div>

                  {/* Provider & Model Cards */}
                  <div className="max-h-60 overflow-y-auto space-y-2.5 scrollbar-thin pr-1">
                    {filteredProviders.map((prov) => (
                      <div key={prov.id} className="space-y-1.5">
                        <div className="text-[10.5px] font-semibold text-[var(--muted)] flex items-center gap-1.5 uppercase tracking-wide">
                          <span>{prov.name}</span>
                          {aiManager.getConfig().providers[prov.id]?.apiKey && (
                            <span className="text-[8.5px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold lowercase">configured</span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                          {prov.models.map((m) => {
                            const isSelected = activeModelId === m.id;
                            const isFast = /instant|mini|8b|haiku/i.test(m.id);
                            const isHighIQ = /70b|405b|opus|large/i.test(m.id);
                            const isReasoning = /r1|o1|reason/i.test(m.id);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => handleSelectModel(prov.id, m.id)}
                                className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-left transition cursor-pointer border ${
                                  isSelected
                                    ? 'bg-[var(--accent)]/12 border-[var(--accent)] text-[var(--text)] shadow-xs font-medium'
                                    : 'bg-[var(--surface-2)]/40 border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] hover:border-[var(--accent)]/40'
                                }`}
                              >
                                <div className="truncate flex-1 min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="truncate text-xs font-semibold text-[var(--text)]">{m.name}</span>
                                    {isReasoning && (
                                      <span className="text-[8.5px] px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 font-medium">Reasoning</span>
                                    )}
                                    {isHighIQ && (
                                      <span className="text-[8.5px] px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium">Flagship</span>
                                    )}
                                    {isFast && (
                                      <span className="text-[8.5px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">Fast ⚡</span>
                                    )}
                                  </div>
                                  <div className="text-[9.5px] text-[var(--muted)] truncate font-mono mt-0.5">{m.id}</div>
                                </div>
                                {isSelected ? (
                                  <div className="w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0">
                                    <Check size={11} strokeWidth={3} />
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 rounded-full border border-[var(--border)] shrink-0 opacity-40 hover:opacity-100" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {filteredProviders.length === 0 && (
                      <div className="py-6 text-center text-xs text-[var(--muted)]">
                        No models matching "{modelSearch}"
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ===== QUICK ACTIONS PILLS ===== */}
            <div className="px-3.5 py-2 border-b border-[var(--border)] shrink-0 bg-[var(--surface)]/20 overflow-x-auto scrollbar-none flex items-center gap-1.5">
              {QUICK_ACTIONS.slice(0, 5).map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleQuickAction(action.id)}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 px-2.5 py-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all cursor-pointer shrink-0 font-medium shadow-2xs"
                >
                  <action.icon size={11} className="text-[var(--accent)]" />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>

            {/* ===== SCROLLABLE CHAT FEED ===== */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto min-h-0 p-3.5 scrollbar-thin space-y-3 select-text relative"
            >
              {/* Clean Empty State */}
              {!hasMessages && !loading && (
                <div className="flex flex-col items-center justify-center py-12 text-center select-none">
                  <div className="relative mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] shadow-xs">
                      <Sparkles size={22} />
                    </div>
                  </div>
                  <h3 className="text-[14px] font-semibold text-[var(--text)] mb-1">
                    Ask Noska AI
                  </h3>
                  <p className="text-[11.5px] text-[var(--muted)] max-w-[240px] leading-relaxed mb-4">
                    {page
                      ? `Summarize, query, or edit "${page.title}"`
                      : "Draft, brainstorm, or explore your workspace"
                    }
                  </p>
                  {page && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-2)] text-[11px] text-[var(--text-secondary)] font-medium border border-[var(--border)]">
                      <Globe size={11} className="text-[var(--accent)]" />
                      <span className="truncate max-w-[180px]">{page.title}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Chat Messages */}
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

              {/* Live Run Progress */}
              {activeRunId && activeSteps.length > 0 && loading && (
                <RunProgressBubble steps={activeSteps} />
              )}

              {proposalBusy && (
                <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] mr-auto max-w-[90%]">
                  <Loader2 size={13} className="text-[var(--accent)] animate-spin" />
                  <span className="text-xs">Drafting proposal…</span>
                </div>
              )}

              {/* Proposal Cards */}
              {agentProposal && (
                <AgentProposalCardView
                  proposal={agentProposal}
                  busy={proposalBusy}
                  onCreate={() => handleCreateAgentFromProposal(agentProposal)}
                  onDismiss={() => setAgentProposal(null)}
                />
              )}
              {automationProposal && (
                <AutomationProposalCardView
                  proposal={automationProposal}
                  busy={proposalBusy}
                  onCreate={() => handleCreateAutomationFromProposal(automationProposal)}
                  onDismiss={() => setAutomationProposal(null)}
                />
              )}

              {loading && (
                <div className="flex items-center gap-2 py-2 px-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] mr-auto">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-[var(--muted)] font-medium">Noska AI is writing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ===== CHAT HISTORY DRAWER ===== */}
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-[var(--border)] bg-[var(--surface)] p-3.5 shrink-0 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
                      <History size={11} className="text-[var(--accent)]" />
                      Recent Conversations
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowHistory(false)}
                      className="text-[10px] text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
                    {currentHistory.map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => {
                          onSelectChat?.(chat.id);
                          setShowHistory(false);
                        }}
                        className={`group/chat flex items-center justify-between w-full p-2 rounded-xl text-left transition cursor-pointer border ${
                          chat.id === activeChatId
                            ? 'bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)] font-medium shadow-2xs'
                            : 'bg-[var(--surface-2)]/30 border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-6 h-6 rounded-lg bg-[var(--surface-2)] flex items-center justify-center shrink-0 text-[var(--muted)]">
                            <MessageSquare size={11} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium text-[var(--text)]">
                              {chat.name || 'Untitled conversation'}
                            </div>
                            <div className="text-[9.5px] text-[var(--muted)]">
                              {timeAgo(chat.updatedAt)} • {chat.messages?.length || 0} messages
                            </div>
                          </div>
                        </div>

                        {onDeleteChat && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteChat(chat.id);
                            }}
                            className="opacity-0 group-hover/chat:opacity-100 p-1 rounded-md text-[var(--muted)] hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer shrink-0 ml-1.5"
                            title="Delete conversation"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                    {currentHistory.length === 0 && (
                      <div className="py-5 text-center text-xs text-[var(--muted)]">
                        No previous chats saved
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ===== PENDING APPROVALS ===== */}
            {pendingApprovals.length > 0 && (
              <div className="shrink-0 border-t border-[var(--border)] bg-[var(--warning)]/10 px-3.5 py-2 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--warning)]">
                  <ShieldCheck size={13} />
                  {pendingApprovals.some(a => a.category === "clarify")
                    ? `Agent needs your input (${pendingApprovals.length})`
                    : `Approval Required (${pendingApprovals.length})`}
                </div>
                {pendingApprovals.map((apr) => (
                  <div key={apr.id} className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-2.5 shadow-xs">
                    {apr.category === "clarify" ? (
                      // Clarification: the agent paused to ask a question —
                      // answer inline and the run continues.
                      <>
                        <p className="text-xs text-[var(--text)] font-medium">{apr.action}</p>
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            value={clarifyDrafts[apr.id] || ""}
                            onChange={(e) => setClarifyDrafts(prev => ({ ...prev, [apr.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (clarifyDrafts[apr.id] || "").trim()) {
                                respondToApproval(apr.id, true, (clarifyDrafts[apr.id] || "").trim());
                                setClarifyDrafts(prev => { const next = { ...prev }; delete next[apr.id]; return next; });
                              }
                            }}
                            placeholder="Type your answer…"
                            className="flex-1 min-w-0 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const answer = (clarifyDrafts[apr.id] || "").trim();
                              if (!answer) return;
                              respondToApproval(apr.id, true, answer);
                              setClarifyDrafts(prev => { const next = { ...prev }; delete next[apr.id]; return next; });
                            }}
                            className="rounded-lg bg-[var(--accent)] text-white hover:opacity-90 px-3 py-1 text-xs font-semibold transition cursor-pointer"
                          >
                            Answer
                          </button>
                          <button
                            type="button"
                            onClick={() => respondToApproval(apr.id, false)}
                            className="rounded-lg bg-[var(--surface-2)] hover:bg-[var(--hover)] text-[var(--text)] px-3 py-1 text-xs font-semibold transition cursor-pointer border border-[var(--border)]"
                          >
                            Skip
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-[var(--text)] font-medium truncate">{apr.action}</p>
                        <p className="text-[11px] text-[var(--muted)] mt-0.5">{apr.reason}</p>
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => respondToApproval(apr.id, true)}
                            className="rounded-lg bg-[var(--success)] text-white hover:opacity-90 px-3 py-1 text-xs font-semibold transition cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => respondToApproval(apr.id, false)}
                            className="rounded-lg bg-[var(--surface-2)] hover:bg-[var(--hover)] text-[var(--text)] px-3 py-1 text-xs font-semibold transition cursor-pointer border border-[var(--border)]"
                          >
                            Decline
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ===== PROACTIVE SUGGESTIONS (fresh chats only) ===== */}
            {messages.length === 0 && suggestions.length > 0 && (
              <div className="shrink-0 px-3.5 pb-2 flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSend(s)}
                    title={s}
                    className="max-w-full truncate rounded-full bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] px-3 py-1 text-[11px] text-[var(--muted)] hover:text-[var(--text)] transition cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* ===== SLEEK THEMED COMPOSER (BOTTOM) ===== */}
            <div className="shrink-0 p-3.5 border-t border-[var(--border)] bg-[var(--surface)]/40 backdrop-blur-md">
              <div className={`rounded-2xl border transition-all duration-200 bg-[var(--surface)] shadow-xs ${
                prompt ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/15' : 'border-[var(--border)]'
              }`}>
                <div className="flex items-center gap-2 px-3.5 py-2.5">
                  <input
                    ref={composerRef}
                    type="text"
                    value={prompt}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPrompt(e.target.value)}
                    onKeyDown={(e: ReactKeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(prompt);
                      }
                    }}
                    placeholder="Ask Noska AI anything..."
                    style={{ outline: "none", border: "none", boxShadow: "none", background: "transparent" }}
                    className="flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none border-none ring-0 placeholder:text-[var(--muted)]"
                  />

                  <button
                    type="button"
                    onClick={toggleAutoSpeak}
                    title={autoSpeak ? "Spoken replies on — click to mute" : "Replies are muted — click to hear them spoken"}
                    className={`p-1.5 rounded-lg transition cursor-pointer shrink-0 ${autoSpeak
                      ? "text-[var(--accent)] bg-[var(--accent)]/10"
                      : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]"}`}
                  >
                    {autoSpeak ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  </button>

                  {loading ? (
                    <LiquidMetalButton
                      viewMode="icon"
                      size="sm"
                      onClick={handleStop}
                      icon={<Square size={9} fill="currentColor" className="text-white" />}
                      title="Stop generating"
                    />
                  ) : (
                    <LiquidMetalButton
                      viewMode="icon"
                      size="sm"
                      disabled={!prompt.trim()}
                      onClick={() => handleSend(prompt)}
                      icon={
                        <ArrowUp
                          size={13}
                          strokeWidth={2.5}
                          className={prompt.trim() ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" : "text-white/40"}
                        />
                      }
                      title="Send prompt (Enter)"
                    />
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

interface ChatMessageBubbleProps {
  message: AIChatMessage;
  index: number;
  total: number;
  page: Page | undefined;
  onInsert?: (blocks: Block[]) => void;
  onReplaceText?: (text: string) => void;
  onToast?: (message: string) => void;
}

/** Live progress for agentic runs — concise steps, never chain-of-thought. */
function RunProgressBubble({ steps }: { steps: StepProgress[] }) {
  const iconFor = (status: StepProgress["status"]) => {
    switch (status) {
      case "done": return <CheckCircle2 size={9} className="text-[var(--success)] shrink-0" />;
      case "running": return <Loader2 size={9} className="text-[var(--accent)] animate-spin shrink-0" />;
      case "failed": return <XCircle size={9} className="text-[var(--danger)] shrink-0" />;
      default: return <Clock size={9} className="text-[var(--muted)] shrink-0" />;
    }
  };

  return (
    <div className="rounded-lg bg-[var(--surface)] border border-[var(--border)] px-2.5 py-2 space-y-1">
      <div className="text-[9px] font-semibold text-[var(--muted)] uppercase tracking-wider">Working on your request…</div>
      <div className="space-y-0.5">
        {steps.map((step) => (
          <div key={step.stepId} className="flex items-center gap-1.5 text-[10px] text-[var(--text)]">
            {iconFor(step.status)}
            <span className="truncate">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** "Agent Ready" review card — nothing is created until the user confirms. */
function AgentProposalCardView({ proposal, busy, onCreate, onDismiss }: {
  proposal: AgentProposal;
  busy: boolean;
  onCreate: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/[0.04] p-3 text-[11px] shadow-sm mr-auto max-w-[92%]"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{proposal.icon || "🤖"}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[var(--text)] truncate">{proposal.name}</div>
          <div className="text-[9px] text-[var(--muted)]">Ready to create agent</div>
        </div>
      </div>
      <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed mb-2 line-clamp-3">{proposal.description}</p>
      <div className="mb-2 space-y-1">
        <div className="text-[9px] text-[var(--text-secondary)] flex items-center gap-1">
          <Clock size={8} className="text-[var(--accent)] shrink-0" />
          When: {describeTrigger(proposal.trigger)}
        </div>
      </div>
      <div className="flex gap-1.5 mt-2.5">
        <button
          onClick={onCreate}
          disabled={busy}
          className="flex-1 rounded-lg bg-[var(--accent)] px-2 py-1.5 text-[10px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
        >
          Create Agent
        </button>
        <button
          onClick={onDismiss}
          className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-[10px] font-medium text-[var(--muted)] hover:text-[var(--text)] transition"
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  );
}

/** "Automation Ready" review card. */
function AutomationProposalCardView({ proposal, busy, onCreate, onDismiss }: {
  proposal: AutomationProposal;
  busy: boolean;
  onCreate: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/[0.04] p-3 text-[11px] shadow-sm mr-auto max-w-[92%]"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">⚡</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[var(--text)] truncate">{proposal.name}</div>
          <div className="text-[9px] text-[var(--muted)]">Ready to create automation</div>
        </div>
      </div>
      <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed mb-2 line-clamp-2">{proposal.description}</p>
      <div className="mb-2 space-y-1">
        <div className="text-[9px] text-[var(--text-secondary)] flex items-center gap-1">
          <Clock size={8} className="text-[var(--warning)] shrink-0" />
          When: {describeTrigger(proposal.trigger)}
        </div>
        {proposal.actions.map((a, idx) => (
          <div key={idx} className="text-[9px] text-[var(--text-secondary)] flex items-center gap-1">
            <CheckCircle2 size={8} className="text-[var(--success)] shrink-0" />
            {a.label}
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-2.5">
        <button
          onClick={onCreate}
          disabled={busy}
          className="flex-1 rounded-lg bg-[var(--warning)] px-2 py-1.5 text-[10px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
        >
          Create Automation
        </button>
        <button
          onClick={onDismiss}
          className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-[10px] font-medium text-[var(--muted)] hover:text-[var(--text)] transition"
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  );
}

function ChatMessageBubble({ message, index, total, page, onInsert, onReplaceText, onToast }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';
  const isFirstAi = index === 0 && !isUser;
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState<'up' | 'down' | null>(null);

  // Agentic run progress bubbles render as a step list, not markdown.
  if (!isUser && message.runSteps) {
    const finished = message.runStatus && message.runStatus !== "running";
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mr-auto max-w-[90%]"
        data-message-id={message.id}
      >
        {finished ? (
          <details className="group/run rounded-lg bg-[var(--surface)] border border-[var(--border)] px-2.5 py-2">
            <summary className="cursor-pointer select-none flex items-center gap-1.5 text-[10px] font-semibold text-[var(--text)]">
              {message.runStatus === "completed"
                ? <CheckCircle2 size={10} className="text-[var(--success)]" />
                : <XCircle size={10} className="text-[var(--danger)]" />}
              {message.runStatus === "completed" ? "Completed" : "Finished with issues"}
              <span className="text-[8px] text-[var(--muted)] font-normal group-open/run:hidden">— show steps</span>
            </summary>
            <div className="mt-2">
              <RunProgressBubble steps={message.runSteps} />
            </div>
          </details>
        ) : (
          <>
            <RunProgressBubble steps={message.runSteps} />
            {message.liveText?.trim() && (
              <div className="mt-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] px-2.5 py-2 text-[11px] leading-relaxed text-[var(--muted)] max-h-28 overflow-hidden">
                {message.liveText.trim()}
              </div>
            )}
          </>
        )}
      </motion.div>
    );
  }

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => onToast?.('Copied to clipboard')).catch(() => {});
  }, [onToast]);

  const handleInsertBelow = useCallback((text: string) => {
    const blocks = text.split('\n').filter(Boolean).map(t => ({ id: uid(), type: 'text', text: t })) as unknown as Block[];
    onInsert?.(blocks);
    onToast?.('Inserted below current blocks');
  }, [onInsert, onToast]);

  const handleReplacePage = useCallback((text: string) => {
    onReplaceText?.(text);
    onToast?.('Page content replaced');
  }, [onReplaceText, onToast]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28, delay: index === total - 1 ? 0.03 : 0 }}
      className={`group relative ${isUser ? 'ml-auto' : 'mr-auto'} max-w-[90%]`}
      data-message-id={message.id}
    >
      <div className={`rounded-xl px-3 py-2 text-[11.5px] leading-relaxed ${
        isUser
          ? 'bg-[var(--accent)] text-white shadow-xs'
          : 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] shadow-2xs'
      }`}>
        {/* AI icon */}
        {!isUser && !isFirstAi && (
          <div className="absolute -left-5 top-2 w-3.5 h-3.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center">
            <span className="text-[6px]">✦</span>
          </div>
        )}

        {/* Content */}
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.text || message.content}</span>
        ) : (
          <div
            className="ai-md-container"
            dangerouslySetInnerHTML={{
              __html: message.html || renderAIMarkdown(message.text || message.content || "")
            }}
          />
        )}

        {/* Reactions + Actions Bar */}
        {!isUser && (message.text || message.content) && message.text !== '...' && message.content !== '...' && (
          <div className="mt-2 pt-1.5 border-t border-[var(--border)]/60 flex items-center gap-1.5 transition-opacity">
            <div className="flex items-center gap-0.5 bg-[var(--surface-2)]/60 p-0.5 rounded-md border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setReaction(reaction === 'up' ? null : 'up')}
                className={`p-1 rounded text-[10px] transition cursor-pointer ${
                  reaction === 'up'
                    ? 'text-[var(--accent)] bg-[var(--accent)]/15 font-semibold'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
                }`}
                title="Good response"
              >
                <ThumbsUp size={10} />
              </button>
              <button
                type="button"
                onClick={() => setReaction(reaction === 'down' ? null : 'down')}
                className={`p-1 rounded text-[10px] transition cursor-pointer ${
                  reaction === 'down'
                    ? 'text-[var(--danger)] bg-[var(--danger)]/15 font-semibold'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
                }`}
                title="Poor response"
              >
                <ThumbsDown size={10} />
              </button>
            </div>

            <div className="flex-1" />

            <button
              type="button"
              onClick={() => {
                handleCopy(message.text || message.content || "");
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-2)]/50 hover:bg-[var(--hover)] border border-[var(--border)] transition cursor-pointer font-medium"
              title="Copy markdown"
            >
              {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleInsertBelow(message.text || message.content || "")}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-2)]/50 hover:bg-[var(--hover)] border border-[var(--border)] transition cursor-pointer font-medium"
              title="Insert below active block"
            >
              <ArrowDownToLine size={10} />
              <span>Insert</span>
            </button>

            <button
              type="button"
              onClick={() => handleReplacePage(message.text || message.content || "")}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-2)]/50 hover:bg-[var(--hover)] border border-[var(--border)] transition cursor-pointer font-medium"
              title="Replace page text"
            >
              <RefreshCw size={10} />
              <span>Replace</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
