import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  Filter as FilterIcon,
  Flame,
  FlaskConical,
  Inbox,
  Laptop,
  Layers,
  LayoutGrid,
  List,
  Mail,
  Megaphone,
  Radio,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import {
  filterNotificationDeliveries,
  notificationPlatformError,
  parseTargetIds,
  platformTestInputSchema,
  PLATFORM_NOTIFICATION_TYPES,
  useNotificationPlatformOverview,
  useSendNotificationPlatformTest,
  type PlatformTestInput,
} from "@/lib/notificationPlatform";
import toast from "react-hot-toast";

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

const channelMeta: Record<
  string,
  { label: string; icon: typeof Bell; accent: string; bgCircle: string; badge: string; desc: string; gradient: string }
> = {
  broadcast: {
    label: "Realtime Broadcast",
    icon: Megaphone,
    accent: "text-amber-600",
    bgCircle: "bg-amber-500/10 border-amber-500/20 text-amber-600 shadow-2xs",
    badge: "bg-amber-50 text-amber-700 border-amber-200/80",
    desc: "Instant live WebSocket push to connected desktop & web clients.",
    gradient: "from-amber-500 to-orange-500",
  },
  desktop: {
    label: "Desktop OS (Tauri)",
    icon: Laptop,
    accent: "text-orange-600",
    bgCircle: "bg-orange-500/10 border-orange-500/20 text-orange-600 shadow-2xs",
    badge: "bg-orange-50 text-orange-700 border-orange-200/80",
    desc: "Native Windows & macOS system tray popups and action center feeds.",
    gradient: "from-orange-500 to-amber-600",
  },
  in_app: {
    label: "In-App Center",
    icon: Bell,
    accent: "text-emerald-600",
    bgCircle: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 shadow-2xs",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    desc: "Workspace bell popovers, persistent inbox feeds, and realtime toasts.",
    gradient: "from-emerald-500 to-teal-500",
  },
  push: {
    label: "Web Push (SW)",
    icon: Smartphone,
    accent: "text-purple-600",
    bgCircle: "bg-purple-500/10 border-purple-500/20 text-purple-600 shadow-2xs",
    badge: "bg-purple-50 text-purple-700 border-purple-200/80",
    desc: "Background service worker push notifications using VAPID protocol.",
    gradient: "from-purple-500 to-indigo-500",
  },
  email: {
    label: "Email Delivery",
    icon: Mail,
    accent: "text-blue-600",
    bgCircle: "bg-blue-500/10 border-blue-500/20 text-blue-600 shadow-2xs",
    badge: "bg-blue-50 text-blue-700 border-blue-200/80",
    desc: "Transactional email updates and scheduled audience digests.",
    gradient: "from-blue-500 to-sky-500",
  },
};

const metric = (value: number | null | undefined) => (value == null ? "0" : value.toLocaleString());
const formatDate = (value: string) => {
  try {
    const d = new Date(value);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return value;
  }
};

const defaults = { search: "", channel: "all", status: "all", type: "all", mode: "all", read: "all" };

function CopyChip({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={handleCopy}
      title="Click to copy"
      className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200/80 px-2.5 py-0.5 font-mono text-[11px] text-zinc-600 transition-colors border border-black/[0.06] cursor-pointer shadow-2xs"
    >
      <span className="truncate max-w-[130px]">{label || text}</span>
      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 opacity-50" />}
    </motion.button>
  );
}

function TestComposer({ onClose, available }: { onClose: () => void; available: boolean }) {
  const send = useSendNotificationPlatformTest();
  const [targets, setTargets] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<PlatformTestInput["type"]>("system");
  const [review, setReview] = useState<PlatformTestInput | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const locked = useRef(false);
  const [attempted, setAttempted] = useState(false);
  const parsedIds = useMemo(() => parseTargetIds(targets), [targets]);
  const validation = platformTestInputSchema.safeParse({ userIds: parsedIds, title, body, type });

  const submit = async () => {
    if (!review || locked.current || !available) return;
    locked.current = true;
    setAttempted(true);
    setError("");
    try {
      const response = await send.mutateAsync(review);
      setResult(response.count);
      toast.success(`Sent test to ${response.count} recipient${response.count === 1 ? "" : "s"}`);
    } catch {
      setError("Send result could not be confirmed. Check delivery activity before creating another test.");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !send.isPending) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto border-black/[0.08] bg-white/95 backdrop-blur-2xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.18)] rounded-3xl p-6 sm:p-7">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_6px_20px_rgba(245,158,11,0.3)]">
              <FlaskConical className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-zinc-900 tracking-tight">
                Targeted Test Dispatcher
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                Send verified telemetry payloads to test accounts with live protocol routing
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Live Apple-Style Device Notification Preview */}
        <div className="my-2 rounded-2xl border border-black/[0.06] bg-zinc-50/70 p-3.5 shadow-inner">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-400 mb-2 uppercase tracking-wider">
            <span>Live Device Capsule Preview</span>
            <span className="flex items-center gap-1 text-amber-600">
              <Sparkles className="h-3 w-3" /> Realtime
            </span>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-white p-3.5 border border-black/[0.06] shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shrink-0 shadow-xs">
              <Bell className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="font-extrabold text-xs text-zinc-900 truncate">
                  {title.trim() || "Notification Title Preview"}
                </p>
                <span className="text-[10px] text-zinc-400 font-mono">now</span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
                {body.trim() || "Message body preview will render here across Desktop & In-App clients."}
              </p>
            </div>
          </div>
        </div>

        {result !== null ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4 py-2"
          >
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-emerald-900">Test Deliveries Dispatched</h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Successfully generated {result} test record{result === 1 ? "" : "s"} across active channels.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={onClose} className="rounded-xl px-6 font-bold bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer">
                Close Dispatcher
              </Button>
            </div>
          </motion.div>
        ) : review ? (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 pt-1"
          >
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <Sparkles className="h-4 w-4 text-amber-600" /> Confirm Targeted Recipients
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {review.userIds.map((id) => (
                  <span key={id} className="rounded-lg bg-white px-2 py-0.5 font-mono text-[11px] text-zinc-700 border border-amber-200/60 shadow-2xs">
                    {id}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-500">
                <span>Card Preview</span>
                <span className="text-amber-600 font-mono">Live Stream</span>
              </div>
              <div className="relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-[0_4px_12px_rgba(245,158,11,0.3)]">
                      <Bell className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-zinc-900 tracking-tight">{review.title}</h4>
                      <p className="text-[11px] text-zinc-500 capitalize font-medium">Noska System • {review.type}</p>
                    </div>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-2xs">
                    TEST
                  </Badge>
                </div>

                {review.body && (
                  <p className="mt-3.5 text-xs text-zinc-700 leading-relaxed bg-zinc-50 rounded-2xl p-3.5 border border-zinc-100">
                    {review.body}
                  </p>
                )}

                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Recipients: <strong className="text-zinc-900">{review.userIds.length} users</strong></span>
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Realtime Active
                  </span>
                </div>
              </div>
            </div>

            {!available && (
              <p role="alert" className="text-xs text-rose-600 bg-rose-50 p-3 rounded-2xl border border-rose-200">
                <AlertCircle className="h-4 w-4 inline mr-1" /> Platform unavailable. Refresh overview before sending.
              </p>
            )}
            {error && (
              <p role="alert" className="text-xs text-rose-600 rounded-2xl border border-rose-200 bg-rose-50 p-3">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="outline" className="rounded-xl cursor-pointer" disabled={attempted} onClick={() => setReview(null)}>
                Back to Edit
              </Button>
              <Button
                disabled={attempted || !available}
                onClick={() => void submit()}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-extrabold rounded-xl px-5 shadow-[0_4px_16px_rgba(245,158,11,0.3)] gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                {send.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Dispatching...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Confirm & Send
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        ) : (
          <form
            className="space-y-4 pt-1"
            onSubmit={(event) => {
              event.preventDefault();
              if (validation.success) setReview(validation.data);
            }}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="platform-targets" className="text-xs font-bold text-zinc-700">
                  Recipient User IDs
                </Label>
                <span className={`text-[11px] font-mono ${parsedIds.length > 10 ? "text-rose-600 font-bold" : "text-zinc-500"}`}>
                  {parsedIds.length}/10 recipients
                </span>
              </div>
              <Textarea
                id="platform-targets"
                value={targets}
                onChange={(event) => setTargets(event.target.value)}
                rows={3}
                maxLength={2200}
                placeholder="Paste user IDs (e.g. user_2t... or UUIDs), comma or newline separated"
                className="font-mono text-xs rounded-xl bg-white border-zinc-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="platform-title" className="text-xs font-bold text-zinc-700">Title</Label>
              <Input
                id="platform-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                placeholder="e.g., Workspace Collaboration Update"
                className="rounded-xl bg-white border-zinc-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="platform-body" className="text-xs font-bold text-zinc-700">Body</Label>
              <Textarea
                id="platform-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={1000}
                rows={2}
                placeholder="Message body content..."
                className="rounded-xl bg-white border-zinc-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="platform-type" className="text-xs font-bold text-zinc-700">Notification Type</Label>
              <select
                id="platform-type"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
                value={type}
                onChange={(event) => setType(event.target.value as PlatformTestInput["type"])}
              >
                {PLATFORM_NOTIFICATION_TYPES.map((value) => (
                  <option key={value} value={value} className="capitalize">
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                type="submit"
                className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-extrabold h-11 rounded-xl shadow-[0_4px_16px_rgba(245,158,11,0.25)] cursor-pointer transition-all"
                disabled={!validation.success || !available}
              >
                Review Test Card
              </Button>
            </motion.div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function NotificationPlatform() {
  const { user } = useAuth();
  const overview = useNotificationPlatformOverview();
  const [filters, setFilters] = useState(defaults);
  const [composing, setComposing] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const data = overview.data;
  const rows = useMemo(() => filterNotificationDeliveries(data?.recent ?? [], filters), [data, filters]);
  const healthy = Boolean(data && !overview.isError);
  const sendAvailable = healthy && Boolean(data?.channels.some((channel) => channel.available));

  if (!hasRole(user, "admin")) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Administrator access required"
        description="Platform operations require admin privileges."
      />
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* ── Compact Apple-Grade Hero Card ───────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl border border-black/[0.06] bg-gradient-to-b from-white to-zinc-50/50 p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
      >
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_4px_12px_rgba(245,158,11,0.25)] shrink-0 cursor-pointer"
            >
              <Zap className="h-5 w-5" />
            </motion.div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-zinc-900 tracking-tight">
                  Notification Operations Hub
                </h2>
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[9px] font-extrabold px-2 py-0.2 rounded-full shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  REALTIME
                </span>
              </div>
              <p className="text-xs text-zinc-500 max-w-lg truncate">
                Live delivery pipelines, client telemetry telemetry, and cross-platform routing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg bg-white border-zinc-200/90 text-zinc-700 hover:bg-zinc-50 shadow-2xs gap-1.5 text-xs font-semibold cursor-pointer px-3"
              disabled={overview.isFetching}
              onClick={() => void overview.refetch()}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${overview.isFetching ? "animate-spin text-amber-500" : ""}`} />
              <span>{overview.isFetching ? "Syncing..." : "Sync Logs"}</span>
            </Button>

            <Button
              size="sm"
              className="h-8 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold px-3.5 text-xs shadow-[0_2px_10px_rgba(245,158,11,0.25)] gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
              disabled={!sendAvailable}
              onClick={() => setComposing(true)}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span>Targeted Test</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {overview.isLoading ? (
        <LoadingState />
      ) : overview.isError || !data ? (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-xs">Telemetry Bridge Offline</h3>
              <p className="text-[11px] text-zinc-600">{notificationPlatformError(overview.error)}</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Compact 4-Card Hero Metric Grid ──────────────────────────────── */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Total Records */}
            <motion.div
              variants={itemVariants}
              className="group flex flex-col justify-between rounded-2xl border border-black/[0.06] bg-white p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] transform-gpu transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Total Records</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <Bell className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-black tracking-tight text-zinc-900">{metric(data.kpis.notifications)}</p>
                <p className="text-[11px] text-zinc-400 font-medium truncate mt-0.5">Rows in database</p>
              </div>
            </motion.div>

            {/* Card 2: Sent / Queued */}
            <motion.div
              variants={itemVariants}
              className="group flex flex-col justify-between rounded-2xl border border-black/[0.06] bg-white p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] transform-gpu transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Sent / Queued</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Send className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-black tracking-tight text-emerald-600">{metric(data.kpis.sent)}</p>
                <p className="text-[11px] text-zinc-400 font-medium truncate mt-0.5">{metric(data.kpis.deliveries)} receipts created</p>
              </div>
            </motion.div>

            {/* Card 3: Failed / Buffer */}
            <motion.div
              variants={itemVariants}
              className="group flex flex-col justify-between rounded-2xl border border-black/[0.06] bg-white p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] transform-gpu transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Failed / Buffer</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                  <AlertCircle className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <p className={`text-2xl font-black tracking-tight ${(data.kpis.failed ?? 0) > 0 ? "text-rose-600" : "text-zinc-900"}`}>
                  {metric(data.kpis.failed)}
                </p>
                <p className="text-[11px] text-zinc-400 font-medium truncate mt-0.5">{metric(data.kpis.pending)} pending in queue</p>
              </div>
            </motion.div>

            {/* Card 4: Read Receipts */}
            <motion.div
              variants={itemVariants}
              className="group flex flex-col justify-between rounded-2xl border border-black/[0.06] bg-white p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] transform-gpu transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Read Receipts</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
                  <Eye className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-black tracking-tight text-purple-600">{metric(data.kpis.read)}</p>
                <p className="text-[11px] text-zinc-400 font-medium truncate mt-0.5">
                  {data.kpis.read_rate == null ? "No rate available" : `${data.kpis.read_rate.toFixed(1)}% confirmed rate`}
                </p>
              </div>
            </motion.div>
          </div>

          {/* ── Compact Channel Routing Matrix ────────────────────────────────── */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-black/[0.06] bg-white p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-2xs">
                  <Radio className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900">Delivery Channels</h3>
                  <p className="text-[11px] text-zinc-500">Routing matrix with fallback protocol</p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100/90 px-2.5 py-0.5 font-mono text-[11px] text-zinc-700 border border-black/[0.06]">
                Reminders: <strong className="text-amber-600 font-extrabold">{metric(data.kpis.reminders_pending)}</strong>
              </span>
            </div>

            <div className="mt-3.5 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {["broadcast", "desktop", "in_app", "push", "email"].map((name) => {
                const channel = data.channels.find((c) => c.channel === name);
                const meta = channelMeta[name] || channelMeta.in_app;
                const Icon = meta.icon;
                const isAvail = channel?.available;

                return (
                  <div
                    key={name}
                    className="group relative flex flex-col justify-between rounded-xl border border-black/[0.06] bg-white p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] hover:border-black/[0.1] hover:-translate-y-0.5 transform-gpu transition-all duration-200"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${meta.bgCircle} transition-transform duration-200 group-hover:scale-105`}>
                          <Icon className="h-4 w-4" />
                        </div>

                        {isAvail ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200/80">
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                            {channel ? "STANDBY" : "OFFLINE"}
                          </span>
                        )}
                      </div>

                      <h4 className="mt-2.5 text-xs font-bold text-zinc-900 group-hover:text-amber-600 transition-colors">{meta.label}</h4>
                      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                        {meta.desc}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-400 font-medium">Protocol</span>
                      <span className="capitalize font-bold text-zinc-700 bg-zinc-100/80 px-1.5 py-0.5 rounded border border-black/[0.04]">
                        {name.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* ── Compact Recent Deliveries Activity & Filter Controls ─────────── */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-black/[0.06] bg-white p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-2xs">
                  <Activity className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900">Recent Delivery Activity</h3>
                  <p className="text-[11px] text-zinc-500">
                    Showing <strong>{rows.length}</strong> of <strong>{data.recent.length}</strong> packets
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="flex items-center rounded-lg border border-black/[0.06] bg-zinc-100/80 p-0.5">
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      viewMode === "cards" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    <LayoutGrid className="h-3 w-3" /> Cards
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      viewMode === "table" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    <List className="h-3 w-3" /> Table
                  </button>
                </div>

                {filters !== defaults && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters(defaults)}
                    className="h-7 text-[11px] text-zinc-500 hover:text-zinc-900 rounded-lg cursor-pointer px-2"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Compact Filter Bar */}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <Input
                  placeholder="Search packet, recipient, UUID..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-8 h-8 text-xs rounded-lg border-zinc-200/90 bg-white focus:border-amber-400"
                />
                {filters.search && (
                  <button
                    onClick={() => setFilters({ ...filters, search: "" })}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <select
                value={filters.channel}
                onChange={(e) => setFilters({ ...filters, channel: e.target.value })}
                className="h-8 rounded-lg border border-zinc-200/90 bg-white px-2.5 text-xs text-zinc-700 focus:outline-none focus:border-amber-400"
              >
                <option value="all">All Channels</option>
                <option value="broadcast">Broadcast</option>
                <option value="desktop">Desktop Tauri</option>
                <option value="in_app">In-App</option>
                <option value="push">Web Push</option>
                <option value="email">Email</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="h-8 rounded-lg border border-zinc-200/90 bg-white px-2.5 text-xs text-zinc-700 focus:outline-none focus:border-amber-400"
              >
                <option value="all">All Statuses</option>
                <option value="delivered">Delivered</option>
                <option value="sent">Sent</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={filters.mode}
                onChange={(e) => setFilters({ ...filters, mode: e.target.value })}
                className="h-8 rounded-lg border border-zinc-200/90 bg-white px-2.5 text-xs text-zinc-700 focus:outline-none focus:border-amber-400"
              >
                <option value="all">All Modes</option>
                <option value="production">Production</option>
                <option value="test">Test Sends</option>
              </select>

              <select
                value={filters.read}
                onChange={(e) => setFilters({ ...filters, read: e.target.value })}
                className="h-8 rounded-lg border border-zinc-200/90 bg-white px-2.5 text-xs text-zinc-700 focus:outline-none focus:border-amber-400"
              >
                <option value="all">All Read Status</option>
                <option value="read">Confirmed Read</option>
                <option value="unread">Unread / Pending</option>
              </select>
            </div>

            {/* Display Content */}
            {rows.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-black/[0.06] bg-zinc-50/50">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
                  <Radio className="h-4.5 w-4.5" />
                </div>
                <h4 className="mt-2 font-bold text-xs text-zinc-900">No Matching Deliveries</h4>
                <p className="mt-0.5 text-[11px] text-zinc-500">Adjust search filters or dispatch a test packet.</p>
              </div>
            ) : viewMode === "cards" ? (
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((row) => {
                  const meta = channelMeta[row.channel] || channelMeta.in_app;
                  const Icon = meta.icon;

                  return (
                    <div
                      key={row.id}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-black/[0.06] bg-white p-3.5 shadow-2xs transform-gpu transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/60 hover:shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${meta.bgCircle}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-xs text-zinc-900 truncate max-w-[160px]">{row.title}</h4>
                              <p className="text-[10px] text-zinc-500 font-medium capitalize">{meta.label}</p>
                            </div>
                          </div>

                          {row.is_test && (
                            <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[8px] font-extrabold px-1.5 py-0.2 rounded-full shadow-2xs">
                              TEST
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-1">
                          <CopyChip text={row.user_id} label={`User: ${row.user_id}`} />
                          <CopyChip text={row.notification_id} label={`ID: ${row.notification_id.slice(0, 6)}…`} />
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px]">
                        <span
                          className={`font-bold capitalize px-2 py-0.2 rounded-full ${
                            row.status === "failed"
                              ? "bg-rose-100 text-rose-800"
                              : row.status === "delivered"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {row.status}
                        </span>

                        <span className="text-zinc-400 font-mono">
                          {formatDate(row.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-black/[0.06]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-500 font-bold">
                      <th className="px-3.5 py-2.5">Packet & Recipient</th>
                      <th className="px-3 py-2.5">Channel</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Read Receipt</th>
                      <th className="px-3 py-2.5">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="px-3.5 py-2">
                          <div className="flex items-center gap-1.5">
                            {row.is_test && (
                              <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[8px] px-1 py-0 font-bold rounded">
                                TEST
                              </span>
                            )}
                            <span className="font-bold text-zinc-900 text-xs truncate">{row.title}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                            <CopyChip text={row.user_id} label={`User: ${row.user_id}`} />
                          </div>
                        </td>

                        <td className="px-3 py-2 text-zinc-700 font-medium text-xs">
                          {channelMeta[row.channel]?.label ?? row.channel}
                        </td>

                        <td className="px-3 py-2">
                          <span
                            className={`text-[9px] font-bold capitalize px-2 py-0.5 rounded-full ${
                              row.status === "failed"
                                ? "bg-rose-100 text-rose-800"
                                : row.status === "delivered"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-zinc-100 text-zinc-700"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>

                        <td className="px-3 py-2 text-zinc-500 text-xs">
                          {row.read_at ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <Check className="h-3 w-3" /> {formatDate(row.read_at)}
                            </span>
                          ) : (
                            <span className="text-zinc-400 text-[11px]">Unconfirmed</span>
                          )}
                        </td>

                        <td className="px-3 py-2 text-zinc-400 whitespace-nowrap text-[11px]">
                          {formatDate(row.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </>
      )}

      {composing && <TestComposer available={sendAvailable} onClose={() => setComposing(false)} />}
    </motion.div>
  );
}
