import { useState, useEffect, useRef, useMemo } from "react";
import { Portal } from "@/components/ui/Portal";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight, Users, FileText, UserCog, Bot, Activity } from "lucide-react";
import { COMMAND_ACTIONS, NAV_ITEMS } from "@/lib/navigation";
import { useAuth } from "@/lib/auth";
import { hasRole, can, type AdminCapability } from "@/lib/rbac";
import { useUsers, usePages, useTeams, useAuditEvents } from "@/lib/queries";
import type { AdminUserRow, PageRow, DbTeam } from "@/lib/queries";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  group: string;
  navigate: string;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: users } = useUsers();
  const { data: pages } = usePages();
  const { data: teams } = useTeams();
  const { data: events } = useAuditEvents(100);

  const navResults: SearchResult[] = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return NAV_ITEMS
      .filter((item) => can(user, item.capability as AdminCapability) && (
        item.label.toLowerCase().includes(q) ||
        item.to.toLowerCase().includes(q)
      ))
      .slice(0, 3)
      .map((item) => ({
        id: `nav-${item.to}`,
        label: item.label,
        sublabel: item.to,
        icon: <item.icon className="h-4 w-4 text-muted-foreground" />,
        group: "Navigation",
        navigate: item.to,
      }));
  }, [query, user]);

  const userResults: SearchResult[] = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    return (users ?? [])
      .filter((u: AdminUserRow) => u.user_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q))
      .slice(0, 4)
      .map((u: AdminUserRow) => ({
        id: `user-${u.id}`,
        label: u.user_name || "Unnamed",
        sublabel: u.email || u.username || u.id.slice(0, 16),
        icon: <Users className="h-4 w-4 text-blue-500" />,
        group: "Users",
        navigate: `/users/${u.id}`,
      }));
  }, [query, users]);

  const pageResults: SearchResult[] = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    return (pages ?? [])
      .filter((p: PageRow) => p.title?.toLowerCase().includes(q))
      .slice(0, 3)
      .map((p: PageRow) => ({
        id: `page-${p.id}`,
        label: p.title || "Untitled",
        sublabel: `Created ${p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}`,
        icon: <FileText className="h-4 w-4 text-emerald-500" />,
        group: "Pages",
        navigate: `/pages`,
      }));
  }, [query, pages]);

  const teamResults: SearchResult[] = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    return (teams ?? [])
      .filter((t: DbTeam) => t.name?.toLowerCase().includes(q))
      .slice(0, 2)
      .map((t: DbTeam) => ({
        id: `team-${t.id}`,
        label: t.name,
        sublabel: `${t.member_count ?? 0} members`,
        icon: <UserCog className="h-4 w-4 text-violet-500" />,
        group: "Teams",
        navigate: `/teams`,
      }));
  }, [query, teams]);

  const allResults = useMemo(() => {
    const nav = navResults.filter((r) => r.label.toLowerCase().includes(query.toLowerCase()));
    return [...userResults, ...pageResults, ...teamResults, ...nav];
  }, [userResults, pageResults, teamResults, navResults, query]);

  const actionResults = useMemo(() => {
    if (!query.trim()) return COMMAND_ACTIONS.filter((a) => !a.requiresRole || hasRole(user, a.requiresRole)).slice(0, 5);
    const q = query.toLowerCase();
    return COMMAND_ACTIONS.filter(
      (a) => (!a.requiresRole || hasRole(user, a.requiresRole)) &&
        (a.label.toLowerCase().includes(q) || a.keywords?.some((k) => k.toLowerCase().includes(q)))
    );
  }, [query, user]);

  const combined = useMemo(() => {
    const items: Array<{ type: "search" | "action"; data: SearchResult | typeof actionResults[0]; key: string }> = [];
    if (query.trim()) {
      allResults.forEach((r) => items.push({ type: "search", data: r, key: r.id }));
    }
    actionResults.forEach((a) => items.push({ type: "action", data: a, key: a.id }));
    return items;
  }, [allResults, actionResults, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  const handleSelect = (index: number) => {
    const item = combined[index];
    if (!item) return;
    if (item.type === "search") {
      const r = item.data as SearchResult;
      navigate(r.navigate);
    } else {
      const a = item.data as typeof actionResults[0];
      if (a.perform === "navigate" && a.payload) navigate(a.payload);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, combined.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); handleSelect(selectedIndex); }
    if (e.key === "Escape") { onClose(); }
  };

  return (
    <AnimatePresence>
      {open && (
        <Portal>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2"
          >
            <div className="overflow-hidden rounded-xl border bg-card shadow-2xl">
              <div className="flex items-center gap-3 border-b px-4">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search users, pages, teams, or commands..."
                  className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <kbd className="hidden rounded border bg-muted px-1.5 text-[10px] text-muted-foreground sm:block">ESC</kbd>
              </div>
              <div className="max-h-96 overflow-y-auto p-2">
                {combined.length === 0 && (
                  <p className="p-3 text-center text-sm text-muted-foreground">No results found.</p>
                )}

                {query.trim() && allResults.length > 0 && (
                  <>
                    <p className="px-3 py-1 text-[10px] font-semibold uppercase text-muted-foreground">Results</p>
                    {allResults.map((r, i) => (
                      <button
                        key={r.id}
                        onClick={() => { navigate(r.navigate); onClose(); }}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                          i === selectedIndex ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"
                        }`}
                      >
                        {r.icon}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{r.label}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{r.sublabel}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{r.group}</span>
                      </button>
                    ))}
                  </>
                )}

                {actionResults.length > 0 && (
                  <>
                    <p className="px-3 py-1 text-[10px] font-semibold uppercase text-muted-foreground mt-1">
                      {query.trim() ? "Commands" : "Quick Actions"}
                    </p>
                    {actionResults.map((action, i) => {
                      const idx = allResults.length + i;
                      return (
                        <button
                          key={action.id}
                          onClick={() => { if (action.perform === "navigate" && action.payload) navigate(action.payload); onClose(); }}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                            idx === selectedIndex ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"
                          }`}
                        >
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1">{action.label}</span>
                          <span className="text-[10px] text-muted-foreground">{action.group}</span>
                          {action.shortcut && <kbd className="rounded border bg-muted px-1.5 text-[10px]">{action.shortcut}</kbd>}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
              {combined.length > 0 && (
                <div className="border-t px-4 py-2 text-[10px] text-muted-foreground">
                  <span className="rounded bg-muted px-1">↑↓</span> Navigate{' '}
                  <span className="rounded bg-muted px-1">↵</span> Select{' '}
                  <span className="rounded bg-muted px-1">ESC</span> Close
                </div>
              )}
            </div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
}
