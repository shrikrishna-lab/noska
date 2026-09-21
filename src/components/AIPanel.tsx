import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, PanelLeftClose, PanelLeft, PanelRightOpen, PanelRightClose,
  Key, Zap, MessageSquarePlus, Check, ExternalLink, Settings2,
  Sparkles, BookOpen, Compass, Sliders, Layers, FileText,
  ChevronDown, Search, Plus
} from "lucide-react";
import { aiManager } from "../ai/AIManager";
import { AIError, isCancelled } from "../ai/core/AIError";
import { getAgentList, getAgent, buildAgentPrompt } from "../ai/agents";
import { buildContext } from "../ai/ContextBuilder";
import { textToBlocks, uid, now } from "../utils/helpers";
import { hasToolCalls, stripToolCalls, executeAllToolCalls } from "../ai/tools";
import { realtimeCollab } from "../lib/realtimeCollab";
import { auditEngine } from "../lib/auditEngine";
import { capture } from "../lib/posthog";
import { getAllProviders, testProviderConnection } from "../ai/providers";
import type { Page, AIChat } from "../lib/supabaseService";
import { recordUserAIUsage } from "../lib/supabaseService";
import { requireFeature, requireLimit, trackUsage } from "../lib/billing/guards";
import type { Block } from "../../types/blocks";

import ChatSidebar from "./ai/ChatSidebar";
import OnboardingSuggestions from "./ai/OnboardingSuggestions";
import PromptComposer from "./ai/PromptComposer";
import ContextPanel from "./ai/ContextPanel";
import CollabAura from "./ai/CollabAura";
import ChatMessage from "./ai/ChatMessage";
import NoskaThinkingIndicator from "./ai/NoskaThinkingIndicator";
import ScrollToLatestButton from "./ai/ScrollToLatestButton";
import { useActivityState } from "./ai/useActivityState";
import { useChatScroll } from "./ai/useChatScroll";
import { useStreamBuffer } from "./ai/useStreamBuffer";
import { ProviderIcon, type AiModelSelection } from "./ui/ai-prompt-input";
import { cn } from "../lib/utils";

const SPRING_APPLE = { type: "spring" as const, stiffness: 440, damping: 30, mass: 0.8 };

export function getSafePageIcon(icon?: string | null) {
  if (!icon) return <span className="text-xs">📄</span>;
  if (icon.startsWith("data:") || icon.startsWith("http")) {
    return <img src={icon} alt="" className="w-3.5 h-3.5 object-cover rounded-xs" />;
  }
  return <span className="text-xs">{icon}</span>;
}

export function getSafePageTitle(title?: string | null) {
  if (!title || title.startsWith("data:") || !title.trim()) return "Untitled";
  return title;
}

interface ChatPanelMessage {
  id?: string;
  role: string;
  text: string;
  html?: string;
  reactions?: string[];
  model?: string;
  provider?: string;
  latencyMs?: number;
  status?: 'streaming' | 'completed' | 'cancelled' | 'error';
}

type ToolCallResult = Awaited<ReturnType<typeof executeAllToolCalls>>[number];

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
  onSelectPage?: (page: Page) => void;
  onNewPage?: () => void;
  onToast?: (message: string) => void;
  toolContext?: unknown;
  currentUsername?: string | null;
  currentUserEmail?: string | null;
  currentUserAvatar?: string | null;
  currentUserId?: string | null;
  /** Locked (over-limit) workspace: sending is disabled, panel is read-only. */
  locked?: boolean;
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
  onSelectPage,
  onNewPage,
  onToast,
  toolContext,
  currentUsername,
  currentUserEmail,
  currentUserAvatar,
  currentUserId,
  locked = false
}: AIPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatPanelMessage[]>([]);
  const [executingTools, setExecutingTools] = useState(false);
  const [toolResults, setToolResults] = useState<ToolCallResult[]>([]);
  // AbortController for real cancellation of AI requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  // New interaction systems
  const activity = useActivityState();
  const chatScroll = useChatScroll();
  const streamBuffer = useStreamBuffer();
  const lastUserMsgRef = useRef<HTMLDivElement | null>(null);
  // Backwards compat: derive `loading` from activity state
  const loading = activity.isActive;
  const [activeAgent, setActiveAgent] = useState("assistant");
  const [showSidebar, setShowSidebar] = useState(false);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [pageSearch, setPageSearch] = useState("");
  const [hoveredPage, setHoveredPage] = useState<Page | null>(null);

  const filteredPages = useMemo(() => {
    return (pages || []).filter(
      (p) => !p.trashed && (!pageSearch.trim() || (p.title || "").toLowerCase().includes(pageSearch.toLowerCase()))
    );
  }, [pages, pageSearch]);
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

  // Intelligent scroll: follow latest during streaming
  useEffect(() => {
    if (activity.isGenerating) {
      chatScroll.followLatest();
    }
  }, [messages, activity.isGenerating]);

  // Load audit events
  useEffect(() => {
    if (!page?.id) return;
    auditEngine.getPageAudit(page.id, { limit: 20 }).then(setAuditEvents).catch(() => { });
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
    setPresenceUsers([]);
    if (!open || !page?.id || !realtimeCollab.isJoined()) return;
    const joinedPageId = page.id;
    const unsubs = [
      realtimeCollab.on("presence:sync", ({ pageId, users }) => {
        if (pageId === joinedPageId) setPresenceUsers(users);
      }),
      realtimeCollab.on("presence:join", ({ pageId, user }) => {
        if (pageId !== joinedPageId) return;
        setPresenceUsers((prev) =>
          prev.some((u) => (u as { id?: string }).id === user.id) ? prev : [...prev, user]
        );
      }),
      realtimeCollab.on("presence:leave", ({ pageId, userId }) => {
        if (pageId !== joinedPageId) return;
        setPresenceUsers((prev) =>
          prev.filter(
            (u) =>
              (u as { userId?: string; id?: string }).userId !== userId &&
              (u as { userId?: string; id?: string }).id !== userId
          )
        );
      })
    ];
    realtimeCollab.joinPage(joinedPageId);
    return () => {
      unsubs.forEach((fn) => fn());
      realtimeCollab.leavePage(joinedPageId);
    };
  }, [page?.id, open]);

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
    async (overrideText?: string, selection?: AiModelSelection, customBaseMessages?: ChatPanelMessage[]) => {
      const text = (overrideText || prompt).trim();
      if (!text || loading) return;
      if (lockedRef.current) {
        onToast?.("This workspace is locked and read-only — upgrade your plan to use AI. Import and export still work.");
        return;
      }

      // ── Billing gate (server-authoritative; this pre-check is UX only) ──
      // ai_generation must be enabled and monthly_ai_credits must remain.
      // Transport failures (billing backend unreachable) fail OPEN here so BYOK
      // direct-provider calls keep working offline; server-side metering still
      // applies wherever the backend is reachable.
      const [featGate, limitGate] = await Promise.all([requireFeature("ai_generation"), requireLimit("monthly_ai_credits", 1)]);
      const gate = featGate.ok ? limitGate : featGate;
      if (!gate.ok && !gate.transport) {
        onToast?.(gate.message ?? "AI is not available on your current plan.");
        window.dispatchEvent(new CustomEvent("noska:upgrade-required", { detail: { feature: "ai_generation" } }));
        return;
      }
      setPrompt("");

      const baseMsgs = customBaseMessages !== undefined ? customBaseMessages : messages;
      const userMsg: ChatPanelMessage = { role: "user", text };
      const updatedMessages: ChatPanelMessage[] = [...baseMsgs, userMsg, { role: "ai", text: "..." }];
      setMessages(updatedMessages);
      activity.setActivity('connecting');
      setExecutingTools(true);
      streamBuffer.reset();
      chatScroll.startFollowing();
      // Create AbortController for this generation
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setToolResults([]);

      // Scroll fully to latest on send
      requestAnimationFrame(() => {
        chatScroll.scrollToLatest();
      });

      // Update real active provider & model if user changed it in selector
      if (selection?.id) {
        let targetProviderId = (selection as any).providerId;
        if (!targetProviderId) {
          for (const p of getAllProviders()) {
            if (p.models?.some((m) => m.id === selection.id)) {
              targetProviderId = p.id;
              break;
            }
          }
        }
        if (targetProviderId) {
          aiManager.setActiveProvider(targetProviderId, selection.id);
        } else {
          aiManager.setActiveModel(selection.id);
        }
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
          pages: (pages || []).slice(0, 15),
          options: { ...currentAgent.context, includeMemory: true, tokenBudget: 1500 },
          memory: null
        });
        const systemPrompt = buildAgentPrompt(activeAgent, contextString, { tools: true });

        activity.setActivity('thinking');

        // Register stream buffer flush callback
        streamBuffer.onFlush((accumulated) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "ai") {
              next[next.length - 1] = {
                ...last,
                text: accumulated || last.text,
                status: 'streaming' as const,
              };
            }
            return next;
          });
        });

        const startedAt = Date.now();
        let firstChunkReceived = false;
        const priorHistory = baseMsgs
          .filter(m => m.text && m.text !== "...")
          .map(m => ({ role: m.role, content: m.text }))
          .slice(-12);

        const result = await aiManager.stream({
          system: systemPrompt,
          prompt: text,
          messages: priorHistory,
          page: page || undefined,
          pages: pages || undefined,
          agent: activeAgent,
          effort: selection?.effort || "medium",
          thinking: selection?.thinking,
          signal: controller.signal,
          onChunk: (chunk: string) => {
            if (!firstChunkReceived) {
              firstChunkReceived = true;
              activity.setActivity('generating');
            }
            streamBuffer.appendChunk(chunk);
            chatScroll.followLatest();
          }
        });
        // Flush any remaining buffered content
        streamBuffer.flush();
        const latencyMs = Date.now() - startedAt;
        const responseText = result || "";
        const activeSelectedModel = selection?.id || modelName;

        if (!responseText && !hasToolCalls(responseText)) {
          throw new AIError({
            type: "unknown",
            provider: providerName,
            retryable: true,
            userMessage: `${providerName || "AI Provider"}: No response received. Please verify provider connectivity and try again.`,
          });
        }

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

        chatScroll.stopFollowing();

        // Execute tool calls
        let cleanedFinalText = stripToolCalls(responseText).trim();

        if (hasToolCalls(responseText) && toolContext) {
          activity.setActivity('thinking');
          const results: ToolCallResult[] = await executeAllToolCalls(responseText, toolContext);
          setToolResults(results);

          const toolResultText = results.map((r: { name: string; error?: string; result?: unknown }) => {
            const success = r.error ? `Error: ${r.error}` : JSON.stringify(r.result, null, 2);
            return `Tool: ${r.name}\nResult: ${success}`;
          }).join("\n\n");

          // If the model didn't provide a substantive answer alongside tool calls, generate full synthesis
          if (!cleanedFinalText || cleanedFinalText.length < 20) {
            activity.setActivity('generating');
            try {
              const followUp = await aiManager.sendConversation({
                messages: [
                  ...baseMsgs.filter((m) => m.text !== "...").map((m) => ({ role: m.role, content: m.text })),
                  { role: "user", content: text },
                  { role: "assistant", content: responseText },
                  { role: "user", content: `Tool execution completed with results:\n${toolResultText}\n\nBased on these workspace results, provide a comprehensive, beautifully formatted response answering the request: "${text}".` }
                ],
                page: page || undefined,
                pages: pages || undefined,
              });
              if (followUp) {
                cleanedFinalText = stripToolCalls(followUp).trim() || followUp;
              }
            } catch (followErr) {
              console.warn("AIPanel tool follow-up generation:", followErr);
            }
          }

          if (!cleanedFinalText) {
            cleanedFinalText = `✨ Analyzed workspace & executed ${results.length} action${results.length > 1 ? 's' : ''}.`;
          }

          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "ai") {
              next[next.length - 1] = { ...last, text: cleanedFinalText };
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
                detail: `${r.name}: ${r.result && typeof r.result === "object" && "count" in r.result && typeof r.result.count === "number" ? r.result.count : 0} blocks`
              });
            }
          }
        }

        setExecutingTools(false);
        activity.setActivity('completed');

        const finalMessages: ChatPanelMessage[] = [
          ...baseMsgs,
          userMsg,
          {
            role: "ai",
            text: cleanedFinalText || responseText,
            model: activeSelectedModel,
            provider: providerName,
            latencyMs
          }
        ];

        // Record real-time user AI usage in Supabase database
        const activeUserId = realtimeCollab.getUser()?.userId;
        if (activeUserId && !activeUserId.startsWith("anon-")) {
          recordUserAIUsage(activeUserId, {
            promptTokens: Math.max(1, Math.round(text.length / 3.8)),
            completionTokens: Math.max(1, Math.round((cleanedFinalText || responseText).length / 3.8)),
            model: activeSelectedModel,
          });
          // Meter against the billing entitlement (server-enforced, idempotent-safe)
          void trackUsage("monthly_ai_credits", 1);
          void trackUsage("daily_ai_requests", 1);
        }
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
        // Handle cancellation silently (user pressed Stop)
        if (isCancelled(err)) {
          // Keep partial content, mark as cancelled
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "ai" && last.text !== "...") {
              next[next.length - 1] = { ...last, status: 'cancelled' as const };
            } else if (last?.role === "ai") {
              // Remove the placeholder if no content was generated
              next.pop();
            }
            return next;
          });
          activity.setActivity('cancelled');
          setExecutingTools(false);
          chatScroll.stopFollowing();
          return;
        }

        // Use structured error messages directly from the LLM provider
        const friendly = err instanceof AIError
          ? err.userMessage
          : (err instanceof Error && (err.message?.includes("not configured") || err.message?.includes("API key")))
            ? "AI provider not configured. Click 'Setup Key' in the top bar to add your API key."
            : err instanceof Error ? err.message : "AI request failed. Please try again.";

        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "ai") {
            next[next.length - 1] = { ...last, text: friendly, status: 'error' as const };
          }
          return next;
        });
        activity.setActivity('error');
        setExecutingTools(false);
        chatScroll.stopFollowing();
      } finally {
        abortControllerRef.current = null;
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

  const handleTogglePin = (id: string) => {
    onChatsChange?.((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
    onToast?.("Updated pin");
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
    setMessages((prev) => {
      const nextMessages = prev.map((m, i) => {
        if (i !== index) return m;
        const current = m.reactions || [];
        const nextReactions = current.includes(reaction)
          ? current.filter((r) => r !== reaction)
          : [...current.filter((r) => r !== (reaction === '👍' ? '👎' : reaction === '👎' ? '👍' : '')), reaction];
        return { ...m, reactions: nextReactions };
      });

      if (activeChatId) {
        onChatsChange?.((allChats) =>
          allChats.map((c) =>
            c.id === activeChatId ? { ...c, messages: nextMessages, updatedAt: now() } : c
          )
        );
      }
      return nextMessages;
    });
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
              pages={pages}
              activePageId={page?.id}
              currentAgentName={currentAgent?.name}
              onSelect={handleSelectChat}
              onNew={handleNewChat}
              onSelectPage={onSelectPage}
              onNewPage={onNewPage}
              onOpenKeyModal={() => setShowKeyModal(true)}
              onOpenAgentMenu={() => setAgentMenuOpen(true)}
              onRename={handleRename}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onTogglePin={handleTogglePin}
              searchQuery={chatSearchQuery}
              onSearchChange={setChatSearchQuery}
              filter={chatFilter}
              onFilterChange={setChatFilter}
              workspaceName={page?.title || "Workspace"}
              userName={currentUsername ? `@${currentUsername}` : (realtimeCollab.getUser()?.userName || "Workspace User")}
              userAvatar={currentUserAvatar || realtimeCollab.getUser()?.userAvatar}
              userEmail={currentUserEmail || realtimeCollab.getUser()?.userId}
              userId={currentUserId || realtimeCollab.getUser()?.userId}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Clean Canvas */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg)] relative overflow-hidden">
        {/* Minimal Transparent Top Bar */}
        <header className="flex items-center justify-between gap-3 px-3.5 sm:px-5 py-2.5 shrink-0 z-20 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-[#121316]/70 backdrop-blur-2xl">
          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              onClick={() => setShowSidebar(!showSidebar)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
              title={showSidebar ? "Close history" : "Conversation history"}
            >
              {showSidebar ? <PanelLeftClose size={17} /> : <PanelLeft size={17} />}
            </motion.button>

            {/* Agent Switcher Button */}
            <div className="relative">
              <motion.button
                type="button"
                onClick={() => setAgentMenuOpen(!agentMenuOpen)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/[0.035] hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-black/[0.07] dark:border-white/[0.08] text-xs font-semibold text-foreground transition-all shadow-2xs cursor-pointer select-none"
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[10.5px] shrink-0"
                  style={{ backgroundColor: `${currentAgent.color}25`, color: currentAgent.color }}
                >
                  {currentAgent.icon || "✦"}
                </span>
                <span className="text-[12px] font-semibold tracking-tight">{currentAgent.name}</span>
                <ChevronDown size={11} className={`text-muted-foreground opacity-60 transition-transform duration-200 ${agentMenuOpen ? "rotate-180" : ""}`} />
              </motion.button>

              <AnimatePresence>
                {agentMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 6, filter: "blur(8px)" }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.9, y: 6, filter: "blur(6px)" }}
                    transition={SPRING_APPLE}
                    className="absolute left-0 top-full mt-2 w-56 origin-top-left rounded-2xl border border-black/[0.08] dark:border-white/[0.09] bg-[#fdfcfb]/95 dark:bg-[#16171a]/95 p-1.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.18),0_0_1px_1px_rgba(0,0,0,0.04)] dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7),0_0_1px_1px_rgba(255,255,255,0.06)] backdrop-blur-2xl z-50 space-y-0.5"
                  >
                    {agents.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setActiveAgent(a.id);
                          setAgentMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left rounded-xl transition-all cursor-pointer ${activeAgent === a.id
                            ? "bg-black/[0.06] dark:bg-white/[0.10] text-foreground font-semibold shadow-2xs"
                            : "text-muted-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-foreground"
                          }`}
                      >
                        <span
                          className="w-5 h-5 rounded-lg flex items-center justify-center text-xs shrink-0"
                          style={{ backgroundColor: `${a.color}20`, color: a.color }}
                        >
                          {a.icon}
                        </span>
                        <div className="text-xs font-medium">{a.name}</div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Interactive Document Page Switcher Pill */}
            {page && (
              <div className="relative">
                <motion.button
                  type="button"
                  onClick={() => setPageMenuOpen(!pageMenuOpen)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/[0.035] hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-black/[0.07] dark:border-white/[0.08] text-xs font-medium text-foreground transition-all shadow-2xs cursor-pointer select-none group"
                  title="Click to switch active document context"
                >
                  <span className="flex items-center shrink-0">{getSafePageIcon(page.icon)}</span>
                  <span className="truncate max-w-[130px] sm:max-w-[160px] font-medium text-[12px]">{getSafePageTitle(page.title)}</span>
                  <ChevronDown size={11} className={`text-muted-foreground opacity-60 transition-transform duration-200 ${pageMenuOpen ? "rotate-180" : ""}`} />
                </motion.button>

                <AnimatePresence>
                  {pageMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 6, filter: "blur(8px)" }}
                      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, scale: 0.9, y: 6, filter: "blur(6px)" }}
                      transition={SPRING_APPLE}
                      onMouseLeave={() => setHoveredPage(null)}
                      className="absolute left-0 top-full mt-2 w-72 sm:w-80 origin-top-left rounded-2xl border border-black/[0.08] dark:border-white/[0.09] bg-[#fdfcfb]/95 dark:bg-[#16171a]/95 p-2 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.18),0_0_1px_1px_rgba(0,0,0,0.04)] dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7),0_0_1px_1px_rgba(255,255,255,0.06)] backdrop-blur-2xl z-50 space-y-1.5"
                    >
                      {/* Search Bar */}
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08]">
                        <Search size={12} className="text-muted-foreground shrink-0" />
                        <input
                          type="text"
                          autoFocus
                          value={pageSearch}
                          onChange={(e) => setPageSearch(e.target.value)}
                          placeholder="Search pages..."
                          className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                        />
                      </div>

                      {/* Page List with Live Content Preview */}
                      <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-1 pt-1">
                        {filteredPages.map((p) => {
                          const displayTitle = getSafePageTitle(p.title);
                          
                          // Extract inside text preview snippet
                          const snippet = (p.blocks || [])
                            .slice(0, 4)
                            .map((b: any) => b.text || "")
                            .filter(Boolean)
                            .join(" ")
                            .slice(0, 85);

                          const isHovered = hoveredPage?.id === p.id;

                          return (
                            <button
                              key={p.id}
                              type="button"
                              onMouseEnter={() => setHoveredPage(p)}
                              onClick={() => {
                                onSelectPage?.(p);
                                setPageMenuOpen(false);
                                setHoveredPage(null);
                                setPageSearch("");
                                onToast?.(`Switched active context to “${displayTitle}”`);
                              }}
                              className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition cursor-pointer ${
                                p.id === page.id
                                  ? "bg-black/[0.06] dark:bg-white/[0.10] border border-black/[0.08] dark:border-white/[0.12] shadow-2xs"
                                  : isHovered
                                  ? "bg-black/[0.04] dark:bg-white/[0.06] text-foreground border border-black/[0.05] dark:border-white/[0.07]"
                                  : "text-muted-foreground hover:text-foreground border border-transparent"
                              }`}
                            >
                              {/* Icon / Thumbnail */}
                              <div className="w-5 h-5 rounded-md bg-black/[0.04] dark:bg-white/[0.08] flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                                {getSafePageIcon(p.icon)}
                              </div>

                              {/* Title & Inside Live Snippet Preview */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`text-xs truncate font-medium ${p.id === page.id ? "text-foreground font-semibold" : ""}`}>
                                    {displayTitle}
                                  </span>
                                  {p.id === page.id && <Check size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />}
                                </div>
                                <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 leading-snug">
                                  {snippet || "No content inside yet"}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                        {filteredPages.length === 0 && (
                          <div className="text-center py-4 text-[11px] text-muted-foreground">
                            No matching pages found
                          </div>
                        )}
                      </div>

                      {/* ── Floating Live Inside Page Hover Preview Card ── */}
                      <AnimatePresence>
                        {hoveredPage && (
                          <motion.div
                            initial={{ opacity: 0, x: 8, scale: 0.97 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 8, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="hidden md:block absolute left-[calc(100%+8px)] top-0 w-80 rounded-2xl border border-black/[0.08] dark:border-white/[0.09] bg-[#fdfcfb]/95 dark:bg-[#16171a]/95 p-4 shadow-2xl backdrop-blur-2xl z-50 text-left space-y-3"
                          >
                            {/* Header / Cover */}
                            <div className="space-y-1.5 pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-black/[0.04] dark:bg-white/[0.08] flex items-center justify-center text-sm shrink-0">
                                  {getSafePageIcon(hoveredPage.icon)}
                                </div>
                                <h4 className="text-xs font-bold text-foreground truncate">
                                  {getSafePageTitle(hoveredPage.title)}
                                </h4>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span>{(hoveredPage.blocks || []).length} blocks</span>
                                <span>•</span>
                                <span>Active Workspace Document</span>
                              </div>
                            </div>

                            {/* Formatted Inside Blocks Live Snapshot */}
                            <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-thin text-xs">
                              {(hoveredPage.blocks || []).length > 0 ? (
                                (hoveredPage.blocks || []).slice(0, 6).map((b: any, idx: number) => {
                                  const text = b.text || "";
                                  if (!text.trim()) return null;

                                  if (b.type === "heading_1" || b.type === "heading_2") {
                                    return (
                                      <p key={b.id || idx} className="font-bold text-foreground text-xs pt-1">
                                        {text}
                                      </p>
                                    );
                                  }
                                  if (b.type === "bullet_list" || b.type === "todo") {
                                    return (
                                      <div key={b.id || idx} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                                        <span className="text-purple-600 dark:text-purple-400">•</span>
                                        <span className="line-clamp-2 leading-relaxed">{text}</span>
                                      </div>
                                    );
                                  }
                                  if (b.type === "callout") {
                                    return (
                                      <div key={b.id || idx} className="p-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-[11px] text-foreground">
                                        {text}
                                      </div>
                                    );
                                  }
                                  return (
                                    <p key={b.id || idx} className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                      {text}
                                    </p>
                                  );
                                })
                              ) : (
                                <div className="py-6 text-center text-xs text-muted-foreground italic">
                                  Empty page — no text content yet
                                </div>
                              )}
                            </div>

                            {/* Footer Tag */}
                            <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                              <span className="text-purple-600 dark:text-purple-400 font-semibold">✦ Click to select</span>
                              <span>Live Preview</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {hasMessages && (
              <motion.button
                type="button"
                onClick={handleNewChat}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.035] hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-black/[0.07] dark:border-white/[0.08] text-xs font-medium text-foreground/80 hover:text-foreground transition-all shadow-2xs cursor-pointer select-none"
              >
                <MessageSquarePlus size={13} className="text-muted-foreground opacity-75" />
                <span className="text-[11.5px] font-medium tracking-tight">New chat</span>
              </motion.button>
            )}

            {/* API Key Setup Trigger Button */}
            <motion.button
              type="button"
              onClick={() => setShowKeyModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "text-xs px-3 py-1 rounded-full flex items-center gap-1.5 transition-all border shadow-2xs cursor-pointer select-none font-medium",
                isConfigured
                  ? "bg-black/[0.035] hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-foreground/90 hover:text-foreground border-black/[0.07] dark:border-white/[0.08]"
                  : "bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30 font-semibold"
              )}
            >
              {isConfigured ? (
                <>
                  <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] shrink-0" />
                  <span className="truncate max-w-[140px] sm:max-w-[200px] text-[11.5px] tracking-tight">{modelName || providerName}</span>
                </>
              ) : (
                <>
                  <Key size={12} className="text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="text-[11.5px] tracking-tight">Setup API Key</span>
                </>
              )}
            </motion.button>

            <CollabAura users={presenceUsers} />

            <motion.button
              type="button"
              onClick={() => setShowContext(!showContext)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              className={cn(
                "p-1.5 rounded-xl transition-all cursor-pointer",
                showContext
                  ? "text-purple-600 dark:text-purple-400 bg-purple-500/15 border border-purple-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
              )}
              title="Page Context"
            >
              {showContext ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
            </motion.button>

            <motion.button
              type="button"
              onClick={onClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all cursor-pointer"
              title="Close"
            >
              <X size={17} />
            </motion.button>
          </div>
        </header>

        {/* Clean Center Stage */}
        <div
          ref={chatScroll.containerRef}
          onScroll={chatScroll.handleScroll}
          className="flex-1 flex flex-col justify-between overflow-y-auto relative scrollbar-thin select-text bg-[#faf9f6] dark:bg-[#121214] bg-[radial-gradient(#e4e1d8_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px]"
        >
          {/* Top Left Floating Quick Navigation Icon Dock */}
          {!hasMessages && (
            <div className="absolute top-4 left-4 hidden sm:block z-30">
              <div className="rounded-2xl bg-white/95 dark:bg-[#1c1c20]/95 backdrop-blur-md p-1.5 shadow-[0_6px_24px_rgba(0,0,0,0.06)] border border-[#e8e4db] dark:border-white/10 flex flex-col items-center gap-1">
                {/* Brand Icon Header */}
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-0.5" title="Noska AI">
                  <Sparkles size={15} />
                </div>

                <div className="w-6 h-[1px] bg-[#e8e4db] dark:bg-white/10 my-0.5" />

                {/* 1. Workspace Brief */}
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => {
                      const p = "Summarize workspace status, key priorities, and open action items in a clean brief.";
                      setPrompt(p);
                      handleSend(p);
                    }}
                    className="p-2 rounded-xl text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white hover:bg-[#ede8df] dark:hover:bg-white/10 transition-colors"
                    title="Workspace Brief"
                  >
                    <BookOpen size={16} />
                  </button>
                  <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#1c1b18] text-white text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
                    Workspace Brief
                  </div>
                </div>

                {/* 2. PRD & Specs */}
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => {
                      const p = "Draft a comprehensive technical spec / PRD for the current feature or page.";
                      setPrompt(p);
                      handleSend(p);
                    }}
                    className="p-2 rounded-xl text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white hover:bg-[#ede8df] dark:hover:bg-white/10 transition-colors"
                    title="Technical Specs"
                  >
                    <FileText size={16} />
                  </button>
                  <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#1c1b18] text-white text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
                    Technical Specs
                  </div>
                </div>

                {/* 3. Deep Research */}
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => {
                      const p = "Perform deep research across all notes and knowledge base in this workspace.";
                      setPrompt(p);
                      handleSend(p);
                    }}
                    className="p-2 rounded-xl text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white hover:bg-[#ede8df] dark:hover:bg-white/10 transition-colors"
                    title="Deep Research"
                  >
                    <Compass size={16} />
                  </button>
                  <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#1c1b18] text-white text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
                    Deep Research
                  </div>
                </div>

                {/* 4. Multi-agent Workflows */}
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => {
                      const p = "Analyze current workspace content and propose 3 automated agent workflows.";
                      setPrompt(p);
                      handleSend(p);
                    }}
                    className="p-2 rounded-xl text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white hover:bg-[#ede8df] dark:hover:bg-white/10 transition-colors"
                    title="Agent Workflows"
                  >
                    <Layers size={16} />
                  </button>
                  <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#1c1b18] text-white text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
                    Agent Workflows
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages or Onboarding Screen */}
          {!hasMessages ? (
            <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12 flex flex-col items-center justify-center min-h-[80vh] text-center my-auto">
              {/* Clean hero header */}
              <div className="w-full flex flex-col items-center max-w-3xl mx-auto space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="space-y-2"
                >
                  <h1 className="text-2xl sm:text-3xl md:text-[34px] font-bold tracking-tight text-[#1c1b18] dark:text-white leading-tight font-sans">
                    Tell us what you're thinking.
                    <br />
                    <span className="inline-flex items-center gap-2">
                      We'll craft the output <span className="text-3xl sm:text-4xl text-purple-600 dark:text-purple-400">✦</span>
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm text-[#706c64] dark:text-white/70 font-medium">
                    Instant synthesis, technical specs, deep research, and creative workflows
                  </p>
                </motion.div>

                {/* ── Fan-Spread Interactive Noska AI Superpower Cards ── */}
                <div className="w-full flex items-center justify-center gap-3 sm:gap-4 py-4 px-3 overflow-x-auto scrollbar-none">
                  {[
                    {
                      title: "Smart Summary",
                      tag: "SYNTHESIS",
                      icon: "📝",
                      desc: "Key takeaways, priorities, and structured outline.",
                      colors: ["#ea580c", "#f97316", "#fb923c", "#fed7aa"],
                      rotate: "-rotate-4",
                      hoverRotate: "hover:rotate-0",
                      promptText: "Summarize the key takeaways, decisions, and action items from this workspace.",
                      bgGradient: "from-amber-100/90 via-orange-100/80 to-amber-200/90 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-900/40",
                      tagBg: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                    },
                    {
                      title: "Specs & PRDs",
                      tag: "SPEC WRITER",
                      icon: "📐",
                      desc: "Architecture blueprints, user flows, and data schemas.",
                      colors: ["#db2777", "#f472b6", "#fbcfe8", "#fdf2f8"],
                      rotate: "-rotate-1",
                      hoverRotate: "hover:rotate-0",
                      promptText: "Draft a detailed Product Requirements Document (PRD) with architecture specs and API design.",
                      bgGradient: "from-pink-100/90 via-rose-100/80 to-purple-100/90 dark:from-pink-950/40 dark:via-rose-950/30 dark:to-purple-950/40",
                      tagBg: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
                    },
                    {
                      title: "Deep Research",
                      tag: "RESEARCH",
                      icon: "🔬",
                      desc: "Cross-reference multi-page notes, citations, and web facts.",
                      colors: ["#15803d", "#22c55e", "#86efac", "#dcfce7"],
                      rotate: "rotate-1",
                      hoverRotate: "hover:rotate-0",
                      promptText: "Perform deep research across all workspace notes and synthesize comprehensive findings.",
                      bgGradient: "from-emerald-100/90 via-teal-100/80 to-amber-100/90 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-teal-900/40",
                      tagBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                    },
                    {
                      title: "Creative Ideation",
                      tag: "BRAINSTORM",
                      icon: "💡",
                      desc: "Break through creative blocks with fresh angles & drafts.",
                      colors: ["#4338ca", "#6366f1", "#a5b4fc", "#e0e7ff"],
                      rotate: "rotate-4",
                      hoverRotate: "hover:rotate-0",
                      promptText: "Brainstorm 8 innovative approaches and creative solutions for our current project.",
                      bgGradient: "from-indigo-100/90 via-sky-100/80 to-violet-100/90 dark:from-indigo-950/40 dark:via-sky-950/30 dark:to-violet-950/40",
                      tagBg: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
                    },
                  ].map((card, idx) => (
                    <motion.div
                      key={card.title}
                      initial={{ opacity: 0, y: 16, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        delay: idx * 0.05 + 0.05,
                        type: "spring",
                        stiffness: 340,
                        damping: 24,
                        mass: 0.7
                      }}
                      whileHover={{ scale: 1.04, y: -6, zIndex: 30 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setPrompt(card.promptText);
                        handleSend(card.promptText);
                      }}
                      className={`noska-super-card w-40 sm:w-44 shrink-0 rounded-2xl bg-white/95 dark:bg-[#1c1c20]/95 backdrop-blur-md p-3.5 border border-[#e8e4db] dark:border-white/10 hover:border-purple-300 dark:hover:border-purple-600/60 cursor-pointer text-left ${card.rotate} ${card.hoverRotate}`}
                    >
                      {/* Image Preview Collage Thumbnail */}
                      <div className={`h-24 sm:h-26 w-full rounded-xl bg-gradient-to-br ${card.bgGradient} p-2.5 flex flex-col justify-between overflow-hidden mb-3 border border-black/5 dark:border-white/5`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${card.tagBg} backdrop-blur-xs px-1.5 py-0.5 rounded-md font-mono`}>
                            {card.tag}
                          </span>
                          <span className="text-sm select-none">{card.icon}</span>
                        </div>
                        <div className="space-y-1 opacity-70">
                          <div className="h-2 w-3/4 rounded-full bg-black/10 dark:bg-white/20" />
                          <div className="h-1.5 w-1/2 rounded-full bg-black/10 dark:bg-white/15" />
                        </div>
                      </div>

                      {/* Color Palette Dots */}
                      <div className="flex items-center gap-1 mb-2">
                        {card.colors.map((c, i) => (
                          <span
                            key={i}
                            className="w-2.5 h-2.5 rounded-full border border-black/10 dark:border-white/10"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>

                      {/* Title & Description */}
                      <h4 className="text-[13px] font-bold text-[#1c1b18] dark:text-white tracking-tight">
                        {card.title}
                      </h4>
                      <p className="text-[10.5px] text-[#706c64] dark:text-white/60 line-clamp-2 mt-0.5 leading-relaxed">
                        {card.desc}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Centered Floating Prompt Input Composer */}
                <div className="w-full max-w-2xl mx-auto pt-4">
                  <PromptComposer
                    prompt={prompt}
                    setPrompt={setPrompt}
                    onSend={handleSend}
                    loading={loading}
                    onAbort={() => {
                      abortControllerRef.current?.abort();
                      activity.setActivity('cancelled');
                    }}
                    currentAgent={currentAgent}
                    page={page}
                    onOpenKeySetup={(providerId) => {
                      if (providerId) setKeyProvider(providerId);
                      setShowKeyModal(true);
                    }}
                    onToast={onToast}
                  />
                </div>
              </div>

              {/* Bottom Subtle Footer Credit */}
              <div className="text-[11px] font-medium text-[#a09c94] dark:text-white/40 pt-6">
                Built with Intelligence · Noska AI
              </div>
            </div>
          ) : (
            /* Active Chat Stream */
            <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 space-y-4 relative">
              {messages.map((m, i) => {
                const isAnchorTarget = (i === messages.length - 2 && m.role === 'user') || (i === messages.length - 1 && m.role === 'user');
                return (
                  <div key={i} ref={isAnchorTarget ? lastUserMsgRef : undefined}>
                    <ChatMessage
                      message={m}
                      index={i}
                      total={messages.length}
                      isLastAi={i === messages.length - 1 && m.role === "ai"}
                      isStreaming={i === messages.length - 1 && activity.isGenerating}
                      onInsertBelow={handleInsertBelow}
                      onReplace={handleReplace}
                      onCopy={handleCopy}
                      onBranch={handleBranch}
                      onReaction={handleReaction}
                      onRetry={() => {
                        if (m.role === 'user') {
                          const prior = messages.slice(0, i);
                          handleSend(m.text, undefined, prior);
                        } else {
                          const lastUser = [...messages.slice(0, i + 1)].reverse().find(msg => msg.role === 'user');
                          if (lastUser?.text) {
                            const userIdx = messages.indexOf(lastUser);
                            const prior = userIdx !== -1 ? messages.slice(0, userIdx) : [];
                            handleSend(lastUser.text, undefined, prior);
                          }
                        }
                      }}
                      onEditAndResend={(editIndex, newText) => {
                        const prior = messages.slice(0, editIndex);
                        handleSend(newText, undefined, prior);
                      }}
                    />
                  </div>
                );
              })}

              {/* Noska Thinking / Activity Indicator */}
              <NoskaThinkingIndicator
                state={activity.state}
                agentName={currentAgent.name}
                visible={activity.isThinking || (activity.isActive && messages[messages.length - 1]?.text === "...")}
              />

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
            </div>
          )}

          {/* Floating Scroll-to-Latest Button */}
          <ScrollToLatestButton
            visible={chatScroll.isDetached && activity.isGenerating}
            onClick={chatScroll.scrollToLatest}
          />

          {/* Bottom Prompt Composer when in active chat */}
          {hasMessages && (
            <div className="max-w-3xl mx-auto w-full sticky bottom-0 z-30 bg-gradient-to-t from-[#faf9f6] via-[#faf9f6]/95 to-transparent dark:from-[#121214] dark:via-[#121214]/95 pt-2 pb-2">
              <PromptComposer
                prompt={prompt}
                setPrompt={setPrompt}
                onSend={handleSend}
                loading={loading}
                onAbort={() => {
                  abortControllerRef.current?.abort();
                  activity.setActivity('cancelled');
                }}
                currentAgent={currentAgent}
                page={page}
                onOpenKeySetup={(providerId) => {
                  if (providerId) setKeyProvider(providerId);
                  setShowKeyModal(true);
                }}
                onToast={onToast}
              />
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Context Panel */}
      <ContextPanel
        page={page}
        auditEvents={auditEvents}
        open={showContext}
        onToggle={() => setShowContext(!showContext)}
      />

      {/* Built-in AI Provider & Model Setup Dialog */}
      <AnimatePresence>
        {showKeyModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowKeyModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-3xl bg-[#fcfbf9] dark:bg-[#18181a] border border-[#e8e4db] dark:border-[#2e2e33] p-6 shadow-2xl space-y-5 text-left"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#1c1b18] dark:text-[#ececec]">AI Provider & Model Setup</h3>
                      <p className="text-xs text-[#706c64] dark:text-[#a09c94]">
                        Connect cloud AI engines or local offline models (Ollama / LM Studio).
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="p-1.5 rounded-xl text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white hover:bg-[#ede8df] dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Provider Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#706c64] dark:text-[#a09c94]">
                    Select Provider
                  </label>
                  <span className="text-[11px] text-[#706c64] dark:text-[#a09c94] font-medium">
                    {providers.find((p) => p.id === keyProvider)?.type === "local" ? "💻 Local Offline Engine" : "☁️ Cloud Provider"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1.5 border border-[#e8e4db] dark:border-[#2e2e33] rounded-2xl bg-[#ede8df]/30 dark:bg-[#232328]/30 scrollbar-thin">
                  {providers.map((p) => {
                    const isSelected = keyProvider === p.id;
                    const isLocal = p.type === "local";
                    const isConfigured = isLocal || Boolean(aiManager.config?.providers?.[p.id]?.apiKey);

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setKeyProvider(p.id);
                          if (isLocal) {
                            setKeyInput(p.baseUrl);
                          } else {
                            setKeyInput(aiManager.config?.providers?.[p.id]?.apiKey || "");
                          }
                        }}
                        className={`p-2.5 rounded-2xl text-xs transition-all text-left flex items-center justify-between gap-2.5 border cursor-pointer ${
                          isSelected
                            ? "bg-[#ede8df] dark:bg-white/15 text-[#1c1b18] dark:text-white border-[#ded8cb] dark:border-white/20 font-semibold shadow-xs"
                            : "bg-white/70 dark:bg-[#232328]/80 text-[#1c1b18] dark:text-[#ececec] hover:bg-[#ede8df]/60 dark:hover:bg-white/5 border-[#e8e4db] dark:border-[#2e2e33]"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <ProviderIcon providerId={p.id} className="size-7 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="truncate font-semibold text-[11px]">{p.name}</span>
                            <span className="text-[9px] text-[#706c64] dark:text-[#a09c94] truncate">
                              {isLocal ? "Local Engine" : `${p.models?.length || 0} models`}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center">
                          {isConfigured ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold">
                              Ready
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-700 dark:text-sky-400 font-medium">
                              Setup
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Provider Configurator Form */}
              {(() => {
                const currentProvider = providers.find((p) => p.id === keyProvider);
                const isLocal = currentProvider?.type === "local";
                const keyUrls: Record<string, string> = {
                  openrouter: "https://openrouter.ai/keys",
                  gemini: "https://aistudio.google.com/app/apikey",
                  openai: "https://platform.openai.com/api-keys",
                  anthropic: "https://console.anthropic.com/settings/keys",
                  groq: "https://console.groq.com/keys",
                  deepseek: "https://platform.deepseek.com/api_keys",
                  mistral: "https://console.mistral.ai/api-keys/",
                  together: "https://api.together.ai/settings/api-keys",
                  xai: "https://console.x.ai/",
                  nvidia: "https://build.nvidia.com/"
                };
                const keyUrl = currentProvider ? keyUrls[currentProvider.id] : null;

                if (isLocal) {
                  return (
                    <div className="space-y-2 p-3.5 rounded-2xl bg-[#ede8df]/40 dark:bg-[#232328]/50 border border-[#e8e4db] dark:border-[#2e2e33]">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[#1c1b18] dark:text-[#ececec]">
                          {currentProvider?.name} Server URL
                        </label>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setKeyInput("http://localhost:11434")}
                            className="px-2 py-0.5 rounded-md bg-[#ede8df] dark:bg-white/10 text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white transition font-mono cursor-pointer"
                          >
                            Ollama (:11434)
                          </button>
                          <button
                            type="button"
                            onClick={() => setKeyInput("http://localhost:1234/v1")}
                            className="px-2 py-0.5 rounded-md bg-[#ede8df] dark:bg-white/10 text-[#706c64] dark:text-[#a09c94] hover:text-[#1c1b18] dark:hover:text-white transition font-mono cursor-pointer"
                          >
                            LM Studio (:1234)
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        autoFocus
                        placeholder={currentProvider?.baseUrl || "http://localhost:11434"}
                        value={keyInput || currentProvider?.baseUrl || ""}
                        onChange={(e) => setKeyInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveApiKey();
                        }}
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#1c1b18] border border-[#e8e4db] dark:border-[#2e2e33] text-xs text-[#1c1b18] dark:text-[#ececec] placeholder:text-[#a09c94] outline-none focus:border-[#1c1b18]/40 dark:focus:border-white/40 transition-colors font-mono"
                      />
                      <p className="text-[11px] text-[#706c64] dark:text-[#a09c94]">
                        Zero cloud keys required. Ensure your local daemon is running locally on your device.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2 p-3.5 rounded-2xl bg-[#ede8df]/40 dark:bg-[#232328]/50 border border-[#e8e4db] dark:border-[#2e2e33]">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#1c1b18] dark:text-[#ececec]">
                        {currentProvider?.name} API Key
                      </label>
                      {keyUrl && (
                        <a
                          href={keyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-medium cursor-pointer"
                        >
                          <span>Get {currentProvider?.name} Key</span>
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="password"
                        autoFocus
                        placeholder={currentProvider?.keyPlaceholder || "Paste API key..."}
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveApiKey();
                        }}
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#1c1b18] border border-[#e8e4db] dark:border-[#2e2e33] text-xs text-[#1c1b18] dark:text-[#ececec] placeholder:text-[#a09c94] outline-none focus:border-[#1c1b18]/40 dark:focus:border-white/40 transition-colors font-mono pr-8"
                      />
                    </div>
                    <p className="text-[11px] text-[#706c64] dark:text-[#a09c94]">
                      Stored locally in your browser and used securely for workspace reasoning & completions.
                    </p>
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e8e4db] dark:border-[#2e2e33]">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#706c64] dark:text-[#a09c94] hover:bg-[#ede8df] dark:hover:bg-white/10 transition-colors cursor-pointer"
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
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-[#1c1b18] hover:bg-black dark:bg-white dark:text-[#18181a] text-white transition-all disabled:opacity-40 cursor-pointer shadow-xs"
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
