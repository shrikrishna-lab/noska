import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  X, Loader2, PanelLeftClose, PanelLeft, PanelRightOpen, PanelRightClose,
  Key, Zap, MessageSquarePlus, Check, ExternalLink, Settings2
} from "lucide-react";
import { aiManager } from "../ai/AIManager";
import { getAgentList, getAgent, buildAgentPrompt } from "../ai/agents";
import { buildContext } from "../ai/ContextBuilder";
import { textToBlocks, uid, now } from "../utils/helpers";
import { hasToolCalls, stripToolCalls, executeAllToolCalls } from "../ai/tools";
import { realtimeCollab } from "../lib/realtimeCollab";
import { auditEngine } from "../lib/auditEngine";
import { capture } from "../lib/posthog";
import { getAllProviders, testProviderConnection } from "../ai/providers";
import type { Page, AIChat } from "../lib/supabaseService";
import type { Block } from "../../types/blocks";

import ChatSidebar from "./ai/ChatSidebar";
import OnboardingSuggestions from "./ai/OnboardingSuggestions";
import PromptComposer from "./ai/PromptComposer";
import ContextPanel from "./ai/ContextPanel";
import CollabAura from "./ai/CollabAura";
import ChatMessage from "./ai/ChatMessage";
import type { AiModelSelection } from "./ui/ai-prompt-input";

interface ChatPanelMessage {
  role: string;
  text: string;
  html?: string;
  reactions?: string[];
  model?: string;
  provider?: string;
  latencyMs?: number;
}

interface ToolCallResult {
  name: string;
  ok: boolean;
  result?: { count?: number; [key: string]: unknown };
  error?: string;
  params: Record<string, unknown>;
}

interface AIPanelProps {
  open: boolean;
  onClose: () => void;
  page: Page;
  pages: Page[];
  apiKey?: string;
  aiProvider?: string;
  nvidiaKey?: string;
  aiChats?: AIChat[];
  activeChatId?: string | null;
  onChatsChange?: (next: AIChat[] | ((prev: AIChat[]) => AIChat[])) => void;
  onActiveChat?: (id: string | null) => void;
  onNewChat?: () => void;
  onSelectChat?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
  onRenameChat?: (id: string, name: string) => void;
  onPagePatch?: (patch: Record<string, unknown>) => void;
  onInsert?: (blocks: Block[]) => void;
  onAppend?: (blocks: Block[]) => void;
  onReplaceText?: (text: string) => void;
  onToast?: (message: string) => void;
  toolContext?: unknown;
}

export default function AIPanel({
  open,
  onClose,
  page,
  pages = [],
  aiChats = [],
  activeChatId,
  onChatsChange,
  onActiveChat,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onAppend,
  onReplaceText,
  onToast,
  toolContext
}: AIPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatPanelMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [executingTools, setExecutingTools] = useState(false);
  const [toolResults, setToolResults] = useState<ToolCallResult[]>([]);
  const [activeAgent, setActiveAgent] = useState("assistant");
  const [showSidebar, setShowSidebar] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keyProvider, setKeyProvider] = useState("openrouter");
  const [testingKey, setTestingKey] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName: string }>>([]);
  const [auditEvents, setAuditEvents] = useState<unknown[]>([]);
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const [presenceUsers, setPresenceUsers] = useState<unknown[]>([]);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [chatFilter, setChatFilter] = useState("all");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentAgent = getAgent(activeAgent);
  const agents = getAgentList();
  const providerName = aiManager.getActiveProviderName();
  const modelName = aiManager.getActiveModelName();
  const isConfigured = aiManager.isConfigured();
  const providers = getAllProviders();

  // Sync active chat messages
  useEffect(() => {
    if (activeChatId) {
      const chat = aiChats.find((c) => c.id === activeChatId);
      if (chat?.messages?.length) {
        setMessages(chat.messages as ChatPanelMessage[]);
      } else {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [activeChatId, open]);

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  // Load audit events
  useEffect(() => {
    if (!page?.id) return;
    auditEngine.getPageAudit(page.id, { limit: 20 }).then(setAuditEvents).catch(() => {});
  }, [page?.id]);

  // Typing indicator listener
  useEffect(() => {
    if (!page?.id || !realtimeCollab.isJoined()) return;
    const unsub = realtimeCollab.on("typing", ({ pageId, userId, userName }) => {
      if (pageId !== page?.id) return;
      setTypingUsers((prev) => {
        if (prev.some((u) => u.userId === userId)) return prev;
        return [...prev, { userId, userName: userName as string }];
      });
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
      }, 3000);
    });
    return unsub;
  }, [page?.id]);

  // Presence listener
  useEffect(() => {
    if (!page?.id || !realtimeCollab.isJoined()) return;
    const unsubs = [
      realtimeCollab.on("presence:sync", ({ users }) => setPresenceUsers(users)),
      realtimeCollab.on("presence:join", ({ user }) =>
        setPresenceUsers((prev) =>
          prev.some((u) => (u as { id?: string }).id === user.id) ? prev : [...prev, user]
        )
      ),
      realtimeCollab.on("presence:leave", ({ userId }) =>
        setPresenceUsers((prev) =>
          prev.filter(
            (u) =>
              (u as { userId?: string; id?: string }).userId !== userId &&
              (u as { userId?: string; id?: string }).id !== userId
          )
        )
      )
    ];
    realtimeCollab.joinPage(page.id);
    return () => unsubs.forEach((fn) => fn());
  }, [page?.id]);

  // Save API Key / Local Provider handler
  const handleSaveApiKey = async () => {
    const provider = providers.find((p) => p.id === keyProvider);
    const isLocal = provider?.type === "local";
    if (!isLocal && !keyInput.trim()) return;

    setTestingKey(true);
    try {
      const baseUrl = isLocal ? (keyInput.trim() || provider?.baseUrl) : provider?.baseUrl;
      const apiKey = isLocal ? undefined : keyInput.trim();

      const testResult = await testProviderConnection(keyProvider, {
        apiKey,
        baseUrl,
        model: provider?.defaultModel
      });

      aiManager.setProviderConfig(keyProvider, {
        apiKey,
        baseUrl: isLocal ? baseUrl : undefined,
        enabled: true
      });
      aiManager.setActiveProvider(keyProvider);

      if (testResult.ok) {
        onToast?.(`${provider?.name || keyProvider} connected successfully!`);
      } else {
        onToast?.(`${provider?.name || keyProvider} configuration saved`);
      }
      setShowKeyModal(false);
      setKeyInput("");
    } catch {
      onToast?.("Provider settings saved");
      setShowKeyModal(false);
    } finally {
      setTestingKey(false);
    }
  };

  const handleSend = useCallback(
    async (overrideText?: string, selection?: AiModelSelection) => {
      const text = (overrideText || prompt).trim();
      if (!text || loading) return;
      setPrompt("");

      const userMsg: ChatPanelMessage = { role: "user", text };
      const updatedMessages: ChatPanelMessage[] = [...messages, userMsg, { role: "ai", text: "..." }];
      setMessages(updatedMessages);
      setLoading(true);
      setExecutingTools(true);
      setToolResults([]);

      // Update real active model if user changed it in selector
      if (selection?.id) {
        aiManager.setActiveModel(selection.id);
      }

      capture("ai_generation", { model: selection?.id || modelName });

      // Update chat list
      const chatId = activeChatId || uid();
      if (!activeChatId) onActiveChat?.(chatId);
      const title = text.slice(0, 48);
      const existing = aiChats.find((c) => c.id === chatId);
      const nextChats: AIChat[] = existing
        ? aiChats.map((c) => (c.id === chatId ? { ...c, updatedAt: now() } : c))
        : [
            {
              id: chatId,
              name: title,
              pinned: false,
              archived: false,
              chatType: "private",
              updatedAt: now(),
              messages: [{ role: "user", text }],
              pageId: page?.id ?? null,
              pageTitle: page?.title ?? null,
              collaborators: [],
              createdAt: now()
            } as AIChat,
            ...aiChats
          ];
      onChatsChange?.(nextChats);

      try {
        const contextString = buildContext({
          page: page || undefined,
          pages: pages || [],
          options: { ...currentAgent.context, includeMemory: true },
          memory: null
        });
        const systemPrompt = buildAgentPrompt(activeAgent, contextString, { tools: true });

        const startedAt = Date.now();
        const result = await aiManager.stream({
          system: systemPrompt,
          prompt: text,
          messages: updatedMessages.slice(-20),
          page: page || undefined,
          pages: pages || undefined,
          agent: activeAgent,
          onChunk: (chunk: string) => {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "ai") {
                next[next.length - 1] = {
                  ...last,
                  text: last.text === "..." ? chunk : last.text + chunk
                };
              }
              return next;
            });
          }
        });
        const latencyMs = Date.now() - startedAt;
        const responseText = result || "";
        const activeSelectedModel = selection?.id || modelName;

        setMessages((prev) => {
          const next = [...prev];
          const last = { ...next[next.length - 1] };
          last.text = responseText || last.text;
          last.model = activeSelectedModel;
          last.provider = providerName;
          last.latencyMs = latencyMs;
          next[next.length - 1] = last;
          return next;
        });

        setLoading(false);

        // Execute tool calls
        if (hasToolCalls(responseText) && toolContext) {
          const results: ToolCallResult[] = await executeAllToolCalls(responseText, toolContext);
          setToolResults(results);
          const cleaned = stripToolCalls(responseText);
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "ai") {
              next[next.length - 1] = { ...last, text: cleaned || last.text };
            }
            return next;
          });

          const failed = results.filter((r) => !r.ok);
          if (failed.length > 0) {
            onToast?.(`${failed.length} action${failed.length > 1 ? "s" : ""} failed`);
          } else if (results.length > 0) {
            onToast?.(`${results.length} action${results.length > 1 ? "s" : ""} completed`);
          }

          for (const r of results) {
            if (r.ok) {
              auditEngine.log({
                pageId: page?.id,
                userId: realtimeCollab.getUser()?.userId || "ai",
                userName: currentAgent.name,
                action: "ai_edit",
                aiProvider: providerName,
                aiModel: activeSelectedModel,
                aiLatencyMs: latencyMs,
                detail: `${r.name}: ${r.result?.count || 0} blocks`
              });
            }
          }
        }

        setExecutingTools(false);

        const finalMessages: ChatPanelMessage[] = [
          ...messages,
          userMsg,
          {
            role: "ai",
            text: responseText,
            model: activeSelectedModel,
            provider: providerName,
            latencyMs
          }
        ];
        onChatsChange?.((prev) =>
          prev.map((c) =>
            c.id === (activeChatId || chatId)
              ? {
                  ...c,
                  messages: finalMessages,
                  pageId: c.pageId || page?.id,
                  pageTitle: c.pageTitle || page?.title,
                  updatedAt: now()
                }
              : c
          )
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const friendly =
          message?.includes("not configured") || message?.includes("API key")
            ? "AI provider not configured. Click 'Setup Key' in the top bar to add your API key."
            : "AI request failed. Please try again.";
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "ai") {
            next[next.length - 1] = { ...last, text: friendly };
          }
          return next;
        });
        setLoading(false);
        setExecutingTools(false);
      }
    },
    [prompt, loading, messages, activeChatId, page, pages, toolContext, currentAgent, activeAgent, modelName, providerName, aiChats, onActiveChat, onChatsChange, onToast]
  );

  const handleNewChat = () => {
    setMessages([]);
    setToolResults([]);
    onActiveChat?.(null);
    onNewChat?.();
  };

  const handleSelectChat = (id: string) => {
    const chat = aiChats.find((c) => c.id === id);
    if (chat) {
      setMessages((chat.messages as ChatPanelMessage[]) || []);
      onActiveChat?.(id);
      onSelectChat?.(id);
    }
  };

  const handleArchive = (id: string) => {
    onChatsChange?.((prev) =>
      prev.map((c) => (c.id === id ? { ...c, archived: !c.archived } : c))
    );
    onToast?.("Chat archived");
  };

  const handleDelete = (id: string) => {
    onChatsChange?.((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) {
      setMessages([]);
      onActiveChat?.(null);
    }
    onToast?.("Chat deleted");
  };

  const handleRename = (id: string, name: string) => {
    onChatsChange?.((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name } : c))
    );
    onRenameChat?.(id, name);
  };

  const handleDuplicate = (id: string) => {
    const orig = aiChats.find((c) => c.id === id);
    if (!orig) return;
    const copy: AIChat = {
      ...JSON.parse(JSON.stringify(orig)),
      id: uid(),
      name: (orig.name || "Chat") + " copy",
      updatedAt: now()
    };
    onChatsChange?.((prev) => [copy, ...prev]);
    onToast?.("Chat duplicated");
  };

  const handleInsertBelow = (text: string) => {
    const blocks = textToBlocks(text);
    if (blocks.length > 0) {
      onAppend?.(blocks);
      onToast?.("Inserted into page");
    }
  };

  const handleReplace = (text: string) => {
    onReplaceText?.(text);
    onToast?.("AI draft added to page");
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast?.("Copied to clipboard");
    } catch {
      onToast?.("Could not copy");
    }
  };

  const handleBranch = (index: number) => {
    const branchMessages = messages.slice(0, index + 1);
    const id = uid();
    const title = (messages.find((m) => m.role === "user")?.text || "Branch").slice(0, 48);
    onChatsChange?.((prev) => [
      {
        id,
        name: title,
        pinned: false,
        archived: false,
        chatType: "private",
        updatedAt: now(),
        messages: branchMessages,
        pageId: page?.id ?? null,
        pageTitle: page?.title ?? null,
        collaborators: [],
        createdAt: now()
      } as AIChat,
      ...prev
    ]);
    setMessages(branchMessages);
    onActiveChat?.(id);
    onToast?.("Branch created");
  };

  const handleReaction = (index: number, reaction: string) => {
    setMessages((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, reactions: [...(m.reactions || []), reaction] } : m
      )
    );
  };

  const hasMessages = messages.length > 0;

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex bg-[var(--bg)] text-[var(--text)] font-sans antialiased select-none"
    >
      {/* Collapsible Left Sidebar for History */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="border-r border-[var(--border)] bg-[var(--sidebar)] overflow-hidden shrink-0 flex flex-col"
          >
            <ChatSidebar
              chats={aiChats}
              activeChatId={activeChatId}
              onSelect={handleSelectChat}
              onNew={handleNewChat}
              onRename={handleRename}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              searchQuery={chatSearchQuery}
              onSearchChange={setChatSearchQuery}
              filter={chatFilter}
              onFilterChange={setChatFilter}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Clean Canvas */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg)] relative overflow-hidden">
        {/* Minimal Transparent Top Bar */}
        <header className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 shrink-0 z-20">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
              title={showSidebar ? "Close history" : "Conversation history"}
            >
              {showSidebar ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
            </button>

            {/* Agent Switcher Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAgentMenuOpen(!agentMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border)] text-xs font-medium text-[var(--text)] transition-all shadow-2xs"
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                  style={{ backgroundColor: `${currentAgent.color}25`, color: currentAgent.color }}
                >
                  {currentAgent.icon || "✦"}
                </span>
                <span>{currentAgent.name}</span>
                <span className="text-[9px] text-[var(--muted)]">▼</span>
              </button>

              <AnimatePresence>
                {agentMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    className="absolute left-0 top-full mt-2 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-1.5 shadow-xl backdrop-blur-xl z-50"
                  >
                    {agents.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setActiveAgent(a.id);
                          setAgentMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl transition-colors ${
                          activeAgent === a.id
                            ? "bg-[var(--accent)]/15 text-[var(--text)] font-semibold"
                            : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-lg flex items-center justify-center text-xs shrink-0"
                          style={{ backgroundColor: `${a.color}20`, color: a.color }}
                        >
                          {a.icon}
                        </span>
                        <div className="text-xs">{a.name}</div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Document Pill */}
            {page && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-1)] border border-[var(--border)] text-xs text-[var(--text-secondary)]">
                <span>{page.icon || "📄"}</span>
                <span className="truncate max-w-[160px]">{page.title || "Untitled"}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {hasMessages && (
              <button
                type="button"
                onClick={handleNewChat}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
              >
                <MessageSquarePlus size={13} />
                <span>New chat</span>
              </button>
            )}

            {/* API Key Setup Trigger Button */}
            <button
              type="button"
              onClick={() => setShowKeyModal(true)}
              className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors border ${
                isConfigured
                  ? "bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)]"
                  : "bg-[var(--accent)]/15 hover:bg-[var(--accent)]/25 text-[var(--text)] border-[var(--accent)]/30 font-medium"
              }`}
            >
              <Key size={12} className={isConfigured ? "text-[var(--success)]" : "text-[var(--accent)]"} />
              <span>{isConfigured ? (modelName || providerName) : "Setup API Key"}</span>
            </button>

            <CollabAura users={presenceUsers} />

            <button
              type="button"
              onClick={() => setShowContext(!showContext)}
              className={`p-2 rounded-xl transition-colors ${
                showContext
                  ? "text-[var(--accent)] bg-[var(--accent)]/15"
                  : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
              }`}
              title="Page Context"
            >
              {showContext ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Clean Center Stage with Gamma-style fluid layout transition */}
        <LayoutGroup id="ai-workspace-layout">
          <div className="flex-1 flex flex-col justify-between overflow-hidden relative select-text">
            {/* Scrollable Chat Area */}
            <div className="flex-1 overflow-y-auto relative scrollbar-thin flex flex-col">
              <AnimatePresence mode="popLayout" initial={false}>
                {!hasMessages ? (
                  /* Pristine Centered Minimal Hero (Gamma style) */
                  <motion.div
                    key="hero-container"
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, y: -30, scale: 0.95, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } }}
                    className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-2xl mx-auto w-full"
                  >
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col items-center text-center mb-6 overflow-hidden"
                    >
                      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text)]">
                        What can I help you with?
                      </h1>
                      <p className="text-sm text-[var(--muted)] mt-1.5 max-w-sm leading-relaxed">
                        Search your workspace, write docs, or brainstorm ideas.
                      </p>
                    </motion.div>
                  </motion.div>
                ) : (
                  /* Active Chat Stream */
                  <motion.div
                    key="chat-stream"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 space-y-4 flex-1"
                  >
                    {messages.map((m, i) => (
                      <ChatMessage
                        key={i}
                        message={m}
                        index={i}
                        total={messages.length}
                        isLastAi={i === messages.length - 1 && m.role === "ai"}
                        onInsertBelow={handleInsertBelow}
                        onReplace={handleReplace}
                        onCopy={handleCopy}
                        onBranch={handleBranch}
                        onReaction={handleReaction}
                      />
                    ))}

                    {loading && messages[messages.length - 1]?.text === "..." && (
                      <div className="inline-flex items-center gap-2.5 rounded-full bg-[var(--surface-1)] border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-secondary)] shadow-2xs">
                        <Loader2 size={13} className="animate-spin text-[var(--accent)]" />
                        <span>{currentAgent.name} is reasoning...</span>
                      </div>
                    )}

                    {executingTools && toolResults.length > 0 && (
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-3 space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
                          <Zap size={11} className="text-[var(--accent)]" /> Actions Completed
                        </div>
                        {toolResults.map((r, i) => (
                          <div key={i} className="flex items-center justify-between text-xs py-1">
                            <span className="font-mono text-xs text-[var(--text)]">{r.name}</span>
                            <span className="text-[10px] text-[var(--muted)] font-mono">{r.ok ? "Success" : "Failed"}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {typingUsers.length > 0 && (
                      <div className="text-xs text-[var(--muted)]">
                        {typingUsers.map((u) => u.userName).join(", ")} is typing...
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Persistent Fluid Prompt Composer (Smoothly morphs from center to bottom like Gamma) */}
            <motion.div
              layout="position"
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className={`w-full shrink-0 transition-all duration-300 ${
                hasMessages ? "max-w-3xl mx-auto" : "max-w-2xl mx-auto mb-16"
              }`}
            >
              <PromptComposer
                prompt={prompt}
                setPrompt={setPrompt}
                onSend={handleSend}
                loading={loading}
                onAbort={() => setLoading(false)}
                currentAgent={currentAgent}
                page={page}
                onOpenKeySetup={(providerId) => {
                  if (providerId) setKeyProvider(providerId);
                  setShowKeyModal(true);
                }}
                onToast={onToast}
              />
            </motion.div>
          </div>
        </LayoutGroup>
      </div>

      {/* Slide-over Context Panel */}
      <ContextPanel
        page={page}
        auditEvents={auditEvents}
        open={showContext}
        onToggle={() => setShowContext(!showContext)}
      />

      {/* Built-in Minimal API Key & Local Provider Setup Dialog */}
      <AnimatePresence>
        {showKeyModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
            onClick={() => setShowKeyModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl bg-[var(--surface-1)] border border-[var(--border)] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text)]">AI Provider & Model Setup</h3>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Connect cloud API keys or local AI engines (Ollama / LM Studio).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Select Provider
                    </label>
                    <span className="text-[10px] text-[var(--muted)]">
                      {providers.find((p) => p.id === keyProvider)?.type === "local" ? "💻 Local Offline" : "☁️ Cloud Provider"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto p-1 border border-[var(--border)] rounded-2xl bg-[var(--surface-2)]/30 scrollbar-thin">
                    {providers.map((p) => {
                      const isSelected = keyProvider === p.id;
                      const isLocal = p.type === "local";
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setKeyProvider(p.id);
                            if (isLocal) {
                              setKeyInput(p.baseUrl);
                            } else {
                              setKeyInput("");
                            }
                          }}
                          className={`p-2 rounded-xl text-xs font-medium transition-all text-left flex flex-col justify-between gap-1 border ${
                            isSelected
                              ? "bg-[var(--accent)]/15 text-[var(--text)] border-[var(--accent)]/40 font-semibold shadow-2xs"
                              : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text)] border-transparent"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="truncate">{p.name}</span>
                            {isLocal && <span className="text-[9px] px-1 rounded bg-emerald-500/10 text-emerald-500">Local</span>}
                          </div>
                          <span className="text-[9px] text-[var(--muted)] font-normal">
                            {p.models?.length || 0} models
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {providers.find((p) => p.id === keyProvider)?.type === "local" ? (
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
                      Local Server Base URL
                    </label>
                    <input
                      type="text"
                      autoFocus
                      placeholder={providers.find((p) => p.id === keyProvider)?.baseUrl || "http://localhost:11434"}
                      value={keyInput || providers.find((p) => p.id === keyProvider)?.baseUrl || ""}
                      onChange={(e) => setKeyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveApiKey();
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)]/50 transition-colors font-mono"
                    />
                    <p className="text-[11px] text-[var(--muted)] mt-1">
                      Runs locally on your device with zero API keys required. Ensure the local daemon is active.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
                      {providers.find((p) => p.id === keyProvider)?.name} API Key
                    </label>
                    <input
                      type="password"
                      autoFocus
                      placeholder={providers.find((p) => p.id === keyProvider)?.keyPlaceholder || "Paste API key..."}
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveApiKey();
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)]/50 transition-colors font-mono"
                    />
                    <p className="text-[11px] text-[var(--muted)] mt-1">
                      Stored securely in your local browser storage and used for workspace requests.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    providers.find((p) => p.id === keyProvider)?.type !== "local" &&
                    (!keyInput.trim() || testingKey)
                  }
                  onClick={handleSaveApiKey}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition-all disabled:opacity-40"
                >
                  {testingKey ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Save & Connect</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
