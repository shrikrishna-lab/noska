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
  Loader2, Clock
} from "lucide-react";
import { aiManager } from "../ai/AIManager";
import { getAgentList, getAgent } from "../ai/agents";
import { uid, now } from "../utils/helpers";
import { getAllRelations } from "../utils/pageLinks";
import { hasToolCalls, stripToolCalls, executeAllToolCalls } from "../ai/tools";
import { renderAIMarkdown } from "../utils/aiMarkdownRenderer";
import {
  classifyIntent,
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
import { capture } from "../lib/posthog";
import type { Page, AIChat } from "../lib/supabaseService";
import type { Block } from "../../types/blocks";

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
}

export default function AIRightPanel({
  open, onClose, page, pages, appView, pageMode, openPanePages = [],
  apiKey, aiProvider, nvidiaKey,
  aiChats = [], activeChatId, onChatsChange, onActiveChat, onNewChat,
  onSelectChat, onDeleteChat, onRenameChat, onPagePatch, onInsert,
  onAppend, onReplaceText, onToast, toolContext
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => subscribeApprovals((list) => setPendingApprovals(list)), []);

  const handleSend = useCallback(async (text: string) => {
    if (!text?.trim() || loading) return;
    const chatId = ensureActiveChat();
    const userMsg: AIChatMessage = { id: uid(), role: "user", content: text, createdAt: now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setPrompt("");
    setLoading(true);

    capture("ai_generation", { model: aiProvider, provider: aiProvider });
    setTokenEstimate(prev => prev + Math.ceil(text.length / 4));

    const chats = aiChats.map(c => c.id === chatId ? { ...c, messages: updatedMessages, updatedAt: now() } : c) as unknown as AIChat[];
    onChatsChange?.(chats);

    // ── Intelligent routing ──────────────────────────────────────────
    const intentResult = classifyIntent(text);

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
          getContext: () => ({ currentPage: toolContext.currentPage, pages: toolContext.pages, actions: toolContext.actions as unknown as Record<string, (...args: unknown[]) => unknown> }),
          onProgress: (steps, r) => {
            setActiveRunId(r.id);
            setActiveSteps(steps);
            setMessages(prev => prev.map(m => m.id === progressMsgId ? { ...m, runSteps: steps, runStatus: r.status as AIChatMessage["runStatus"], runId: r.id } : m));
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

      // ── Plain conversational Q&A (existing behavior preserved) ─────
      const startedAt = Date.now();
      const result = await aiManager.sendConversation({
        messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        page, pages,
      });
      const latencyMs = Date.now() - startedAt;

      let processedMessages = updatedMessages;

      if (hasToolCalls(result)) {
        const cleaned = stripToolCalls(result);
        if (cleaned?.trim()) {
          const toolMsg: AIChatMessage = { id: uid(), role: "assistant", content: cleaned, createdAt: now(), model: modelName, provider: providerName, latencyMs };
          processedMessages = [...processedMessages, toolMsg];
          setMessages(processedMessages);
        }
        const toolResults = await executeAllToolCalls(result, toolContext);
        const toolResultText = toolResults.map((r: { name: string; error?: string; result?: unknown }) => {
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
        const finalMsg: AIChatMessage = { id: uid(), role: "assistant", content: finalContent, createdAt: now(), model: modelName, provider: providerName, latencyMs };
        processedMessages = [...processedMessages, finalMsg];
      } else {
        const aiMsg: AIChatMessage = { id: uid(), role: "assistant", content: result, createdAt: now(), model: modelName, provider: providerName, latencyMs };
        processedMessages = [...processedMessages, aiMsg];
      }

      setTokenEstimate(prev => prev + Math.ceil(result.length / 4));

      setMessages(processedMessages);
      const finalChats = chats.map(c => c.id === chatId ? { ...c, messages: processedMessages, updatedAt: now() } : c) as unknown as AIChat[];
      onChatsChange?.(finalChats);    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : undefined;
      const friendly = message?.includes("not configured") || message?.includes("API key")
        ? "AI provider not configured. Add an API key in Settings → AI Providers."
        : message?.includes("fetch") || message?.includes("network") || message?.includes("Failed to fetch")
          ? "Network error. Check your internet connection and try again."
          : message?.includes("timeout") || message?.includes("timed out")
            ? "AI request timed out. Try again or use a different model."
            : `AI request failed. Please try again.`;
      const errMsg: AIChatMessage = { id: uid(), role: "assistant", content: friendly, createdAt: now(), model: modelName, provider: providerName };
      setMessages([...updatedMessages, errMsg]);
      onChatsChange?.(chats.map(c => c.id === chatId ? { ...c, messages: [...updatedMessages, errMsg], updatedAt: now() } : c) as unknown as AIChat[]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, aiChats, activeChatId, page, pages, appView, pageMode, apiKey, aiProvider, nvidiaKey, toolContext, onChatsChange, onActiveChat, ensureActiveChat]);

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
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setTargetLang(e.target.value)}
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
                {page && (
                  <>
                    <div className="text-[8px] font-semibold text-[var(--muted)] uppercase tracking-wider mt-2 mb-1">Turn this into…</div>
                    <div className="flex flex-wrap gap-1">
                      {WORKFLOW_ACTIONS.map((action) => (
                        <motion.button
                          key={action.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleQuickAction(action.id)}
                          title={`Turn "${page.title?.slice(0, 30) || "this page"}" into ${action.label.toLowerCase()}`}
                          className="flex items-center gap-1.5 rounded-md border border-[var(--warning)]/25 bg-[var(--warning)]/[0.05] hover:bg-[var(--warning)]/12 px-2 py-1 text-[10px] text-[var(--secondary)] hover:text-[var(--warning)] transition"
                        >
                          <action.icon size={9} className="shrink-0" />
                          {action.label}
                        </motion.button>
                      ))}
                    </div>
                  </>
                )}
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

                {/* Live agentic run progress */}
                {activeRunId && activeSteps.length > 0 && loading && (
                  <RunProgressBubble steps={activeSteps} />
                )}

                {proposalBusy && (
                  <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] mr-auto max-w-[90%]">
                    <Loader2 size={11} className="text-[var(--accent)] animate-spin" />
                    <span className="text-[10px] text-[var(--muted)]">Drafting proposal…</span>
                  </div>
                )}

                {/* Proposal cards — review before anything is created */}
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
                              onChange={(e: ChangeEvent<HTMLSelectElement>) => setTargetLang(e.target.value)}
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

            {/* ===== PENDING APPROVALS ===== */}
            {pendingApprovals.length > 0 && (
              <div className="shrink-0 border-t border-[var(--border)] bg-[var(--warning)]/5 px-3 py-2 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[9px] font-semibold text-[var(--warning)]">
                  <ShieldCheck size={10} />
                  Approval required ({pendingApprovals.length})
                </div>
                {pendingApprovals.map(apr => (
                  <div key={apr.id} className="rounded-lg bg-[var(--surface)] border border-[var(--border)] p-2">
                    <p className="text-[10px] text-[var(--text)] font-medium truncate">{apr.action}</p>
                    <p className="text-[9px] text-[var(--muted)] mt-0.5">{apr.reason}</p>
                    <div className="flex gap-1.5 mt-1.5">
                      <button
                        onClick={() => respondToApproval(apr.id, true)}
                        className="rounded-md bg-[var(--success)]/15 text-[var(--success)] hover:bg-[var(--success)]/25 px-2 py-1 text-[9px] font-semibold transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => respondToApproval(apr.id, false)}
                        className="rounded-md bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 px-2 py-1 text-[9px] font-semibold transition"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ===== CONTEXT PILLS ABOVE COMPOSER ===== */}
            <div className="shrink-0 px-3 pt-1.5 pb-0 flex items-center gap-1 flex-wrap border-t border-[var(--border)]">
              {page && (
                <span className="flex items-center gap-1 rounded-md bg-[var(--accent)]/8 px-1.5 py-0.5 text-[9px] font-medium text-[var(--accent)]">
                  <Globe size={8} />
                  {page.title?.slice(0, 18)}
                </span>
              )}
              {openPanePages.length > 0 && (
                <span className="flex items-center gap-1 rounded-md bg-[var(--surface-2)]/60 px-1.5 py-0.5 text-[8px] text-[var(--muted)]" title={openPanePages.map(p => p.title).join(", ")}>
                  <LayoutGrid size={7} />
                  +{openPanePages.length} open pane{openPanePages.length !== 1 ? "s" : ""}
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
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setPrompt(e.target.value)}
                      onKeyDown={(e: ReactKeyboardEvent<HTMLInputElement>) => {
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
                      className="flex items-center gap-1 rounded-md bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 px-1.5 py-1 text-[9px] font-medium transition"
                    >
                      <span className="w-1 h-1 rounded-full bg-[var(--danger)] animate-pulse" />
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
      case "awaiting_approval": return <Clock size={9} className="text-[var(--warning)] shrink-0" />;
      default: return <span className="w-[9px] h-[9px] rounded-full border border-[var(--border)] shrink-0" />;
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mr-auto max-w-[90%] rounded-lg bg-[var(--surface)] border border-[var(--border)] px-2.5 py-2"
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Bot size={10} className="text-[var(--accent)]" />
        <span className="text-[10px] font-semibold text-[var(--text)]">Working…</span>
      </div>
      <div className="space-y-1">
        {steps.map(s => (
          <div key={s.stepId} className="flex items-start gap-1.5">
            {iconFor(s.status)}
            <div className="min-w-0">
              <span className={`text-[10px] leading-tight ${s.status === "pending" ? "text-[var(--muted)]" : "text-[var(--text-secondary)]"}`}>
                {s.label}
              </span>
              {s.detail && s.status !== "done" && (
                <p className="text-[9px] text-[var(--muted)] truncate">{s.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mr-auto w-full max-w-full rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/[0.04] p-3"
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-[var(--accent)]/12 flex items-center justify-center">
          <Bot size={12} className="text-[var(--accent)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-[var(--text)] truncate">{proposal.name}</p>
          <p className="text-[9px] text-[var(--muted)]">Agent Ready · {describeTrigger(proposal.trigger)}</p>
        </div>
      </div>

      <p className="text-[10px] text-[var(--text-secondary)] mt-2 line-clamp-3">{proposal.description}</p>

      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-1 text-[9px] text-[var(--muted)]">
          <CheckCircle2 size={8} className="text-[var(--success)]" />
          Context: {proposal.contextScope.length > 0 ? proposal.contextScope.join(", ") : "Workspace"}
        </div>
        <div className="flex items-center gap-1 text-[9px] text-[var(--muted)]">
          <ShieldCheck size={8} className="text-[var(--success)]" />
          Creates & updates pages · Deletes need approval
        </div>
      </div>

      <details className="mt-2 group/proposal">
        <summary className="cursor-pointer text-[9px] text-[var(--muted)] hover:text-[var(--text-secondary)] select-none">
          Review instructions
        </summary>
        <p className="text-[9px] text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border)] rounded-md p-2 mt-1 whitespace-pre-wrap max-h-28 overflow-y-auto scrollbar-thin">
          {proposal.instructions}
        </p>
      </details>

      <div className="flex gap-1.5 mt-2.5">
        <button
          onClick={onCreate}
          disabled={busy}
          className="flex-1 rounded-lg bg-[var(--accent)] px-2 py-1.5 text-[10px] font-semibold text-white hover:bg-[var(--accent)]/90 disabled:opacity-50 transition"
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mr-auto w-full max-w-full rounded-xl border border-[var(--warning)]/25 bg-[var(--warning)]/[0.05] p-3"
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-[var(--warning)]/12 flex items-center justify-center">
          <Zap size={12} className="text-[var(--warning)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-[var(--text)] truncate">{proposal.name}</p>
          <p className="text-[9px] text-[var(--muted)]">Automation Ready · {describeTrigger(proposal.trigger)}</p>
        </div>
      </div>

      <div className="mt-2 space-y-0.5">
        {proposal.actions.map((a, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
            <CheckCircle2 size={8} className="text-[var(--success)] shrink-0" />
            {a.label}
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 mt-2.5">
        <button
          onClick={onCreate}
          disabled={busy}
          className="flex-1 rounded-lg bg-[var(--warning)] px-2 py-1.5 text-[10px] font-semibold text-white hover:bg-[var(--warning)]/90 disabled:opacity-50 transition"
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

  // Agentic run progress bubbles render as a step list, not markdown.
  if (!isUser && message.runSteps) {
    const finished = message.runStatus && message.runStatus !== "running";
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mr-auto max-w-[90%]"
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
          <RunProgressBubble steps={message.runSteps} />
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
          <div
            className="ai-md-container"
            dangerouslySetInnerHTML={{
              __html: message.html || renderAIMarkdown(message.text || message.content || "")
            }}
          />
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
              onClick={() => handleInsertBelow(message.text || message.content || "")}
              className="text-[8px] text-[var(--muted)] hover:text-[var(--text-secondary)] px-1 py-0.5 rounded hover:bg-[var(--hover)] transition"
            >
              Insert below
            </button>
            <button
              onClick={() => handleReplacePage(message.text || message.content || "")}
              className="text-[8px] text-[var(--muted)] hover:text-[var(--text-secondary)] px-1 py-0.5 rounded hover:bg-[var(--hover)] transition"
            >
              Replace
            </button>
            <button
              onClick={() => handleCopy(message.text || message.content || "")}
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
