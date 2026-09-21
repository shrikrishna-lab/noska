import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Search, UserPlus, X } from "lucide-react";
import { getAuthUserId } from "../../lib/supabase";
import { searchUsersByUsername } from "../../lib/supabaseService";
import {
  inviteWorkspaceMember,
  listWorkspaceMembers,
  removeWorkspaceMember,
  type WorkspaceMember,
  type WorkspaceRow,
} from "../../features/workspaces/service";

export interface WorkspaceMembersModalProps {
  workspace: WorkspaceRow | null;
  isOpen: boolean;
  onClose: () => void;
  onChanged?: () => void;
  onToast?: (message: string) => void;
  locked?: boolean;
}

export function WorkspaceMembersModal({
  workspace,
  isOpen,
  onClose,
  onChanged,
  onToast,
  locked = false,
}: WorkspaceMembersModalProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ userId: string; username: string; userName: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      setMembers(await listWorkspaceMembers(workspace.id));
    } catch {
      // Leave the previous list visible; membership reads must never crash UI.
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setSuggestions([]);
    void getAuthUserId().then(setSessionId).catch(() => setSessionId(null));
    void refresh();
  }, [isOpen, workspace, refresh]);

  useEffect(() => {
    if (!query.trim() || locked) {
      setSuggestions([]);
      return;
    }
    const clean = query.trim().replace(/^@/, "");
    if (clean.length < 1) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchUsersByUsername(clean, 6);
        const known = new Set(members.map((m) => m.user_id));
        setSuggestions(results.filter((r) => !known.has(r.userId)).slice(0, 6));
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, members, locked]);

  if (!isOpen || !workspace) return null;

  const isOwner = !!sessionId && workspace.owner_id === sessionId;

  const handleInvite = async (userId: string, label: string) => {
    if (locked || busy) return;
    setBusy(true);
    try {
      await inviteWorkspaceMember(workspace.id, userId);
      setQuery("");
      setSuggestions([]);
      await refresh();
      onChanged?.();
      onToast?.(`Added ${label} to "${workspace.name}". They can now read this workspace's pages.`);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "Could not add member.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (userId: string, label: string) => {
    if (locked || busy) return;
    setBusy(true);
    try {
      await removeWorkspaceMember(workspace.id, userId);
      await refresh();
      onChanged?.();
      onToast?.(`Removed ${label} from "${workspace.name}".`);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "Could not remove member.");
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 select-none">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        className="relative w-full max-w-md rounded-2xl border border-white/80 dark:border-white/10 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Members · {workspace.name}</h2>
          <button onClick={onClose} className="h-7 w-7 rounded-md hover:bg-black/5 dark:hover:bg-white/10 grid place-items-center text-neutral-500" title="Close">
            <X size={14} />
          </button>
        </div>
        <p className="text-[11px] text-neutral-500 mb-3">
          {locked
            ? "Workspace locked — membership is read-only."
            : "Members can read this workspace's pages. Editing still needs a per-page grant."}
        </p>

        {!locked && isOwner && (
          <div className="relative mb-3">
            <div className="flex items-center gap-1.5 rounded-xl bg-neutral-100/70 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] px-2 py-1">
              <Search size={13} className="text-neutral-400 ml-1 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Invite by username..."
                className="min-w-0 flex-1 bg-transparent px-1 py-1 text-xs outline-none placeholder:text-neutral-400"
              />
              <UserPlus size={13} className="text-neutral-400 mr-1 shrink-0" />
            </div>
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-xl border border-black/[0.06] dark:border-white/10 bg-white dark:bg-neutral-900 shadow-xl overflow-hidden z-10">
                {suggestions.map((s) => (
                  <button
                    key={s.userId}
                    disabled={busy}
                    onClick={() => void handleInvite(s.userId, `@${s.username}`)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 cursor-pointer"
                  >
                    <span className="text-xs font-semibold">@{s.username}</span>
                    <span className="text-[10px] text-neutral-400 truncate">{s.userName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="max-h-[240px] overflow-y-auto space-y-1">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-black/[0.03] dark:bg-white/5">
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              {(workspace.owner_id || "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">Owner</div>
              <div className="text-[10px] text-neutral-400 truncate">{workspace.owner_id}</div>
            </div>
          </div>
          {loading ? (
            <div className="px-2 py-3 text-[11px] text-neutral-400">Loading members…</div>
          ) : (
            members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/5">
                <div className="h-7 w-7 rounded-full bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                  {((m.username || m.user_name || m.user_id) || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{m.username ? `@${m.username}` : (m.user_name || "Member")}</div>
                  <div className="text-[10px] text-neutral-400 truncate">{m.user_id}</div>
                </div>
                {!locked && (isOwner || m.user_id === sessionId) && (
                  <button
                    disabled={busy}
                    onClick={() => void handleRemove(m.user_id, m.username ? `@${m.username}` : "member")}
                    className="text-[10px] text-neutral-400 hover:text-rose-500 px-1.5 py-0.5 rounded disabled:opacity-50 cursor-pointer"
                    title={m.user_id === sessionId ? "Leave workspace" : "Remove member"}
                  >
                    {m.user_id === sessionId ? "Leave" : "Remove"}
                  </button>
                )}
              </div>
            ))
          )}
          {!loading && members.length === 0 && (
            <div className="px-2 py-3 text-[11px] text-neutral-400">No members yet — only the owner can see this workspace.</div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
