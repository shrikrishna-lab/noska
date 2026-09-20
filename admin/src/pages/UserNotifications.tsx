import { useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Bell,
  Check,
  CheckCircle2,
  Copy,
  Flame,
  Inbox,
  Laptop,
  Layers,
  Megaphone,
  Radio,
  Search,
  Send,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  X,
  AlertTriangle,
  Info,
  Activity,
  Heart,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Portal } from "@/components/ui/Portal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";
import { adminSelect } from "@/lib/queries";
import {
  useDeleteUserNotification,
  useSendUserNotification,
  useUserNotificationOverview,
} from "@/lib/userNotifications";
import { useAuth } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { NotificationPlatform } from "./NotificationPlatform";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
  },
};

const SEVERITY_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  info: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  success: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  warning: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  critical: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

function WhiteTactileKpi({
  label,
  value,
  hint,
  icon: Icon,
  accent = "amber",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof Bell;
  accent?: "amber" | "emerald" | "purple" | "rose";
}) {
  const accentStyles = {
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
  }[accent];

  return (
    <motion.div
      variants={itemVariants}
      className="group flex flex-col justify-between rounded-2xl border border-black/[0.06] bg-white p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] transform-gpu transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">{label}</span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${accentStyles}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="mt-2">
        <p className="text-2xl font-black tracking-tight text-zinc-900">{value}</p>
        {hint && <p className="text-[11px] text-zinc-400 font-medium truncate mt-0.5">{hint}</p>}
      </div>
    </motion.div>
  );
}

function ComposerModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const canSend = hasRole(user, "admin");
  const send = useSendUserNotification();
  const confirm = useConfirmDialog();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("broadcast");
  const [severity, setSeverity] = useState("info");
  const [broadcast, setBroadcast] = useState(true);
  const [userIdsText, setUserIdsText] = useState("");
  const [isTest, setIsTest] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const lookupUser = async () => {
    const query = lookupEmail.trim();
    if (!query) return;
    setLookingUp(true);
    try {
      let rows: { id: string; user_name: string | null; email: string | null }[] = [];

      // 1. Direct ID / UUID match
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query) || query.startsWith("user_")) {
        rows = await adminSelect<{ id: string; user_name: string | null; email: string | null }>(
          "user_profiles",
          "id,user_name,email",
          { eq: ["id", query], limit: 1 },
        );
      }

      // 2. Email match
      if (rows.length === 0 && query.includes("@")) {
        rows = await adminSelect<{ id: string; user_name: string | null; email: string | null }>(
          "user_profiles",
          "id,user_name,email",
          { eq: ["email", query.toLowerCase()], limit: 1 },
        );
      }

      // 3. Username match
      if (rows.length === 0) {
        rows = await adminSelect<{ id: string; user_name: string | null; email: string | null }>(
          "user_profiles",
          "id,user_name,email",
          { eq: ["user_name", query], limit: 1 },
        );
      }

      // 4. Fallback Email match (case-insensitive email without @ typed)
      if (rows.length === 0 && !query.includes("@")) {
        rows = await adminSelect<{ id: string; user_name: string | null; email: string | null }>(
          "user_profiles",
          "id,user_name,email",
          { eq: ["email", query.toLowerCase()], limit: 1 },
        );
      }

      if (rows.length === 0) {
        // If it's a valid formatted ID or Clerk ID, allow adding directly
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query) || query.startsWith("user_")) {
          setUserIdsText((prev) => {
            const existing = new Set(prev.split(/[\s,]+/).filter(Boolean));
            existing.add(query);
            return [...existing].join(", ");
          });
          toast.success(`Added target ID: ${query}`);
          setLookupEmail("");
        } else {
          toast.error(`No user found for "${query}" (checked username, email & ID)`);
        }
      } else {
        const found = rows[0];
        setUserIdsText((prev) => {
          const existing = new Set(prev.split(/[\s,]+/).filter(Boolean));
          existing.add(found.id);
          return [...existing].join(", ");
        });
        toast.success(`Added ${found.user_name || found.email || found.id}`);
        setLookupEmail("");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lookup failed");
    }
    setLookingUp(false);
  };

  const handleSubmit = async () => {
    if (!canSend || !title.trim() || submitting || (isTest && broadcast)) return;
    const userIds = [...new Set(userIdsText.split(/[\s,]+/).filter(Boolean))];
    if (userIds.length > 500) {
      toast.error("Target at most 500 users per send");
      return;
    }
    if (!broadcast && userIds.length === 0) {
      toast.error("Add at least one target user id or enable Broadcast");
      return;
    }
    const ok = await confirm.confirm(
      broadcast
        ? {
            title: "Broadcast to ALL active users?",
            description: `“${title}” will appear in the Notification Center of every user across Web and Desktop immediately. ${isTest ? "Marked as TEST." : ""}`,
            variant: "warning",
            confirmText: "Broadcast Now",
          }
        : {
            title: `Deliver to ${userIds.length} user${userIds.length === 1 ? "" : "s"}?`,
            description: `“${title}” will be delivered directly to their Notification Center${isTest ? " as a labelled TEST" : ""}.`,
            variant: "confirm",
            confirmText: "Send Notification",
          },
    );
    if (!ok) return;

    setSubmitting(true);
    send.mutate(
      {
        title: title.trim(),
        body: body.trim(),
        category,
        severity,
        broadcast,
        isTest,
        userIds: broadcast ? [] : userIds,
      },
      {
        onSuccess: (res) => {
          toast.success(`Dispatched to ${res.count} user${res.count === 1 ? "" : "s"}`);
          onClose();
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to dispatch notification");
          setSubmitting(false);
        },
      },
    );
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-black/[0.08] bg-white/95 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.18)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_6px_20px_rgba(245,158,11,0.3)]">
                <Send className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">Create In-App Notification</h3>
                <p className="text-xs text-zinc-500">Dispatch live alerts directly into user notification inboxes</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              disabled={submitting}
              className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>

          {/* Apple-Style Live Dynamic Capsule Preview */}
          <div className="my-4 rounded-2xl border border-black/[0.06] bg-zinc-50/70 p-3.5 shadow-inner">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-400 mb-2 uppercase tracking-wider">
              <span>Live Apple-Grade Preview</span>
              <span className="flex items-center gap-1 text-amber-600">
                <Sparkles className="h-3 w-3" /> Realtime Capsule
              </span>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-white p-3.5 border border-black/[0.06] shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shrink-0 shadow-xs">
                <Bell className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isTest && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800">
                        TEST
                      </span>
                    )}
                    <p className="font-extrabold text-xs text-zinc-900 truncate">
                      {title.trim() || "Notification Title Preview"}
                    </p>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">now</span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
                  {body.trim() || "Message body preview will render here across Desktop & Web clients."}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="composer-title" className="text-xs font-bold text-zinc-700">Notification Title</Label>
              <Input
                id="composer-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Workspace Migration Complete"
                className="h-10 text-xs rounded-xl bg-white border-zinc-200/90 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                maxLength={140}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="composer-body" className="text-xs font-bold text-zinc-700">Message Body</Label>
              <Textarea
                id="composer-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe details or next actions..."
                rows={3}
                className="text-xs rounded-xl bg-white border-zinc-200/90 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-700">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-white border-zinc-200/90">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-zinc-200">
                    <SelectItem value="broadcast">📢 General Broadcast</SelectItem>
                    <SelectItem value="system">⚙️ System Alert</SelectItem>
                    <SelectItem value="feature">✨ Feature Update</SelectItem>
                    <SelectItem value="billing">💳 Billing / Account</SelectItem>
                    <SelectItem value="security">🛡️ Security Alert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-700">Severity</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-white border-zinc-200/90">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-zinc-200">
                    <SelectItem value="info">🔵 Info</SelectItem>
                    <SelectItem value="success">🟢 Success</SelectItem>
                    <SelectItem value="warning">🟡 Warning</SelectItem>
                    <SelectItem value="critical">🔴 Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Broadcast Switch Card */}
            <div className="flex items-center justify-between rounded-2xl border border-black/[0.06] bg-zinc-50/70 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                  {broadcast ? <Megaphone className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-900">Broadcast to all active users</p>
                  <p className="text-[11px] text-zinc-500">Turn off to target explicit users by username, email, or user ID.</p>
                </div>
              </div>
              <Switch checked={broadcast} onCheckedChange={setBroadcast} disabled={isTest || submitting} />
            </div>

            {!broadcast && (
              <div className="space-y-3 rounded-2xl border border-black/[0.06] bg-zinc-50/70 p-4">
                <div className="flex gap-2">
                  <Input
                    value={lookupEmail}
                    onChange={(e) => setLookupEmail(e.target.value)}
                    placeholder="Search by Username, Email, or User ID…"
                    className="h-9 text-xs rounded-lg bg-white border-zinc-200"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void lookupUser())}
                  />
                  <Button variant="outline" size="sm" className="h-9 text-xs cursor-pointer" onClick={() => void lookupUser()} disabled={lookingUp || !lookupEmail.trim()}>
                    {lookingUp ? "Searching..." : "Lookup"}
                  </Button>
                </div>
                <Textarea
                  value={userIdsText}
                  onChange={(e) => setUserIdsText(e.target.value)}
                  placeholder="Target user IDs or UUIDs (comma separated, max 500)"
                  rows={2}
                  className="text-xs font-mono rounded-lg bg-white border-zinc-200"
                />
              </div>
            )}

            {/* Test Mode Switch Card */}
            <div className="flex items-center justify-between rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-amber-800">Send in Test Mode</p>
                <p className="text-[11px] text-zinc-600">Labelled “[TEST]” in client apps. Requires explicit user IDs.</p>
              </div>
              <Switch
                checked={isTest}
                disabled={submitting}
                onCheckedChange={(checked) => {
                  setIsTest(checked);
                  if (checked) setBroadcast(false);
                }}
              />
            </div>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-extrabold rounded-xl shadow-[0_4px_16px_rgba(245,158,11,0.3)] gap-2 cursor-pointer transition-all"
                onClick={() => void handleSubmit()}
                disabled={
                  !canSend ||
                  !title.trim() ||
                  submitting ||
                  (isTest && broadcast) ||
                  (!broadcast && userIdsText.split(/[\s,]+/).filter(Boolean).length === 0)
                }
              >
                <Send className="h-4 w-4" />
                {submitting ? "Delivering..." : isTest ? "Send Test Capsule" : broadcast ? "Broadcast to All Users" : "Deliver to Targeted Users"}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </Portal>
  );
}

export function UserNotifications() {
  const [activeTab, setActiveTab] = useState<"operations" | "legacy">("operations");

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Page Header */}
      <PageHeader
        title="User Notifications"
        description="Monitor delivery pipelines, realtime telemetry, and cross-platform notifications hub"
      />

      {/* Apple-Style Segmented Tab Bar with Smooth Spring Indicator */}
      <div className="inline-flex p-1 rounded-xl bg-zinc-100/90 border border-black/[0.06] shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab("operations")}
          className={`relative z-10 px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer rounded-lg ${
            activeTab === "operations" ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          {activeTab === "operations" && (
            <motion.div
              layoutId="activeUserTab"
              transition={{ type: "spring", stiffness: 450, damping: 32 }}
              className="absolute inset-0 rounded-lg bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
            />
          )}
          <span className="relative z-20 flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-amber-500" />
            Platform Operations & Telemetry
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("legacy")}
          className={`relative z-10 px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer rounded-lg ${
            activeTab === "legacy" ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          {activeTab === "legacy" && (
            <motion.div
              layoutId="activeUserTab"
              transition={{ type: "spring", stiffness: 450, damping: 32 }}
              className="absolute inset-0 rounded-lg bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
            />
          )}
          <span className="relative z-20 flex items-center gap-1.5">
            <Megaphone className="h-3.5 w-3.5 text-orange-500" />
            Active Sends & In-App Broadcasts
          </span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "operations" ? (
          <motion.div
            key="operations"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mt-2"
          >
            <NotificationPlatform />
          </motion.div>
        ) : (
          <motion.div
            key="legacy"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mt-2"
          >
            <LegacyUserNotifications />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LegacyUserNotifications() {
  const { user } = useAuth();
  const canSend = hasRole(user, "admin");
  const { data, isLoading, error } = useUserNotificationOverview();
  const deleteNotification = useDeleteUserNotification();
  const confirm = useConfirmDialog();
  const [composing, setComposing] = useState(false);

  const recent = useMemo(() => data?.recent ?? [], [data]);

  const handleDelete = async (id: string, title: string) => {
    if (!canSend) return;
    const ok = await confirm.confirm({
      title: "Delete notification?",
      description: `“${title}” will be removed from all users' Notification Centers immediately.`,
      variant: "delete",
      confirmText: "Delete",
    });
    if (!ok) return;
    deleteNotification.mutate(id, {
      onSuccess: () => toast.success("Notification removed"),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
    });
  };

  if (isLoading) return <LoadingState />;
  if (error || !data) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Notification service unavailable"
          description={error instanceof Error ? error.message : "Could not load overview."}
        />
      </div>
    );
  }

  const kpis = data.kpis;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-zinc-900">In-App Broadcasts & Notifications</h3>
          <p className="text-[11px] text-zinc-500">Manage live broadcasts and inspect recipient read rates</p>
        </div>
        <Button
          disabled={!canSend}
          onClick={() => setComposing(true)}
          className="h-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-lg px-3 text-xs shadow-[0_2px_10px_rgba(245,158,11,0.25)] gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
        >
          <Send className="h-3.5 w-3.5" /> Send Notification
        </Button>
      </div>

      {/* Tactile KPI Pods */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <WhiteTactileKpi
          label="Sent (30d)"
          value={kpis.sent_30d}
          hint={`${kpis.recipients_30d.toLocaleString()} recipient deliveries`}
          icon={Send}
          accent="amber"
        />
        <WhiteTactileKpi
          label="Read Rate (30d)"
          value={kpis.read_rate_30d != null ? `${kpis.read_rate_30d}%` : "—"}
          hint="Confirmed read receipts"
          icon={CheckCircle2}
          accent="emerald"
        />
        <WhiteTactileKpi
          label="Broadcasts (30d)"
          value={kpis.broadcasts_30d}
          hint="All-users active sends"
          icon={Megaphone}
          accent="purple"
        />
        <WhiteTactileKpi
          label="Test Runs (30d)"
          value={kpis.tests_30d}
          hint="Targeted test sends"
          icon={Sparkles}
          accent="rose"
        />
      </div>

      {/* Activity Cards Deck */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-black/[0.06] bg-white p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3.5"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-2xs">
              <Bell className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-zinc-900">Recent Sent Notifications</h3>
              <p className="text-[11px] text-zinc-500">Live DB synchronization across all devices</p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">Auto-updating</span>
        </div>

        {recent.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-black/[0.06] bg-zinc-50/50">
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
              <Inbox className="h-4.5 w-4.5" />
            </div>
            <h4 className="mt-2 font-bold text-xs text-zinc-900">No Notifications Sent Yet</h4>
            <p className="mt-0.5 text-[11px] text-zinc-500">Click 'Send Notification' above to publish your first in-app alert.</p>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((row) => (
              <div
                key={row.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-black/[0.06] bg-white p-3.5 shadow-2xs transform-gpu transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/60 hover:shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 max-w-[170px]">
                      <div className="flex items-center gap-1.5">
                        {row.is_test && (
                          <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[8px] font-extrabold px-1.5 py-0.2 rounded-full shadow-2xs">
                            TEST
                          </span>
                        )}
                        <h4 className="font-extrabold text-xs text-zinc-900 truncate">{row.title}</h4>
                      </div>
                      {row.body && <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5">{row.body}</p>}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-600 cursor-pointer"
                      title="Delete notification"
                      disabled={!canSend || deleteNotification.isPending}
                      onClick={() => void handleDelete(row.id, row.title)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px]">
                  <span className="font-mono text-zinc-500 font-medium">
                    {row.broadcast ? (
                      <span className="text-amber-600 font-bold">All Users</span>
                    ) : (
                      row.target_label
                    )}
                  </span>

                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {row.read_count.toLocaleString()} reads
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {composing && <ComposerModal onClose={() => setComposing(false)} />}
    </motion.div>
  );
}
