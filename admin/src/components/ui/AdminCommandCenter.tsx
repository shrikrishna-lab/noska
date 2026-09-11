import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2, Ban, Folder, Star, Mail, Megaphone, Cloud, RotateCcw,
  ShieldAlert, FileText, BarChart2, Zap, CheckCircle2, AlertCircle, Loader2, X
} from "lucide-react";
import { cn, formatNumber, formatRelativeTime } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useIslandNotification } from "./DynamicIslandNotification";
import { hasRole, type AdminRole } from "@/lib/rbac";
import { useNavigate } from "react-router-dom";
import { useEmailCampaigns, useAdminAuditLog, useAdminLoginAttempts, useDashboardKpis, useAuditEvents, useLogAdminAction } from "@/lib/queries";
import { useOverviewMetrics, useSessionData } from "@/lib/monitoring/hooks";

export type CommandCenterType =
  | "delete_user"
  | "ban_user"
  | "delete_workspace"
  | "promote_user"
  | "send_campaign"
  | "broadcast"
  | "backup"
  | "restore"
  | "security_alert"
  | "audit_log"
  | "analytics"
  | "quick_actions";

export interface CommandCenterOptions {
  type: CommandCenterType;
  title?: string;
  description?: string;
  meta?: any;
  onConfirm?: (data?: any) => Promise<void> | void;
}

interface CommandCenterContextType {
  trigger: (options: CommandCenterOptions) => void;
  close: () => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  setStatus: React.Dispatch<React.SetStateAction<"idle" | "loading" | "success" | "error">>;
  state: {
    isOpen: boolean;
    isPill: boolean;
    options: CommandCenterOptions | null;
    status: "idle" | "loading" | "success" | "error";
    successMessage?: string;
    errorMessage?: string;
  };
}

const CommandCenterContext = createContext<CommandCenterContextType | null>(null);

export function useCommandCenter() {
  const context = useContext(CommandCenterContext);
  if (!context) {
    throw new Error("useCommandCenter must be used within a CommandCenterProvider");
  }
  return context;
}

export function CommandCenterProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPill, setIsPill] = useState(true);
  const [options, setOptions] = useState<CommandCenterOptions | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const island = useIslandNotification();

  const trigger = useCallback((opts: CommandCenterOptions) => {
    setOptions(opts);
    setStatus("idle");
    setIsOpen(true);
    setIsPill(false);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsPill(true);
    setStatus("idle");
  }, []);

  const showSuccess = useCallback((msg: string) => {
    setStatus("success");
    setSuccessMessage(msg);
    // Dismiss/close command center immediately and show premium notification
    close();
    island.success(msg);
  }, [close, island]);

  const showError = useCallback((msg: string) => {
    setStatus("error");
    setErrorMessage(msg);
    // Trigger premium error notification
    island.error("Operation Failed", msg);
  }, [island]);

  return (
    <CommandCenterContext.Provider
      value={{
        trigger,
        close,
        showSuccess,
        showError,
        setStatus,
        state: { isOpen, isPill, options, status, successMessage, errorMessage }
      }}
    >
      {children}
    </CommandCenterContext.Provider>
  );
}

export function AdminCommandCenter() {
  const { state, close, trigger, showSuccess, showError, setStatus } = useCommandCenter();
  const { isOpen, isPill, options, status, successMessage, errorMessage } = state;
  const { user } = useAuth();
  const navigate = useNavigate();
  const island = useIslandNotification();

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [holdProgress, setHoldProgress] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [duration, setDuration] = useState("permanent");
  const [role, setRole] = useState("admin");
  const [currentTime, setCurrentTime] = useState("");

  const { data: campaigns } = useEmailCampaigns();
  const { data: adminAudit } = useAdminAuditLog(10);
  const { data: loginAttempts } = useAdminLoginAttempts(20);
  const { data: auditEvents } = useAuditEvents(1);
  const { data: kpis } = useDashboardKpis();
  const { data: overview } = useOverviewMetrics();
  const { data: session } = useSessionData();
  const logAdminAction = useLogAdminAction();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<number | null>(null);
  const holdStartRef = useRef<number>(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && options?.type !== "backup") {
        close();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close, options]);

  useEffect(() => {
    if (isOpen && options?.type === "backup" && status === "loading") {
      island.progress("Recording Backup...", 60, "Recording backup action in audit log...", "db-backup");
      return () => {};
    }
  }, [isOpen, options?.type, status, island]);

  const startHold = () => {
    if (status === "loading" || status === "success") return;
    holdStartRef.current = Date.now();
    const tick = () => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min((elapsed / 1000) * 100, 100);
      setHoldProgress(progress);
      if (progress >= 100) {
        handleConfirm();
        return;
      }
      holdTimerRef.current = requestAnimationFrame(tick);
    };
    holdTimerRef.current = requestAnimationFrame(tick);
  };

  const stopHold = () => {
    if (holdTimerRef.current) cancelAnimationFrame(holdTimerRef.current);
    setHoldProgress(0);
  };

  const handleConfirm = async () => {
    if (!options?.onConfirm) return;
    try {
      if (options.type === "backup") {
        setStatus("loading");
        try {
          await logAdminAction.mutateAsync({
            action: "backup_created",
            target_type: "system",
            target_name: "Database",
            detail: { requested_at: new Date().toISOString() },
          });
          await options.onConfirm({ progress: 100 });
          showSuccess("Backup recorded in audit log");
          island.success("Backup Recorded", "Backup action logged successfully.", { taskId: "db-backup" });
        } catch (err: any) {
          showError(err?.message || "Backup failed. Please try again.");
          setStatus("idle");
          return;
        }
        return;
      }

      if (options.type === "restore") {
        setStatus("loading");
        try {
          await logAdminAction.mutateAsync({
            action: "restore_initiated",
            target_type: "system",
            target_name: options.meta?.snapshot || "Backup",
            detail: { requested_at: new Date().toISOString() },
          });
          await options.onConfirm();
          showSuccess("Restore request recorded in audit log");
          island.success("Restore Recorded", "Restore request logged successfully.", { taskId: "db-restore" });
        } catch (err: any) {
          showError(err?.message || "Restore failed. Please try again.");
          setStatus("idle");
          return;
        }
        return;
      }

      setStatus("loading");
      const payload = {
        input: inputValue,
        duration,
        role
      };
      await options.onConfirm(payload);
    } catch (err: any) {
      showError(err?.message || "Operation failed. Please try again.");
    }
  };

  useEffect(() => {
    setInputValue("");
    setHoldProgress(0);
  }, [options]);



  const renderTemplate = () => {
    if (!options) return null;

    switch (options.type) {
      case "delete_user":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
                <Trash2 className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">🗑 Delete User</h3>
                <p className="text-xs text-zinc-400">{options.meta?.email || "User Account"}</p>
              </div>
            </div>
            <div className="p-3.5 bg-white/[0.03] rounded-2xl border border-white/[0.05]">
              <p className="text-xs text-zinc-300 mb-2 font-medium">Deleting this user removes:</p>
              <ul className="text-xs text-zinc-400 space-y-1.5 pl-4 list-disc">
                <li>Profile details & login credentials</li>
                <li>Workspaces and associated databases</li>
                <li>Custom templates</li>
                <li>Active security sessions</li>
              </ul>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button onClick={close} className="flex-1 py-2 text-xs font-semibold rounded-xl border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onMouseDown={startHold}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                onTouchStart={startHold}
                onTouchEnd={stopHold}
                className="relative flex-1 py-2 text-xs font-semibold rounded-xl overflow-hidden select-none bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/20 active:scale-[0.98] transition-transform"
              >
                <div className="absolute left-0 top-0 h-full bg-white/25 transition-all duration-75" style={{ width: `${holdProgress}%` }} />
                <span className="relative z-10">
                  {holdProgress > 0 ? `Confirming (${Math.round(holdProgress)}%)` : "Hold to Delete"}
                </span>
              </button>
            </div>
          </div>
        );

      case "ban_user":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
                <Ban className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">🚫 Ban User</h3>
                <p className="text-xs text-zinc-400">{options.meta?.email || "User Account"}</p>
              </div>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Reason</label>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Spamming or abuse of database templates"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-white/[0.08] bg-zinc-900/60 text-white placeholder-zinc-650 outline-none focus:border-zinc-700/80 focus:ring-1 focus:ring-zinc-700/50"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {["7_days", "30_days", "permanent"].map((dur) => (
                    <button
                      key={dur}
                      onClick={() => setDuration(dur)}
                      className={cn(
                         "py-1.5 text-xs rounded-lg border transition-all font-medium capitalize",
                         duration === dur
                           ? "border-red-500/40 bg-red-500/10 text-red-400"
                           : "border-white/10 bg-white/[0.02] hover:bg-white/5 text-zinc-350 hover:text-white"
                      )}
                    >
                      {dur.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button onClick={close} className="flex-1 py-2 text-xs font-semibold rounded-xl border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirm} className="flex-1 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/20 hover:brightness-110 active:scale-[0.98] transition-all">
                Ban User
              </button>
            </div>
          </div>
        );

      case "delete_workspace":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                <Folder className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">🗂 Delete Workspace</h3>
                <p className="text-xs text-zinc-400">Workspace: {options.meta?.name || "—"}</p>
              </div>
            </div>
            <div className="p-3.5 bg-white/[0.03] rounded-2xl text-xs text-zinc-400 border border-white/[0.05] flex justify-between items-center">
              <span>Workspace Owner:</span>
              <span className="font-semibold text-zinc-200">{options.meta?.owner || "—"}</span>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button onClick={close} className="flex-1 py-2 text-xs font-semibold rounded-xl border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onMouseDown={startHold}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                onTouchStart={startHold}
                onTouchEnd={stopHold}
                className="relative flex-1 py-2 text-xs font-semibold rounded-xl overflow-hidden select-none bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/25 active:scale-[0.98] transition-transform"
              >
                <div className="absolute left-0 top-0 h-full bg-white/25 transition-all duration-75" style={{ width: `${holdProgress}%` }} />
                <span className="relative z-10">
                  {holdProgress > 0 ? `Confirming (${Math.round(holdProgress)}%)` : "Hold to Delete"}
                </span>
              </button>
            </div>
          </div>
        );

      case "promote_user":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                <Star className="h-6 w-6 text-amber-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">⭐ Promote User</h3>
                <p className="text-xs text-zinc-400">{options.meta?.name || "User Account"}</p>
              </div>
            </div>
            <div className="space-y-3.5">
              <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.05] rounded-2xl text-xs">
                <span className="text-zinc-400">Current Role:</span>
                <span className="font-semibold text-zinc-200">User</span>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">New Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {["moderator", "admin"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={cn(
                        "py-1.5 text-xs rounded-lg border transition-all font-medium capitalize",
                        role === r
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                          : "border-white/10 bg-white/[0.02] hover:bg-white/5 text-zinc-350 hover:text-white"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button onClick={close} className="flex-1 py-2 text-xs font-semibold rounded-xl border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirm} className="flex-1 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 hover:brightness-110 active:scale-[0.98] transition-all">
                Confirm Promote
              </button>
            </div>
          </div>
        );

      case "send_campaign":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <Mail className="h-6 w-6 text-blue-450" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">📧 Send Campaign</h3>
                <p className="text-xs text-zinc-400">{options.meta?.name || campaigns?.[0]?.name || "No campaign selected"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3.5 p-3.5 bg-white/[0.03] border border-white/[0.05] rounded-2xl text-xs">
              <div>
                <span className="text-zinc-450 block mb-0.5">Recipients</span>
                <span className="font-semibold text-zinc-200">{formatNumber(options.meta?.recipients ?? campaigns?.[0]?.recipients ?? 0)}</span>
              </div>
              <div>
                <span className="text-zinc-450 block mb-0.5">Status</span>
                <span className="font-semibold text-zinc-200">{options.meta?.status || campaigns?.[0]?.status || "—"}</span>
              </div>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button onClick={close} className="flex-1 py-2 text-xs font-semibold rounded-xl border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirm} className="flex-1 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:brightness-110 active:scale-[0.98] transition-all">
                Send Campaign
              </button>
            </div>
          </div>
        );

      case "broadcast":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                <Megaphone className="h-6 w-6 text-violet-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">📢 Broadcast Notice</h3>
                <p className="text-xs text-zinc-400">System Notification</p>
              </div>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Broadcast Message</label>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Server Maintenance scheduled at 12:00 AM UTC"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-white/[0.08] bg-zinc-900/60 text-white placeholder-zinc-650 outline-none focus:border-zinc-700/80 focus:ring-1 focus:ring-zinc-700/50"
                />
              </div>
              <div className="flex justify-between items-center p-3 bg-white/[0.03] border border-white/[0.05] rounded-2xl text-xs">
                <span className="text-zinc-400">Audience:</span>
                <span className="font-semibold text-zinc-200">All Active Users</span>
              </div>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button onClick={close} className="flex-1 py-2 text-xs font-semibold rounded-xl border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirm} className="flex-1 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25 hover:brightness-110 active:scale-[0.98] transition-all">
                Publish
              </button>
            </div>
          </div>
        );

      case "backup":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-sky-500/10 rounded-2xl border border-sky-500/20">
                <Cloud className="h-6 w-6 text-sky-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">☁ Database Backup</h3>
                <p className="text-xs text-zinc-400">Record a backup request in the admin audit log</p>
              </div>
            </div>
            {status === "loading" ? (
              <div className="space-y-3 bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Recording backup action in audit log...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <p className="text-xs text-zinc-400 leading-relaxed">This records a backup action in the admin audit log with the current admin identity and timestamp. No database changes are made.</p>
                <button
                  onClick={handleConfirm}
                  className="w-full py-2.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25 hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  Start Backup
                </button>
              </div>
            )}
          </div>
        );

      case "restore":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <RotateCcw className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">♻ Restore Backup</h3>
                <p className="text-xs text-zinc-400">System State Restore</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-white/[0.03] border border-white/[0.05] rounded-2xl text-xs">
              <div>
                <span className="text-zinc-450 block mb-0.5">Restore Point</span>
                <span className="font-semibold text-zinc-200">{options.meta?.date || "—"}</span>
              </div>
              <div>
                <span className="text-zinc-450 block mb-0.5">Snapshot</span>
                <span className="font-semibold text-zinc-200">{options.meta?.snapshot || "—"}</span>
              </div>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button onClick={close} className="flex-1 py-2 text-xs font-semibold rounded-xl border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirm} className="flex-1 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-[0.98] transition-all">
                Restore State
              </button>
            </div>
          </div>
        );

      case "security_alert":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20 animate-pulse">
                <ShieldAlert className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">🛡 Suspicious Activity</h3>
                <p className="text-xs text-red-450 font-medium">{(loginAttempts ?? []).length} failed login attempts recorded</p>
              </div>
            </div>
            <div className="p-3.5 bg-red-500/[0.02] border border-red-500/20 rounded-2xl text-xs space-y-2">
              <div className="flex justify-between items-center"><span className="text-zinc-400">Target Account:</span><span className="font-mono font-semibold text-zinc-200">{loginAttempts?.[0]?.email || "—"}</span></div>
              <div className="flex justify-between items-center"><span className="text-zinc-400">Last Attempt:</span><span className="font-mono text-zinc-200 font-semibold">{loginAttempts?.[0]?.attempted_at ? formatRelativeTime(loginAttempts[0].attempted_at) : "—"}</span></div>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button onClick={close} className="flex-1 py-2 text-xs font-semibold rounded-xl border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white transition-colors">
                Dismiss Alert
              </button>
              <button onClick={handleConfirm} className="flex-1 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25 hover:brightness-110 active:scale-[0.98] transition-all">
                Block Origin IP
              </button>
            </div>
          </div>
        );

      case "audit_log":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-zinc-800/60 rounded-2xl border border-zinc-700/40">
                <FileText className="h-6 w-6 text-zinc-300" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">📜 Audit Log Event</h3>
                <p className="text-xs text-zinc-400">Latest recorded action</p>
              </div>
            </div>
            <div className="p-3.5 bg-white/[0.03] border border-white/[0.05] rounded-2xl text-xs space-y-2">
              <div className="flex justify-between items-center"><span className="text-zinc-400">Actor:</span><span className="font-semibold text-zinc-250">{auditEvents?.[0]?.user_name || adminAudit?.[0]?.admin_name || "—"}</span></div>
              <div className="flex justify-between items-center"><span className="text-zinc-400">Action:</span><span className="font-semibold text-red-400">{auditEvents?.[0]?.action || adminAudit?.[0]?.action || "—"}</span></div>
              <div className="flex justify-between items-center"><span className="text-zinc-400">Time:</span><span className="font-semibold text-zinc-300">{auditEvents?.[0]?.created_at ? formatRelativeTime(auditEvents[0].created_at) : adminAudit?.[0]?.created_at ? formatRelativeTime(adminAudit[0].created_at) : "—"}</span></div>
            </div>
            <button onClick={close} className="w-full py-2 text-xs font-semibold rounded-xl border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white transition-colors">
              Close Detail
            </button>
          </div>
        );

      case "analytics":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <BarChart2 className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">📈 Live Analytics</h3>
                <p className="text-xs text-zinc-400">Noska cluster real-time metrics</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 bg-white/[0.03] border border-white/[0.04] rounded-2xl text-center">
                <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider mb-1">Live Users</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">{formatNumber(session?.liveUsers ?? overview?.usersOnline ?? 0)}</span>
              </div>
              <div className="p-3 bg-white/[0.03] border border-white/[0.04] rounded-2xl text-center">
                <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider mb-1">AI Today</span>
                <span className="text-lg font-bold text-zinc-200 font-mono">{formatNumber(kpis?.aiEventsToday ?? 0)}</span>
              </div>
              <div className="p-3 bg-white/[0.03] border border-white/[0.04] rounded-2xl text-center">
                <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider mb-1">Pageviews</span>
                <span className="text-lg font-bold text-blue-400 font-mono">{formatNumber(overview?.pageviews24h ?? 0)}</span>
              </div>
            </div>
            <button onClick={close} className="w-full py-2 text-xs font-semibold rounded-xl border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white transition-colors">
              Dismiss Panel
            </button>
          </div>
        );

      case "quick_actions":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                <Zap className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">⚡ Quick Actions</h3>
                <p className="text-xs text-zinc-400">Command Center shortcuts</p>
              </div>
            </div>
            <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
              {[{
                  label: "Create Admin Account",
                  requiresRole: "super_admin" as AdminRole,
                  action: () => { close(); navigate("/admin-accounts"); }
                },
                {
                  label: "Send Broadcast Notice",
                  requiresRole: "admin" as AdminRole,
                  action: () => { close(); navigate("/broadcasts"); }
                },
                {
                  label: "Start Database Backup",
                  requiresRole: "admin" as AdminRole,
                  action: () => { close(); navigate("/system-health"); }
                },
                { label: "Show Live Analytics", action: () => trigger({ type: "analytics" }) },
                { label: "View Audit Event Log", requiresRole: "developer" as AdminRole, action: () => { close(); navigate("/audit-logs"); } },
              ].filter((item) => !item.requiresRole || hasRole(user, item.requiresRole)).map((item, idx) => (
                <button
                  key={idx}
                  onClick={item.action}
                  className="w-full text-left px-3.5 py-2.5 text-xs rounded-xl hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] text-zinc-300 hover:text-white transition-all flex justify-between items-center font-medium"
                >
                  <span>{item.label}</span>
                  <span className="text-[9px] text-zinc-500 bg-white/[0.06] px-1.5 py-0.5 rounded-md font-mono">⌘{idx + 1}</span>
                </button>
              ))}
            </div>
            <button onClick={close} className="w-full py-2 text-xs font-semibold rounded-xl border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white transition-colors">
              Close Panel
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {options?.type !== "backup" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[99] bg-black/35 backdrop-blur-[5px] pointer-events-auto cursor-pointer"
              onClick={close}
            />
          )}

          <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] pointer-events-none w-full flex justify-center">
            <motion.div
              ref={containerRef}
              onMouseMove={handleMouseMove}
              layoutId="admin-command-center"
              initial={{ opacity: 0, scale: 0.92, y: -30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -30 }}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 28,
                mass: 0.85
              }}
              className={cn(
                "relative pointer-events-auto text-white transition-shadow duration-300 bg-[#050505] border-x border-b border-t-0 w-full max-w-[460px] p-6 rounded-b-[28px] rounded-t-none overflow-hidden",
                status === "error"
                  ? "border-red-500/50 animate-acc-shake shadow-[0_0_30px_rgba(239,68,68,0.3)]"
                  : "border-zinc-900 shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
              )}
            >
              <div className="absolute inset-0 bg-grain mix-blend-overlay opacity-[0.06] pointer-events-none" />

              <div
                className="absolute inset-0 glass-spotlight pointer-events-none"
                style={{
                  "--mouse-x": `${mousePos.x}px`,
                  "--mouse-y": `${mousePos.y}px`
                } as React.CSSProperties}
              />

              <motion.div layout className="relative z-10 w-full h-full text-left">
                {options?.type !== "backup" && (
                  <button
                    onClick={close}
                    className="absolute right-0 top-0 p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                <AnimatePresence mode="wait">
                  {status === "success" && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      className="flex flex-col items-center justify-center py-6 text-center space-y-3"
                    >
                      <div className="p-3 bg-emerald-500/10 rounded-full">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white font-sans">Success</h4>
                        <p className="text-xs text-zinc-400 mt-1">{successMessage || "Action completed successfully"}</p>
                      </div>
                    </motion.div>
                  )}

                  {status === "error" && errorMessage && (
                    <motion.div
                      key="error-box"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center py-4 text-center space-y-3"
                    >
                      <div className="p-2 bg-red-500/10 rounded-full">
                        <AlertCircle className="h-8 w-8 text-red-555" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-white">Operation Failed</h4>
                        <p className="text-xs text-red-400 mt-1">{errorMessage}</p>
                      </div>
                      <button
                        onClick={() => setStatus("idle")}
                        className="px-4 py-1.5 text-xs font-semibold rounded-xl border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white transition-colors"
                      >
                        Retry Action
                      </button>
                    </motion.div>
                  )}

                  {status === "idle" && (
                    <motion.div
                      key="template"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      {renderTemplate()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
