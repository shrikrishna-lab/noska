import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, SendHorizontal, Check, Sparkles, PanelLeftClose, PanelRightOpen, Cpu
} from "lucide-react";
import { aiManager } from "../ai/AIManager";
import { getAgentList, getAgent, buildAgentPrompt } from "../ai/agents";
import { buildContext } from "../ai/ContextBuilder";
import { textToBlocks, uid, now, plainText } from "../utils/helpers";
import { hasToolCalls, stripToolCalls, executeAllToolCalls } from "../ai/tools";
import { realtimeCollab } from "../lib/realtimeCollab";
import { auditEngine } from "../lib/auditEngine";
import type { Page, AIChat } from "../lib/supabaseService";
import type { Block } from "../../types/blocks";

import ChatSidebar from "./ai/ChatSidebar";
import OnboardingSuggestions from "./ai/OnboardingSuggestions";
import PageInsights from "./ai/PageInsights";
import PromptComposer from "./ai/PromptComposer";
import ContextPanel from "./ai/ContextPanel";
import AIActionsCard from "./ai/AIActionsCard";
import CollabAura from "./ai/CollabAura";
import ChatMessage from "./ai/ChatMessage";

const SPRING = { type: "spring", stiffness: 300, damping: 24 };

/** Single message shape read/written throughout this component and
 * passed to ChatMessage.tsx — `{ role, text }` is the only shape ever
 * constructed here (`{ role: "user"|"ai", text }`), with `reactions`
 * added on top only by `handleReaction`. */
interface ChatPanelMessage {
  role: string;
  text: string;
  html?: string;
  reactions?: string[];
}

/** Result entries produced by `executeAllToolCalls` (src/ai/tools.ts) —
 * that module has no exported return type (implicit per-branch object),
 * so this mirrors the exact fields actually read here (`r.ok`, `r.name`,
 * `r.result?.count`, `r.error`). */
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
  // Opaque pass-through to executeAllToolCalls (src/ai/tools.ts) — that
  // module's `executeTool(name, params, context)` has no exported
  // context type, and App.tsx's `toolContext` (currentPage/pages/actions)
  // is only ever forwarded here verbatim, never read directly by this
  // component.
  toolContext?: unknown;
}

export default function AIPanel({
  open, onClose, page, pages, apiKey, aiProvider, nvidiaKey,
  aiChats = [], activeChatId, onChatsChange, onActiveChat, onNewChat,
  onSelectChat, onDeleteChat, onRenameChat, onPagePatch, onInsert,
  onAppend, onReplaceText, onToast, toolContext
}: AIPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatPanelMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [executingTools, setExecutingTools] = useState(false);
  const [toolResults, setToolResults] = useState<ToolCallResult[]>([]);
  const [activeAgent, setActiveAgent] = useState("assistant");
  const [showSidebar, setShowSidebar] = useState(true);
  const [showContext, setShowContext] = useState(false);
  const [showActions, setShowActions] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
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

  // Load active chat messages
  useEffect(() => {
    if (activeChatId) {
      const chat = aiChats.find(c => c.id === activeChatId);
      if (chat?.messages?.length) {
        setMessages(chat.messages as ChatPanelMessage[]);
      }
    } else {
      setMessages([]);
    }
  }, [activeChatId, open]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  // Load audit events
  useEffect(() => {
    if (!page?.id) return;
    auditEngine.getPageAudit(page.id, { limit: 20 }).then(setAuditEvents).catch(() => {});
  }, [page?.id]);

  // Typing indicator listener
  useEffect(() => {
    if (!page?.id || !realtimeCollab.isJoined()) return;
    const unsub = realtimeCollab.on('typing', ({ pageId, userId, userName }) => {
      if (pageId !== page?.id) return;
      setTypingUsers(prev => {
        if (prev.some(u => u.userId === userId)) return prev;
        return [...prev, { userId, userName: userName as string }];
      });
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.userId !== userId));
      }, 3000);
    });
    return unsub;
  }, [page?.id]);

  // Presence listener
  useEffect(() => {
    if (!page?.id || !realtimeCollab.isJoined()) return;
    const unsubs = [
      realtimeCollab.on('presence:sync', ({ users }) => setPresenceUsers(users)),
      realtimeCollab.on('presence:join', ({ user }) => setPresenceUsers(prev =>
        prev.some((u) => (u as { id?: string }).id === user.id) ? prev : [...prev, user]
      )),
      realtimeCollab.on('presence:leave', ({ userId }) => setPresenceUsers(prev =>
        prev.filter((u) => (u as { userId?: string; id?: string }).userId !== userId && (u as { userId?: string; id?: string }).id !== userId)
      ))
    ];
    realtimeCollab.joinPage(page.id);
    return () => unsubs.forEach(fn => fn());
  }, [page?.id]);

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText || prompt).trim();
    if (!text || loading) return;
    setPrompt("");

    const userMsg: ChatPanelMessage = { role: "user", text };
    const updatedMessages: ChatPanelMessage[] = [...messages, userMsg, { role: "ai", text: "..." }];
    setMessages(updatedMessages);
    setLoading(true);
    setExecutingTools(true);
    setToolResults([]);

    // Update chat list
    const chatId = activeChatId || uid();
    if (!activeChatId) onActiveChat?.(chatId);
    const title = text.slice(0, 48);
    const existing = aiChats.find(c => c.id === chatId);
    const nextChats: AIChat[] = existing
      ? aiChats.map(c => c.id === chatId ? { ...c, updatedAt: now() } : c)
      : [{ id: chatId, name: title, pinned: false, archived: false, chatType: "private", updatedAt: now(), messages: [{ role: "user", text }], pageId: page?.id ?? null, pageTitle: page?.title ?? null, collaborators: [], createdAt: now() } as AIChat, ...aiChats];
    onChatsChange?.(nextChats);

    try {
      // Build agent prompt with workspace context
      const contextString = buildContext({
        page: page || undefined,
        pages: pages || [],
        options: { ...currentAgent.context, includeMemory: false },
        memory: null
      });
      const systemPrompt = buildAgentPrompt(activeAgent, contextString, { tools: true });

      const result = await aiManager.stream({
        system: systemPrompt,
        prompt: text,
        messages: updatedMessages.slice(-20),
        page: page || undefined,
        pages: pages || undefined,
        agent: activeAgent,
        onChunk: (chunk: string) => {
          setMessages(prev => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "ai") {
              next[next.length - 1] = { ...last, text: last.text === "..." ? chunk : last.text + chunk };
            }
            return next;
          });
        }
      });

      const responseText = result || "";
      setMessages(prev => {
        const next = [...prev];
        const last = { ...next[next.length - 1] };
        last.text = responseText || last.text;
        next[next.length - 1] = last;
        return next;
      });

      setLoading(false);

      // Execute tool calls
      if (hasToolCalls(responseText) && toolContext) {
        const results: ToolCallResult[] = await executeAllToolCalls(responseText, toolContext);
        setToolResults(results);
        const cleaned = stripToolCalls(responseText);
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "ai") {
            next[next.length - 1] = { ...last, text: cleaned || last.text };
          }
          return next;
        });

        const failed = results.filter(r => !r.ok);
        if (failed.length > 0) {
          onToast?.(`${failed.length} action${failed.length > 1 ? 's' : ''} failed`);
        } else if (results.length > 0) {
          onToast?.(`${results.length} action${results.length > 1 ? 's' : ''} completed`);
        }

        // Log AI actions to audit
        for (const r of results) {
          if (r.ok) {
            auditEngine.log({
              pageId: page?.id, userId: realtimeCollab.getUser()?.userId || 'ai',
              userName: currentAgent.name, action: 'ai_edit',
              aiProvider: providerName, aiModel: 'default',
              detail: `${r.name}: ${r.result?.count || 0} blocks`
            });
          }
        }
      }

      setExecutingTools(false);

      // Save to chat list
      const finalMessages: ChatPanelMessage[] = [...messages, userMsg, { role: "ai", text: responseText }];
      onChatsChange?.(prev => prev.map(c =>
        c.id === (activeChatId || chatId) ? {
          ...c, messages: finalMessages,
          pageId: c.pageId || page?.id,
          pageTitle: c.pageTitle || page?.title,
          updatedAt: now()
        } : c
      ));

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const friendly = message?.includes("not configured") || message?.includes("API key")
        ? "AI provider not configured. Add an API key in Settings."
        : message?.includes("fetch") || message?.includes("network") || message?.includes("Failed to fetch")
          ? "Network error. Check your internet connection."
          : message?.includes("timeout") || message?.includes("timed out")
            ? "AI request timed out. Try again."
            : "AI request failed. Please try again.";
      setMessages(prev => {
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
  }, [prompt, loading, messages, activeChatId, page, pages, toolContext, currentAgent, activeAgent]);

  const handleNewChat = () => {
    setMessages([]);
    setToolResults([]);
    onActiveChat?.(null);
    onNewChat?.();
  };

  const handleSelectChat = (id: string) => {
    const chat = aiChats.find(c => c.id === id);
    if (chat) {
      setMessages((chat.messages as ChatPanelMessage[]) || []);
      onActiveChat?.(id);
      onSelectChat?.(id);
    }
  };

  const handleArchive = (id: string) => {
    onChatsChange?.(prev => prev.map(c => c.id === id ? { ...c, archived: !c.archived } : c));
    onToast?.("Chat archived");
  };

  const handleDelete = (id: string) => {
    onChatsChange?.(prev => prev.filter(c => c.id !== id));
    if (activeChatId === id) {
      setMessages([]);
      onActiveChat?.(null);
    }
    onToast?.("Chat deleted");
  };

  const handleRename = (id: string, title: string) => {
    onChatsChange?.(prev => prev.map(c => c.id === id ? { ...c, title } as AIChat : c));
    onRenameChat?.(id, title);
  };

  const handleDuplicate = (id: string) => {
    const orig = aiChats.find(c => c.id === id);
    if (!orig) return;
    const copy: AIChat = { ...JSON.parse(JSON.stringify(orig)), id: uid(), name: (orig.name || 'Chat') + ' copy', updatedAt: now() };
    onChatsChange?.(prev => [copy, ...prev]);
    onToast?.("Chat duplicated");
  };

  const handleInsertBelow = (text: string) => {
    const blocks = textToBlocks(text);
    if (blocks.length > 0) { onAppend?.(blocks); onToast?.("Inserted into page"); }
  };

  const handleReplace = (text: string) => {
    onReplaceText?.(text);
    onToast?.("AI draft added to page");
  };

  const handleCopy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); onToast?.("Copied"); } catch { onToast?.("Could not copy"); }
  };

  const handleBranch = (index: number) => {
    const branchMessages = messages.slice(0, index + 1);
    const id = uid();
    const title = (messages.find(m => m.role === "user")?.text || "Branch").slice(0, 48);
    onChatsChange?.(prev => [{ id, name: title, pinned: false, archived: false, chatType: "private", updatedAt: now(), messages: branchMessages, pageId: null, pageTitle: null, collaborators: [], createdAt: now() } as AIChat, ...prev]);
    setMessages(branchMessages);
    onActiveChat?.(id);
    onToast?.("Branch created");
  };

  const handleReaction = (index: number, reaction: string) => {
    setMessages(prev => prev.map((m, i) =>
      i === index ? { ...m, reactions: [...(m.reactions || []), reaction] } : m
    ));
  };

  const hasMessages = messages.length > 0;
  const showOnboarding = !hasMessages && !loading;

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex bg-[var(--bg)]/60 backdrop-blur-sm"
    >
      {/* Left sidebar — Chat list */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="border-r border-[var(--border)] bg-[var(--sidebar)] overflow-hidden shrink-0"
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center — Conversation */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg)]">
        {/* Header */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[var(--border)] shrink-0 min-h-[36px]">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-0.5 rounded text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)] transition"
            title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
          >
            <PanelLeftClose size={11} />
          </button>

          <div className="w-5 h-5 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
            <Sparkles size={10} className="text-[var(--accent)]" />
          </div>

          <span className="text-[10px] font-semibold text-[var(--text)] flex-1">
            {currentAgent.name}
          </span>

          {isConfigured && (
            <span className="text-[7px] text-[var(--muted)] hidden sm:block truncate max-w-[80px]" title={`${providerName} · ${modelName}`}>
              {modelName}
            </span>
          )}

          {/* Agent selector */}
          <div className="relative">
            <button
              onClick={() => setAgentMenuOpen(!agentMenuOpen)}
              className="flex items-center gap-1 rounded-md bg-[var(--surface-3)] hover:bg-[var(--hover)] px-1.5 py-0.5 text-[8px] text-[var(--text-secondary)] transition"
            >
              {currentAgent.icon}
            </button>
            <AnimatePresence>
              {agentMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden z-50"
                >
                  {agents.map(a => (
                    <button
                      key={a.id}
                      onClick={() => { setActiveAgent(a.id); setAgentMenuOpen(false); }}
                      className={`w-full flex items-center gap-1.5 px-2 py-1 text-[9px] text-left transition ${
                        activeAgent === a.id ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--hover)]'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded flex items-center justify-center text-[7px]" style={{ backgroundColor: a.color + '20', color: a.color }}>{a.icon}</span>
                      {a.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!isConfigured && (
            <span className="text-[7px] text-[var(--accent)]/70 bg-[var(--accent)]/10 px-1 py-0.5 rounded">No API key</span>
          )}

          <span className="flex items-center gap-0.5 rounded-md bg-[var(--surface-3)] px-1 py-0.5 text-[7px] text-[var(--muted)] font-mono">
            <kbd className="leading-none">&#8984;K</kbd>
          </span>

          {/* Collab aura */}
          <CollabAura users={presenceUsers} />

          <button
            onClick={() => setShowContext(!showContext)}
            className={`p-0.5 rounded transition ${showContext ? 'text-[var(--accent)] bg-[var(--accent)]/8' : 'text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)]'}`}
            title={showContext ? 'Hide context panel' : 'Show context panel'}
          >
            <PanelRightOpen size={11} />
          </button>

          <button
            onClick={onClose}
            className="p-0.5 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition"
            title="Close"
          >
            <X size={11} />
          </button>
        </div>

        {/* Messages / Onboarding */}
        <div className="relative flex-1 overflow-y-auto scrollbar-thin">
          {showOnboarding ? (
            <>
              {page && <PageInsights page={page} pages={pages} onSend={(text: string) => { setPrompt(text); handleSend(text); }} />}
              <OnboardingSuggestions onSend={(text: string) => { setPrompt(text); handleSend(text); }} />
            </>
          ) : (
            <div className="space-y-1.5 px-3 py-2">
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

              {/* Loading indicator */}
              <AnimatePresence>
                {loading && messages[messages.length - 1]?.text === "..." && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text-secondary)]"
                  >
                    <Loader2 size={10} className="animate-spin text-[var(--accent)]" />
                    <span>{currentAgent.name} is thinking...</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tool execution timeline */}
              <AnimatePresence>
                {executingTools && toolResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/50 px-2 py-1.5"
                  >
                    <div className="space-y-0.5">
                      {toolResults.map((r, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${
                            r.ok ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'bg-[var(--danger)]/15 text-[var(--danger)]'
                          }`}>
                            {r.ok ? <Check size={7} /> : <X size={7} />}
                          </span>
                          <span className="text-[9px] text-[var(--text-secondary)]">{r.name.replace(/_/g, ' ')}</span>
                          {r.ok && r.result?.count && (
                            <span className="ml-auto text-[8px] text-[var(--muted)]">{r.result.count} blocks</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-1.5 text-[9px] text-[var(--muted)] px-0.5 py-0.5">
                  <span className="flex gap-0.5">
                    <span className="w-0.5 h-0.5 rounded-full bg-[var(--muted)] animate-bounce" style={{animationDelay: '0ms'}} />
                    <span className="w-0.5 h-0.5 rounded-full bg-[var(--muted)] animate-bounce" style={{animationDelay: '150ms'}} />
                    <span className="w-0.5 h-0.5 rounded-full bg-[var(--muted)] animate-bounce" style={{animationDelay: '300ms'}} />
                  </span>
                  <span>{typingUsers.map(u => u.userName).join(', ')} typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* AI Actions */}
        {hasMessages && (
          <AIActionsCard onSendPrompt={(p: string) => { setPrompt(p); setTimeout(() => handleSend(), 100); }} />
        )}

        {/* Prompt Composer */}
        <PromptComposer
          prompt={prompt}
          setPrompt={setPrompt}
          onSend={handleSend}
          loading={loading}
          onAbort={() => setLoading(false)}
          currentAgent={currentAgent}
          page={page}
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings(!showSettings)}
        />
      </div>

      {/* Right Context Panel */}
      <ContextPanel
        page={page}
        auditEvents={auditEvents}
        open={showContext}
        onToggle={() => setShowContext(!showContext)}
      />
    </motion.div>
  );
}
