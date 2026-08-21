import { useMemo, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Mail, User as UserIcon, AtSign, Calendar, RefreshCcw, MessageSquare,
  FileText, CreditCard, Shield, Ban, Trash2, Clock, Activity, CheckCircle2, XCircle,
  MapPin, Save, Loader2, ImagePlus, Upload, Search, Filter, ChevronDown, ChevronRight,
  Bot, Coins, Gauge, UserCheck, Crown, ShieldCheck, X, Undo2, Database, HardDrive,
  Plus, Minus, PencilLine, Archive, CalendarDays, List, Sparkles, Copy, Check, Zap, Layers,
  Download, FileSpreadsheet, Maximize2, Split, Code2, ExternalLink, ArrowRight, KeyRound, Link2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select, SelectValue, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCommandCenter } from "@/components/ui/AdminCommandCenter";
import toast from "react-hot-toast";
import {
  useUserProfile, useUserSubscriptions, useUserAiChats, useUserPages,
  useUserAuditDetail, useBanUser, useHardBanUser, useDeleteUserData,
  useUpdateUserLocation, useUpdateUserProfile, adminUploadAvatar,
  useAdminMatchByEmail, useUserBans, useUserSessions, useUnbanUser,
  useUserStorage, useUserAdminActions,
  useSetBypassWaitlist,
  type AdminMatchRow, type UserBanRow, type UserSessionRow,
  type UserStorageRow, type AdminUserActionRow, type UserAuditDetailRow,
  type UserAiChatRow,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { hasRole, ROLE_LABELS } from "@/lib/rbac";
import { adminApi } from "@/lib/admin-api";
import { formatRelativeTime, initialsFromName, formatCurrency } from "@/lib/utils";
import { useRealtimeInvalidate } from "@/lib/queries";
import { pickImageFile } from "@/lib/filePicker";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function statusColor(status?: string | null): string {
  const s = (status ?? "").toLowerCase();
  if (s === "active" || s === "success" || s === "paid") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  if (s === "open" || s === "pending" || s === "scheduled" || s === "in_progress") return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  if (s === "failed" || s === "canceled" || s === "cancelled" || s === "past_due" || s === "banned") return "bg-red-500/10 text-red-500 border-red-500/20";
  if (s === "trialing" || s === "trial") return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
}

const ROLE_BADGE_STYLES: Record<string, string> = {
  super_admin: "bg-red-500/10 text-red-400 border-red-500/30",
  admin: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  developer: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  support: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  marketing: "bg-amber-500/10 text-amber-400 border-amber-500/30",
};

const USER_ROLE_STYLES: Record<string, string> = {
  user: "bg-zinc-500/10 text-zinc-300 border-zinc-500/30",
  moderator: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  beta: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30",
  vip: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  staff: "bg-teal-500/10 text-teal-400 border-teal-500/30",
};

function roleBadgeStyle(role?: string | null): string {
  return ROLE_BADGE_STYLES[role ?? ""] ?? USER_ROLE_STYLES[role ?? ""] ?? "bg-zinc-500/10 text-zinc-300 border-zinc-500/30";
}

function adminRoleLabel(role?: string | null): string {
  if (!role) return "Admin";
  return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role.replace(/_/g, " ");
}

function actionColor(action?: string | null): string {
  const a = (action ?? "").toLowerCase();
  if (a.startsWith("ai_")) return "bg-violet-500/10 text-violet-400 border-violet-500/30";
  if (a.includes("delete") || a.includes("trash")) return "bg-red-500/10 text-red-400 border-red-500/30";
  if (a.includes("create")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  if (a.includes("edit") || a.includes("update")) return "bg-blue-500/10 text-blue-400 border-blue-500/30";
  return "bg-zinc-500/10 text-zinc-400 border-zinc-500/30";
}

function previewContent(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US").format(Number(value));
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = Number(bytes);
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : n >= 100 ? 0 : 1)} ${units[i]}`;
}

function formatDateTimeFull(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", second: "2-digit",
  });
}

function actionLabel(action?: string | null): string {
  const a = (action ?? "").toLowerCase();
  const map: Record<string, string> = {
    edit: "Edited content", created: "Created page", trashed: "Trashed page",
    delete: "Deleted page", ai_generated: "AI generated", ai_edit: "AI edited",
  };
  return map[a] ?? a.replace(/_/g, " ");
}

interface BlockLike { id?: string; type?: string; text?: string; content?: unknown; [k: string]: unknown }

function extractBlocks(value: unknown): BlockLike[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value as BlockLike[];
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (Array.isArray(v.blocks)) return v.blocks as BlockLike[];
    if (Array.isArray(v.content)) return v.content as BlockLike[];
  }
  return [];
}

function blockText(b: BlockLike): string {
  const t = typeof b.text === "string" ? b.text : "";
  if (t.trim()) return t;
  const rich = b.properties as Record<string, unknown> | undefined;
  const richText = Array.isArray(rich?.richText) ? rich.richText : [];
  const first = richText[0] as Record<string, unknown> | undefined;
  const ft = first?.text;
  return typeof ft === "string" ? ft : "";
}

interface BlockDiff {
  added: BlockLike[];
  removed: BlockLike[];
  modified: Array<{ id?: string; before: string; after: string }>;
  countDelta: number | null;
}

function computeBlockDiff(before: unknown, after: unknown): BlockDiff | null {
  const b = extractBlocks(before);
  const a = extractBlocks(after);
  let countDelta: number | null = null;
  const readCount = (v: unknown): number | null => {
    if (v == null) return null;
    if (typeof v === "object") {
      const c = (v as Record<string, unknown>).blockCount;
      if (typeof c === "number") return c;
    }
    return null;
  };
  const bCount = b.length > 0 ? b.length : readCount(before);
  const aCount = a.length > 0 ? a.length : readCount(after);
  if (bCount != null && aCount != null && aCount !== bCount) countDelta = aCount - bCount;
  if (b.length === 0 && a.length === 0 && countDelta == null) return null;
  const byId = new Map(a.filter((x) => x.id).map((x) => [x.id, x]));
  const beforeIds = new Set(b.filter((x) => x.id).map((x) => x.id));
  const added = a.filter((x) => x.id && !beforeIds.has(x.id));
  const removed = b.filter((x) => x.id && !byId.has(x.id));
  const modified: BlockDiff["modified"] = [];
  for (const old of b) {
    if (!old.id || !byId.has(old.id)) continue;
    const neu = byId.get(old.id)!;
    const ot = blockText(old);
    const nt = blockText(neu);
    if (ot !== nt) modified.push({ id: old.id, before: ot || "(no text)", after: nt || "(no text)" });
  }
  if (added.length === 0 && removed.length === 0 && modified.length === 0 && countDelta == null) return null;
  return { added, removed, modified, countDelta };
}

function LocationCard({ profile }: { profile: { id: string; city?: string | null; state?: string | null; area?: string | null; country?: string | null; postal_code?: string | null } | null }) {
  const update = useUpdateUserLocation();
  const [values, setValues] = useState<Record<string, string>>({
    city: profile?.city ?? "", state: profile?.state ?? "", area: profile?.area ?? "",
    country: profile?.country ?? "", postal_code: profile?.postal_code ?? "",
  });
  const [saving, setSaving] = useState(false);

  if (!profile) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await update.mutateAsync({ id: profile.id, ...values });
      toast.success("Location updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update location");
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> Location</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(["country", "state", "city", "area", "postal_code"] as const).map((k) => (
            <div key={k} className="space-y-1.5">
              <Label className="text-xs capitalize">{k.replace("_", " ")}</Label>
              <Input
                value={values[k]}
                onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
                placeholder={k === "postal_code" ? "e.g., 400001" : "—"}
                className="h-9"
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
            Save Location
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Used for location-based email targeting (city / state / area / country-wise campaigns).
        </p>
      </CardContent>
    </Card>
  );
}

function AvatarManager({ profile, canManage }: { profile: { id: string; user_name: string | null; email?: string | null; avatar_url?: string | null } | null; canManage: boolean }) {
  const update = useUpdateUserProfile();
  const [uploading, setUploading] = useState(false);

  if (!profile) return null;

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { url, error } = await adminUploadAvatar(file, profile.id);
      if (error || !url) {
        toast.error(error ?? "Upload failed");
        return;
      }
      await update.mutateAsync({ id: profile.id, avatar_url: url });
      toast.success("Avatar updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update avatar");
    }
    setUploading(false);
  };

  const handleRemove = async () => {
    try {
      await update.mutateAsync({ id: profile.id, avatar_url: null });
      toast.success("Avatar removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove avatar");
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="text-lg">{initialsFromName(profile.user_name || profile.email || "?")}</AvatarFallback>
        </Avatar>
        {canManage && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); pickImageFile(handleFile); }}
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 shadow ring-1 ring-zinc-700 hover:bg-zinc-700"
            title="Upload avatar (max 2 MB)"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      {canManage && (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost" size="sm" className="h-6 px-2 text-[11px]"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); pickImageFile(handleFile); }} disabled={uploading}
          >
            <Upload className="mr-1 h-3 w-3" /> Upload
          </Button>
          {profile.avatar_url && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-destructive" onClick={handleRemove}>
              Remove
            </Button>
          )}
        </div>
      )}
      {!canManage && <p className="text-[10px] text-muted-foreground">Needs admin role to change</p>}
    </div>
  );
}

function ProfileInfoCard({ profile }: { profile: { id: string; user_name: string | null; username?: string | null; bio?: string | null; use_case?: string | null; workspace_name?: string | null; onboarding_complete?: boolean | null; role?: string | null } | null }) {  const update = useUpdateUserProfile();
  const [values, setValues] = useState({
    user_name: profile?.user_name ?? "",
    username: profile?.username ?? "",
    bio: profile?.bio ?? "",
    use_case: profile?.use_case ?? "",
    workspace_name: profile?.workspace_name ?? "",
  });
  const [role, setRole] = useState<string | null>(profile?.role ?? null);
  const [onboarding, setOnboarding] = useState(!!profile?.onboarding_complete);
  const [saving, setSaving] = useState(false);

  if (!profile) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await update.mutateAsync({
        id: profile.id,
        user_name: values.user_name || null,
        username: values.username || null,
        bio: values.bio || null,
        use_case: values.use_case || null,
        workspace_name: values.workspace_name || null,
        role,
        onboarding_complete: onboarding,
      });
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update profile");
    }
    setSaving(false);
  };

  const handleClearUsername = async () => {
    setSaving(true);
    try {
      await update.mutateAsync({ id: profile.id, username: null });
      setValues((v) => ({ ...v, username: "" }));
      toast.success("Username cleared");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to clear username");
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><UserIcon className="h-4 w-4" /> Profile Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Display name</Label>
            <Input value={values.user_name} onChange={(e) => setValues((v) => ({ ...v, user_name: e.target.value }))} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Username</Label>
            <div className="flex gap-1.5">
              <Input value={values.username} onChange={(e) => setValues((v) => ({ ...v, username: e.target.value }))} placeholder="@handle" className="h-9" />
              <Button variant="outline" size="sm" className="h-9 shrink-0 text-destructive" onClick={handleClearUsername} disabled={saving || !values.username} title="Delete username">
                <X className="mr-1 h-3.5 w-3.5" /> Clear
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Workspace name</Label>
            <Input value={values.workspace_name} onChange={(e) => setValues((v) => ({ ...v, workspace_name: e.target.value }))} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Primary use case</Label>
            <Input value={values.use_case} onChange={(e) => setValues((v) => ({ ...v, use_case: e.target.value }))} className="h-9" />
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <Label className="text-xs">Bio</Label>
          <Textarea value={values.bio} onChange={(e) => setValues((v) => ({ ...v, bio: e.target.value }))} rows={3} placeholder="Short description shown on the user's profile." />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">User role</Label>
            <Select value={role ?? ""} onValueChange={(v) => setRole(v === "__none__" ? null : v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— No custom role</SelectItem>
                <SelectItem value="user">user</SelectItem>
                <SelectItem value="moderator">moderator</SelectItem>
                <SelectItem value="beta">beta</SelectItem>
                <SelectItem value="vip">vip</SelectItem>
                <SelectItem value="staff">staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end justify-between gap-3 rounded-lg border px-3 py-2">
            <div>
              <p className="text-xs font-medium">Onboarding complete</p>
              <p className="text-[11px] text-muted-foreground">User finished first-time setup.</p>
            </div>
            <Switch checked={onboarding} onCheckedChange={setOnboarding} />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
            Save Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RoleBadge({ profile, adminMatch }: { profile: { role?: string | null } | null; adminMatch: AdminMatchRow[] | undefined }) {
  const match = adminMatch?.[0];
  const customRole = profile?.role && profile.role !== "user" ? profile.role : null;
  return (
    <>
      {match && (
        <Badge className={`text-[10px] ${roleBadgeStyle(match.role)}`}>
          <ShieldCheck className="mr-1 h-3 w-3" /> {adminRoleLabel(match.role)} · Admin
        </Badge>
      )}
      {customRole && (
        <Badge className={`text-[10px] ${roleBadgeStyle(customRole)}`}>
          <Crown className="mr-1 h-3 w-3" /> {customRole}
        </Badge>
      )}
      {!match && !customRole && (
        <Badge className={`text-[10px] ${roleBadgeStyle("user")}`}>
          <UserIcon className="mr-1 h-3 w-3" /> User
        </Badge>
      )}
    </>
  );
}

function AiUsageCard({ events, chats }: { events: Array<{ action: string | null; ai_provider: string | null; ai_model: string | null; ai_prompt_tokens: number | null; ai_completion_tokens: number | null; ai_latency_ms: number | null; ai_cost: number | null; created_at: string | null }> | undefined; chats: UserAiChatRow[] | undefined }) {
  const usage = useMemo(() => {
    const rows = (events ?? []).filter((e) => e.action?.toLowerCase().startsWith("ai_"));
    let prompt = 0, completion = 0, cost = 0, latency = 0, count = 0;
    const byModel = new Map<string, { model: string; provider: string | null; count: number; prompt: number; completion: number; cost: number; latency: number; lastUsed: string | null }>();
    const bump = (modelRaw: string | null | undefined, provider: string | null | undefined, created: string | null | undefined, tokens: number, compTokens: number, c: number, lat: number) => {
      const model = modelRaw?.trim() ? modelRaw! : "Unknown";
      if (!byModel.has(model)) byModel.set(model, { model, provider: provider ?? null, count: 0, prompt: 0, completion: 0, cost: 0, latency: 0, lastUsed: null });
      const m = byModel.get(model)!;
      m.count += 1;
      m.provider = m.provider ?? provider ?? null;
      m.prompt += tokens;
      m.completion += compTokens;
      m.cost += c;
      m.latency += lat;
      if (!m.lastUsed || (created && created > m.lastUsed)) m.lastUsed = created ?? null;
    };
    for (const r of rows) {
      count += 1;
      prompt += r.ai_prompt_tokens ?? 0;
      completion += r.ai_completion_tokens ?? 0;
      cost += r.ai_cost ? Number(r.ai_cost) : 0;
      latency += r.ai_latency_ms ?? 0;
      bump(r.ai_model, r.ai_provider, r.created_at, r.ai_prompt_tokens ?? 0, r.ai_completion_tokens ?? 0, r.ai_cost ? Number(r.ai_cost) : 0, r.ai_latency_ms ?? 0);
    }
    for (const chat of chats ?? []) {
      for (const msg of chat.messages ?? []) {
        const mraw = msg as { model?: unknown; provider?: unknown; latencyMs?: unknown };
        const modelRaw = mraw.model;
        const providerRaw = mraw.provider;
        const latencyRaw = mraw.latencyMs;
        if (typeof modelRaw === "string" && modelRaw.trim()) {
          count += 1;
          const lat = typeof latencyRaw === "number" ? latencyRaw : 0;
          latency += lat;
          bump(modelRaw, typeof providerRaw === "string" ? providerRaw : null, msg.created_at ?? chat.updated_at, 0, 0, 0, lat);
        }
      }
    }
    const models = [...byModel.values()]
      .sort((a, b) => b.count - a.count)
      .map((m) => ({ ...m, avgLatency: m.count ? Math.round(m.latency / m.count) : 0 }));
    return { count, prompt, completion, cost, avgLatency: count ? Math.round(latency / count) : 0, models };
  }, [events, chats]);

  const maxCount = Math.max(...usage.models.map((m) => m.count), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4" /> AI Usage Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {usage.count === 0 ? (
          <p className="text-sm text-muted-foreground">No AI activity recorded.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-xl font-bold">{formatNumber(usage.count)}</p>
                <p className="text-[10px] text-muted-foreground">AI Calls</p>
              </div>
              <div>
                <p className="text-xl font-bold">{formatNumber(usage.prompt + usage.completion)}</p>
                <p className="text-[10px] text-muted-foreground">Total Tokens</p>
              </div>
              <div>
                <p className="text-xl font-bold">{usage.cost ? formatCurrency(usage.cost) : "$0"}</p>
                <p className="text-[10px] text-muted-foreground">Est. Cost</p>
              </div>
              <div>
                <p className="text-xl font-bold">{usage.avgLatency ? `${usage.avgLatency}ms` : "—"}</p>
                <p className="text-[10px] text-muted-foreground">Avg Latency</p>
              </div>
            </div>

            {usage.models.length > 0 && (
              <div className="mt-5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Models used ({usage.models.length})</p>
                <div className="mt-2 overflow-hidden rounded-lg border">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Model</th>
                        <th className="px-3 py-2 font-medium">Calls</th>
                        <th className="px-3 py-2 font-medium">Response time</th>
                        <th className="px-3 py-2 font-medium">Tokens</th>
                        <th className="px-3 py-2 font-medium">Est. cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.models.map((m, i) => (
                        <tr key={m.model} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              {i === 0 && <Crown className="h-3 w-3 shrink-0 text-amber-400" />}
                              <span className="font-mono font-semibold text-foreground">{m.model}</span>
                              {i === 0 && (
                                <Badge className="text-[9px] bg-amber-500/15 text-amber-400 border-amber-500/30">Most used</Badge>
                              )}
                              {m.provider && <span className="flex items-center gap-0.5 text-muted-foreground"><Zap className="h-2.5 w-2.5" />{m.provider}</span>}
                            </div>
                            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
                                style={{ width: `${Math.max(4, (m.count / maxCount) * 100)}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2 font-semibold text-foreground">{formatNumber(m.count)}</td>
                          <td className="px-3 py-2">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {m.avgLatency ? `${m.avgLatency}ms avg` : "no data"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{formatNumber(m.prompt + m.completion)}</td>
                          <td className="px-3 py-2 text-muted-foreground">{m.cost ? formatCurrency(m.cost) : "$0"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Last use: {usage.models.map((m) => `${m.model} ${m.lastUsed ? formatDateTimeFull(m.lastUsed) : "—"}`).join(" · ")}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StorageUsageCard({ storage }: { storage: UserStorageRow | null | undefined }) {
  const tables = storage?.tables ?? [];
  const total = storage?.total_bytes ?? 0;
  const max = Math.max(...tables.map((t) => t.bytes), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4" /> Database Storage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          <p className="text-2xl font-bold">{formatBytes(total)}</p>
          <p className="pb-1 text-[11px] text-muted-foreground">total across {tables.length} tables</p>
        </div>
        <div className="mt-4 space-y-3">
          {tables.map((t) => (
            <div key={t.table}>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="h-3 w-3 text-muted-foreground" />
                  {t.label}
                  <span className="text-muted-foreground/60">({t.rows} rows)</span>
                </span>
                <span className="font-mono text-muted-foreground">{formatBytes(t.bytes)}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                  style={{ width: `${Math.max(1, (t.bytes / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">
          Estimated row size per table — includes block content, chat messages and audit payloads.
        </p>
      </CardContent>
    </Card>
  );
}

function AdminActionsCard({ actions }: { actions: AdminUserActionRow[] | undefined }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4" /> Admin Actions ({actions?.length ?? 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {actions && actions.length > 0 ? (
          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {actions.map((a) => (
              <div key={a.id} className="rounded-lg border px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`text-[10px] ${actionColor(a.action)}`}>{actionLabel(a.action)}</Badge>
                  <span className="text-xs font-medium text-foreground">{a.admin_name}</span>
                  {a.target_name && <span className="text-[11px] text-muted-foreground">on {a.target_name}</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDateTimeFull(a.created_at)}</span>
                  {a.target_type && <span className="capitalize">{a.target_type}</span>}
                </div>
                {a.detail != null && (
                  <pre className="mt-1.5 max-h-24 overflow-auto whitespace-pre-wrap break-all rounded bg-muted/40 p-2 font-mono text-[10px] text-muted-foreground">
                    {previewContent(a.detail)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No admin actions recorded for this user.</p>
        )}
      </CardContent>
    </Card>
  );
}

function BanStatusCard({ profile, bans, onUnban }: { profile: { id: string; user_name: string | null; email: string | null } | null; bans: UserBanRow[] | undefined; onUnban: () => void }) {
  const active = (bans ?? []).filter((b) => !b.lifted_at);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Ban className="h-4 w-4" /> Ban Status</CardTitle>
      </CardHeader>
      <CardContent>
        {active.length === 0 ? (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-muted-foreground">No active ban for this user.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((b) => (
              <div key={b.id} className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30 capitalize">
                    {b.ban_type === "permanent" ? "Permanent ban" : "Temporary ban"}
                  </Badge>
                  {b.expires_at && <span className="text-[11px] text-muted-foreground">Expires {formatDateTime(b.expires_at)}</span>}
                </div>
                {b.reason && <p className="mt-2 text-sm text-foreground">{b.reason}</p>}
                {b.banned_by && <p className="mt-1 text-[11px] text-muted-foreground">Banned by {b.banned_by}</p>}
              </div>
            ))}
            <Button variant="outline" size="sm" className="text-emerald-500" onClick={onUnban}>
              <Undo2 className="mr-1.5 h-4 w-4" />
              Unban user
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AccessCard({ profile }: { profile: { id: string; user_name: string | null; email: string | null; bypass_waitlist?: boolean | null } | null }) {
  const setBypass = useSetBypassWaitlist();
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState<{ url: string | null; expires: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!profile) return null;

  const handleToggle = async (value: boolean) => {
    try {
      await setBypass.mutateAsync({ id: profile.id, bypass_waitlist: value });
      toast.success(value ? "Waitlist bypass enabled" : "Waitlist bypass disabled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update bypass flag");
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setLink(null);
    try {
      const res = await adminApi.users.signInToken(profile.id, 7 * 24 * 60 * 60);
      setLink({ url: res.url, expires: new Date(Date.now() + res.expires_in_seconds * 1000).toISOString() });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate link");
    }
    setGenerating(false);
  };

  const handleCopy = async () => {
    if (!link?.url) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <KeyRound className="h-4 w-4" /> Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Bypass waitlist</p>
            <p className="text-[11px] text-muted-foreground">This account skips the waitlist and gets access immediately.</p>
          </div>
          <Switch
            checked={!!profile.bypass_waitlist}
            onCheckedChange={(v) => void handleToggle(v)}
            disabled={setBypass.isPending}
          />
        </div>

        <div className="rounded-lg border px-3 py-2">
          <p className="text-sm font-medium">Direct access link</p>
          <p className="text-[11px] text-muted-foreground">One-time magic link that signs this user in and opens their workspace.</p>
          <Button size="sm" className="mt-2" onClick={() => void handleGenerate()} disabled={generating}>
            {generating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Link2 className="mr-1 h-3.5 w-3.5" />}
            {link ? "Regenerate link" : "Generate link"}
          </Button>
          {link?.url && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input value={link.url} readOnly className="h-9 font-mono text-[11px]" />
                <Button size="sm" variant="outline" onClick={() => void handleCopy()}>
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Expires {formatDateTime(link.expires)} · Share this link with the user.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function chatPreview(chat: UserAiChatRow, max = 110): string {
  const messages = chat.messages ?? [];
  const last = messages[messages.length - 1];
  if (!last) return "No messages";
  const body = (last.text ?? last.content ?? "").toString().trim();
  if (!body) return "No content";
  return body.length > max ? body.slice(0, max) + "…" : body;
}

function chatStats(chat: UserAiChatRow): { total: number; ai: number } {
  const messages = chat.messages ?? [];
  const ai = messages.filter((m) => ["ai", "assistant", "model"].includes((m.role ?? "").toLowerCase())).length;
  return { total: messages.length, ai };
}

function renderMessageBody(body: string): ReactNode {
  // basic inline markdown: **bold**, `code`, and link URLs
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(body))) {
    if (m.index > last) parts.push(<span key={key++}>{body.slice(last, m.index)}</span>);
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={key++} className="font-semibold text-foreground">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      parts.push(<code key={key++} className="rounded bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 text-[11px] text-amber-700 dark:text-amber-300 font-mono border border-zinc-300/50 dark:border-zinc-700/50">{token.slice(1, -1)}</code>);
    } else {
      const inner = token.slice(1, -1);
      const split = inner.indexOf("](");
      parts.push(<a key={key++} href={inner.slice(split + 2)} target="_blank" rel="noreferrer" className="underline decoration-violet-500/50 underline-offset-2 text-violet-600 hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-200 font-medium">{inner.slice(0, split)}</a>);
    }
    last = m.index + token.length;
  }
  if (last < body.length) parts.push(<span key={key++}>{body.slice(last)}</span>);
  return parts;
}

function ChatTranscriptCard({ chat }: { chat: UserAiChatRow }) {
  const [open, setOpen] = useState(false);
  const messages = chat.messages ?? [];
  const { total, ai } = chatStats(chat);
  const preview = chatPreview(chat);

  return (
    <div className={`rounded-lg border transition-colors ${open ? "border-violet-500/40 bg-violet-500/[0.04] dark:bg-violet-500/[0.06]" : "hover:bg-accent/40"}`}>
      <button type="button" className="flex w-full items-start gap-3 px-3 py-2.5 text-left" onClick={() => setOpen((o) => !o)}>
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
          <Bot className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">{chat.name || "Untitled chat"}</p>
            {chat.chat_type && <Badge variant="outline" className="text-[10px] capitalize">{chat.chat_type}</Badge>}
            {chat.pinned && <Badge variant="secondary" className="text-[10px]">Pinned</Badge>}
            {chat.archived && <Badge variant="outline" className="text-[10px] text-muted-foreground">Archived</Badge>}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{preview}</p>
          <p className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
            {chat.page_title && (
              <span className="inline-flex items-center gap-1 min-w-0">
                <FileText className="h-3 w-3 shrink-0" />
                <span className="truncate">{chat.page_title}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 shrink-0">
              <Clock className="h-3 w-3" /> {chat.updated_at ? formatRelativeTime(chat.updated_at) : "recently"}
            </span>
            {total > 0 && <span className="shrink-0">· {total} messages ({ai} AI)</span>}
          </p>
        </div>
        {open ? <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <div className="mx-3 mb-3 space-y-2.5 border-t border-violet-500/20 pt-3">
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground">No messages in this chat.</p>
          ) : (
            messages.map((m, i) => {
              const role = (m.role ?? "").toLowerCase();
              const body = (m.text ?? m.content ?? "").toString().trim();
              const isAi = role === "ai" || role === "assistant" || role === "model";
              return (
                <div key={i} className={`flex gap-2.5 ${isAi ? "justify-start" : "justify-end"}`}>
                  {isAi && (
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 dark:bg-violet-500/25 dark:text-violet-300">
                      <Bot className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 ${isAi ? "bg-violet-500/10 dark:bg-violet-500/15 border border-violet-500/30 text-foreground" : "bg-zinc-800 text-zinc-100 dark:bg-zinc-800/90 dark:text-zinc-100 border border-zinc-700/60"}`}>
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${isAi ? "text-violet-700 dark:text-violet-300" : "text-zinc-300"}`}>
                        {isAi ? "AI" : "User"}
                      </span>
                      {m.created_at && <span className="text-[9px] text-muted-foreground dark:text-zinc-400">{formatDateTime(m.created_at)}</span>}
                    </div>
                    <p className={`text-[13px] leading-relaxed whitespace-pre-wrap break-words ${isAi ? "text-foreground" : "text-zinc-100"}`}>
                      {body ? renderMessageBody(body) : <span className="italic text-muted-foreground">Empty response</span>}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

type ChatView = "list" | "timeline";

function dayKey(iso: string | null | undefined): string {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function chatStart(chat: UserAiChatRow): string | null {
  const messages = chat.messages ?? [];
  for (const m of messages) if (m.created_at) return m.created_at;
  return chat.created_at ?? null;
}

function ChatTimelineRow({ chat }: { chat: UserAiChatRow }) {
  const start = chatStart(chat);
  const { total, ai } = chatStats(chat);
  return (
    <div className="relative flex gap-3 pb-5 last:pb-0">
      {/* timeline rail */}
      <div className="flex flex-col items-center">
        <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-violet-500 bg-violet-500/30" />
        <span className="w-px flex-1 bg-gradient-to-b from-violet-500/40 to-transparent" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground truncate">{chat.name || "Untitled chat"}</p>
          {chat.chat_type && <Badge variant="outline" className="text-[10px] capitalize">{chat.chat_type}</Badge>}
          {chat.pinned && <Crown className="h-3 w-3 text-amber-500" />}
          {chat.archived && <Archive className="h-3 w-3 text-muted-foreground" />}
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{chatPreview(chat)}</p>
        <p className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
          {chat.page_title && (
            <span className="inline-flex items-center gap-1 min-w-0">
              <FileText className="h-3 w-3 shrink-0" />
              <span className="truncate">{chat.page_title}</span>
            </span>
          )}
          {start && <span className="inline-flex items-center gap-1 shrink-0"><Clock className="h-3 w-3" /> {formatDateTime(start)}</span>}
          <span className="shrink-0">· {total} messages ({ai} AI)</span>
        </p>
      </div>
    </div>
  );
}

function UserDetailChatsCard({ chats }: { chats: UserAiChatRow[] | undefined }) {
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showPinned, setShowPinned] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [range, setRange] = useState<"all" | "7d" | "30d" | "90d">("all");
  const [view, setView] = useState<ChatView>("list");
  const all = chats ?? [];
  const totalMsgs = all.reduce((sum, c) => sum + chatStats(c).total, 0);
  const aiMsgs = all.reduce((sum, c) => sum + chatStats(c).ai, 0);

  const types = useMemo(() => {
    const set = new Set<string>();
    for (const c of all) if (c.chat_type) set.add(c.chat_type);
    return Array.from(set).sort();
  }, [all]);

  const filtered = all.filter((c) => {
    const q = filter.trim().toLowerCase();
    if (q && !(c.name ?? "").toLowerCase().includes(q) && !(c.page_title ?? "").toLowerCase().includes(q) && !chatPreview(c).toLowerCase().includes(q)) return false;
    if (typeFilter !== "all" && c.chat_type !== typeFilter) return false;
    if (showPinned && !c.pinned) return false;
    if (showArchived && !c.archived) return false;
    if (range !== "all") {
      const ref = c.updated_at ?? c.created_at ?? null;
      if (!ref) return false;
      const cutoff = Date.now() - (range === "7d" ? 7 : range === "30d" ? 30 : 90) * 86400000;
      if (new Date(ref).getTime() < cutoff) return false;
    }
    return true;
  });

  const timeline = useMemo(() => {
    const groups = new Map<string, UserAiChatRow[]>();
    for (const c of [...filtered].sort((a, b) => ((b.updated_at ?? b.created_at ?? "") > (a.updated_at ?? a.created_at ?? "") ? 1 : -1))) {
      const k = dayKey(c.updated_at ?? c.created_at);
      groups.set(k, [...(groups.get(k) ?? []), c]);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  return (
    <Card className="border-violet-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
              <MessageSquare className="h-3.5 w-3.5" />
            </span>
            AI Chats
            <Badge variant="outline" className="text-[10px]">{all.length} chats</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {all.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {totalMsgs} messages · {aiMsgs} AI
              </span>
            )}
            <div className="flex items-center rounded-md border p-0.5">
              <button
                type="button"
                onClick={() => setView("list")}
                className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${view === "list" ? "bg-violet-500/15 text-violet-700 dark:bg-violet-500/25 dark:text-violet-300" : "text-muted-foreground hover:text-foreground"}`}
                title="List view"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setView("timeline")}
                className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${view === "timeline" ? "bg-violet-500/15 text-violet-700 dark:bg-violet-500/25 dark:text-violet-300" : "text-muted-foreground hover:text-foreground"}`}
                title="Timeline view"
              >
                <CalendarDays className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {all.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search chats, pages, or messages…"
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
              <SelectTrigger className="h-8 w-auto min-w-[110px] text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {types.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
              <SelectTrigger className="h-8 w-auto min-w-[110px] text-xs">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showPinned ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowPinned((v) => !v)}
            >
              <Crown className="h-3.5 w-3.5 mr-1" /> Pinned
            </Button>
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowArchived((v) => !v)}
            >
              <Archive className="h-3.5 w-3.5 mr-1" /> Archived
            </Button>
          </div>
        )}
        {all.length > 0 ? (
          filtered.length > 0 ? (
            view === "timeline" ? (
              <div className="max-h-[520px] overflow-y-auto pr-1">
                {timeline.map(([day, items]) => (
                  <div key={day} className="mb-5 last:mb-0">
                    <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" /> {day}
                      <span className="h-px flex-1 bg-border" />
                    </p>
                    <div className="space-y-1 pl-1">
                      {items.map((chat) => <ChatTimelineRow key={chat.id} chat={chat} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {filtered.map((chat) => (
                  <ChatTranscriptCard key={chat.id} chat={chat} />
                ))}
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground">No chats match your filters.</p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">No AI chats found.</p>
        )}
      </CardContent>
    </Card>
  );
}

function SessionsCard({ sessions }: { sessions: UserSessionRow[] | undefined }) {
  const live = (sessions ?? []).filter((s) => s.status === "active");
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <UserCheck className="h-4 w-4" /> Live Sessions {live.length > 0 && <span className="text-emerald-400">({live.length} live)</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sessions && sessions.length > 0 ? (
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${s.status === "active" ? "bg-emerald-500" : "bg-zinc-600"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.page_id ? `Page ${s.page_id.slice(0, 8)}…` : "No page"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {s.status ?? "idle"} · Last active {s.last_activity ? formatRelativeTime(s.last_activity) : "recently"}
                    </p>
                  </div>
                </div>
                {s.user_color && <span className="text-[11px] text-muted-foreground shrink-0">{s.user_color}</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No collaboration sessions found.</p>
        )}
      </CardContent>
    </Card>
  );
}

function getEventStyle(action?: string | null) {
  const a = (action ?? "").toLowerCase();
  if (a.startsWith("ai_")) {
    return {
      label: a === "ai_generated" ? "AI Generated" : a === "ai_edit" ? "AI Edited" : "AI Action",
      icon: Sparkles,
      iconWrap: "bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300 border-violet-500/20",
      badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25",
      accent: "text-violet-600 dark:text-violet-400",
    };
  }
  if (a.includes("delete") || a.includes("trash")) {
    return {
      label: a.includes("trash") ? "Trashed page" : "Deleted page",
      icon: Trash2,
      iconWrap: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300 border-rose-500/20",
      badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25",
      accent: "text-rose-600 dark:text-rose-400",
    };
  }
  if (a.includes("create")) {
    return {
      label: "Created page",
      icon: Plus,
      iconWrap: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-500/20",
      badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
      accent: "text-emerald-600 dark:text-emerald-400",
    };
  }
  if (a.includes("edit") || a.includes("update")) {
    return {
      label: "Edited content",
      icon: PencilLine,
      iconWrap: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300 border-blue-500/20",
      badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25",
      accent: "text-blue-600 dark:text-blue-400",
    };
  }
  return {
    label: action?.replace(/_/g, " ") ?? "Activity",
    icon: Activity,
    iconWrap: "bg-muted text-muted-foreground border-border",
    badge: "bg-muted text-foreground border-border",
    accent: "text-foreground",
  };
}

function formatPayloadText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return formatPayloadText(parsed);
    } catch {
      return value.trim();
    }
  }
  if (Array.isArray(value)) {
    return value.map((b) => blockText(b) || JSON.stringify(b)).filter(Boolean).join("\n");
  }
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (typeof v.text === "string" && v.text.trim()) return v.text.trim();
    if (typeof v.title === "string" && v.title.trim()) return `Title: ${v.title.trim()}`;
    if (Array.isArray(v.blocks)) {
      return v.blocks.map((b) => blockText(b) || JSON.stringify(b)).filter(Boolean).join("\n");
    }
    if (Array.isArray(v.content)) {
      return v.content.map((b) => blockText(b) || JSON.stringify(b)).filter(Boolean).join("\n");
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function exportEventsCSV(events: UserAuditDetailRow[], pageTitleMap: Map<string, string>) {
  const headers = ["Timestamp", "Action", "Page", "Block Type", "Block ID", "Detail", "AI Provider", "AI Model", "Tokens", "Cost", "Latency (ms)"];
  const rows = events.map((e) => [
    e.created_at || "",
    e.action || "",
    pageTitleMap.get(e.page_id || "") || e.page_id || "",
    e.block_type || "",
    e.block_id || "",
    `"${(e.detail || "").replace(/"/g, '""')}"`,
    e.ai_provider || "",
    e.ai_model || "",
    (Number(e.ai_prompt_tokens || 0) + Number(e.ai_completion_tokens || 0)).toString(),
    e.ai_cost ? String(e.ai_cost) : "0",
    e.ai_latency_ms ? String(e.ai_latency_ms) : "",
  ]);
  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Exported audit log as CSV");
}

function exportEventsJSON(events: UserAuditDetailRow[]) {
  const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Exported audit log as JSON");
}

interface EventDiffProps {
  ev: UserAuditDetailRow;
  pageTitle?: string;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
}

function EventDiffComparator({ ev, pageTitle, onCopy, copiedId }: EventDiffProps) {
  const [viewMode, setViewMode] = useState<"split" | "unified" | "raw">("split");
  const beforeText = formatPayloadText(ev.content_before);
  const afterText = formatPayloadText(ev.content_after);
  const rawBefore = previewContent(ev.content_before);
  const rawAfter = previewContent(ev.content_after);
  const diff = computeBlockDiff(ev.content_before, ev.content_after);

  const beforeLines = beforeText ? beforeText.split("\n") : [];
  const afterLines = afterText ? afterText.split("\n") : [];
  const isInitial = !beforeText || beforeText === "null" || beforeText === "{}" || beforeText === "[]";
  const isDeleted = !afterText || afterText === "null" || afterText === "{}" || afterText === "[]";

  return (
    <div className="rounded-xl border bg-muted/20 overflow-hidden space-y-0">
      {/* Comparator Header / View mode switch */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/40 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-semibold text-foreground text-[11px] uppercase tracking-wider">
            <Split className="h-3.5 w-3.5 text-primary" /> Before & After Comparator
          </span>
          {diff?.countDelta != null && (
            <Badge variant="outline" className="text-[10px] font-mono">
              Delta: {diff.countDelta > 0 ? `+${diff.countDelta}` : diff.countDelta} blocks
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 bg-background border rounded-md p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode("split")}
            className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
              viewMode === "split" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Split className="h-3 w-3" /> Side-by-Side
          </button>
          <button
            type="button"
            onClick={() => setViewMode("unified")}
            className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
              viewMode === "unified" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-3 w-3" /> Unified Diff
          </button>
          <button
            type="button"
            onClick={() => setViewMode("raw")}
            className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
              viewMode === "raw" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code2 className="h-3 w-3" /> Raw JSON
          </button>
        </div>
      </div>

      {/* Visual Block Diff Pills (if structured blocks exist) */}
      {diff && (diff.added.length > 0 || diff.removed.length > 0 || diff.modified.length > 0) && (
        <div className="p-3 border-b bg-background/50 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Block Level Changes</p>
          <div className="space-y-1.5 font-sans">
            {diff.added.map((b, i) => (
              <div key={`a${i}`} className="flex items-start gap-2 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1.5 rounded-md border border-emerald-500/25 text-xs">
                <Plus className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-500" />
                <span className="font-medium">{blockText(b) || `[${b.type || "block"}]`}</span>
              </div>
            ))}
            {diff.removed.map((b, i) => (
              <div key={`r${i}`} className="flex items-start gap-2 text-rose-700 dark:text-rose-300 bg-rose-500/10 px-2.5 py-1.5 rounded-md border border-rose-500/25 text-xs line-through">
                <Minus className="h-3.5 w-3.5 mt-0.5 shrink-0 text-rose-500" />
                <span>{blockText(b) || `[${b.type || "block"}]`}</span>
              </div>
            ))}
            {diff.modified.map((m) => (
              <div key={`m${m.id}`} className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-[11px] font-semibold">
                  <PencilLine className="h-3.5 w-3.5 shrink-0" /> Modified Content
                </div>
                <div className="grid sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-background p-2 border border-border">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase mb-0.5">Previous Text</p>
                    <p className="text-muted-foreground line-through break-words">{m.before}</p>
                  </div>
                  <div className="rounded bg-background p-2 border border-emerald-500/30">
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase mb-0.5">Updated Text</p>
                    <p className="text-foreground font-medium break-words">{m.after}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode 1: Split View (Side-by-Side) */}
      {viewMode === "split" && (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Before Panel */}
          <div className="p-3 space-y-2 bg-rose-500/[0.02]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  Before (Previous State)
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                <span>{beforeText.length} chars</span>
                {!isInitial && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[10px] hover:text-foreground"
                    onClick={() => onCopy(`${ev.id}-before-text`, beforeText)}
                    title="Copy Before Text"
                  >
                    {copiedId === `${ev.id}-before-text` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                )}
              </div>
            </div>

            {isInitial ? (
              <div className="rounded-lg border border-dashed border-border bg-background/50 p-4 text-center text-xs text-muted-foreground">
                <Sparkles className="h-4 w-4 mx-auto text-muted-foreground/60 mb-1" />
                <p className="font-medium text-foreground">Initial Creation State</p>
                <p className="text-[11px] mt-0.5">This content was created brand new with no prior record.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-rose-500/20 bg-background overflow-hidden">
                <div className="max-h-48 overflow-auto p-2.5 font-mono text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                  {beforeLines.map((line, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-muted-foreground/40 select-none text-[10px] w-5 text-right shrink-0">{idx + 1}</span>
                      <span className="flex-1">{line || " "}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* After Panel */}
          <div className="p-3 space-y-2 bg-emerald-500/[0.02]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  After (Updated State)
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                <span>{afterText.length} chars</span>
                {!isDeleted && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[10px] hover:text-foreground"
                    onClick={() => onCopy(`${ev.id}-after-text`, afterText)}
                    title="Copy After Text"
                  >
                    {copiedId === `${ev.id}-after-text` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                )}
              </div>
            </div>

            {isDeleted ? (
              <div className="rounded-lg border border-dashed border-border bg-background/50 p-4 text-center text-xs text-muted-foreground">
                <Trash2 className="h-4 w-4 mx-auto text-rose-500 mb-1" />
                <p className="font-medium text-foreground">Deleted / Removed</p>
                <p className="text-[11px] mt-0.5">Content was removed from the active document.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-500/20 bg-background overflow-hidden">
                <div className="max-h-48 overflow-auto p-2.5 font-mono text-[11px] text-foreground leading-relaxed whitespace-pre-wrap break-words">
                  {afterLines.map((line, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-muted-foreground/40 select-none text-[10px] w-5 text-right shrink-0">{idx + 1}</span>
                      <span className="flex-1">{line || " "}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode 2: Unified Diff View */}
      {viewMode === "unified" && (
        <div className="p-3 bg-background space-y-2">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <span>Unified Text Stream</span>
            <span>{beforeLines.length} lines → {afterLines.length} lines</span>
          </div>
          <div className="max-h-56 overflow-auto rounded-lg border bg-muted/30 p-2.5 font-mono text-[11px] space-y-0.5 leading-relaxed">
            {beforeLines.map((l, i) => {
              if (afterLines.includes(l)) {
                return (
                  <div key={`u-same-${i}`} className="flex gap-2 text-muted-foreground">
                    <span className="select-none text-muted-foreground/40 w-4"> </span>
                    <span>{l}</span>
                  </div>
                );
              }
              return (
                <div key={`u-del-${i}`} className="flex gap-2 bg-rose-500/10 text-rose-700 dark:text-rose-300 px-1 rounded">
                  <span className="select-none text-rose-500 font-bold w-4">-</span>
                  <span className="line-through">{l}</span>
                </div>
              );
            })}
            {afterLines.filter((l) => !beforeLines.includes(l)).map((l, i) => (
              <div key={`u-add-${i}`} className="flex gap-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1 rounded font-medium">
                <span className="select-none text-emerald-500 font-bold w-4">+</span>
                <span>{l}</span>
              </div>
            ))}
            {beforeLines.length === 0 && afterLines.length === 0 && (
              <p className="text-muted-foreground italic text-center py-2">No diff payload text found for this event.</p>
            )}
          </div>
        </div>
      )}

      {/* Mode 3: Raw JSON Payloads */}
      {viewMode === "raw" && (
        <div className="p-3 grid sm:grid-cols-2 gap-3 bg-background">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
              <span>Raw Before Payload</span>
              <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={() => onCopy(`${ev.id}-raw-b`, rawBefore)}>
                {copiedId === `${ev.id}-raw-b` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <pre className="max-h-48 overflow-auto rounded-lg bg-muted/40 border p-2 font-mono text-[10px] text-foreground whitespace-pre-wrap break-all">
              {rawBefore || "null"}
            </pre>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
              <span>Raw After Payload</span>
              <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={() => onCopy(`${ev.id}-raw-a`, rawAfter)}>
                {copiedId === `${ev.id}-raw-a` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <pre className="max-h-48 overflow-auto rounded-lg bg-muted/40 border p-2 font-mono text-[10px] text-foreground whitespace-pre-wrap break-all">
              {rawAfter || "null"}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityLog({ clerkId, pages }: { clerkId: string | undefined; pages: Array<{ id: string; title: string | null }> | undefined }) {
  const { data: events, isLoading } = useUserAuditDetail(clerkId);
  const [action, setAction] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedPageId, setSelectedPageId] = useState("all");
  const [quickRange, setQuickRange] = useState<"all" | "today" | "7d" | "30d" | "custom">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [inspectEvent, setInspectEvent] = useState<UserAuditDetailRow | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const pageTitle = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pages ?? []) if (p.id) map.set(p.id, p.title || "Untitled");
    return map;
  }, [pages]);

  const stats = useMemo(() => {
    const all = events ?? [];
    let edits = 0;
    let ai = 0;
    let creates = 0;
    let deletes = 0;
    for (const e of all) {
      const a = (e.action ?? "").toLowerCase();
      if (a.startsWith("ai_")) ai++;
      else if (a.includes("edit") || a.includes("update")) edits++;
      else if (a.includes("create")) creates++;
      else if (a.includes("delete") || a.includes("trash")) deletes++;
    }
    return { total: all.length, edits, ai, creates, deletes };
  }, [events]);

  const actions = useMemo(() => {
    const s = new Set<string>();
    for (const e of events ?? []) if (e.action) s.add(e.action);
    return [...s].sort();
  }, [events]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    return (events ?? []).filter((e) => {
      if (selectedPageId !== "all" && e.page_id !== selectedPageId) return false;
      if (action !== "all") {
        const a = (e.action ?? "").toLowerCase();
        if (action === "category_edits" && !(a.includes("edit") || a.includes("update"))) return false;
        if (action === "category_ai" && !a.startsWith("ai_")) return false;
        if (action === "category_creates" && !a.includes("create")) return false;
        if (action === "category_deletes" && !(a.includes("delete") || a.includes("trash"))) return false;
        if (!action.startsWith("category_") && e.action !== action) return false;
      }
      if (q) {
        const beforeStr = formatPayloadText(e.content_before).toLowerCase();
        const afterStr = formatPayloadText(e.content_after).toLowerCase();
        const hay = [
          e.action, e.detail, e.block_type, e.block_id, e.ai_model, e.ai_provider,
          pageTitle.get(e.page_id ?? ""), beforeStr, afterStr,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (quickRange === "today" && e.created_at) {
        const d = new Date(e.created_at);
        const today = new Date();
        if (d.toDateString() !== today.toDateString()) return false;
      } else if (quickRange === "7d" && e.created_at) {
        if (new Date(e.created_at).getTime() < now - 7 * 86400000) return false;
      } else if (quickRange === "30d" && e.created_at) {
        if (new Date(e.created_at).getTime() < now - 30 * 86400000) return false;
      } else if (quickRange === "custom") {
        if (fromDate && e.created_at && new Date(e.created_at) < new Date(fromDate)) return false;
        if (toDate && e.created_at && new Date(e.created_at) > new Date(`${toDate}T23:59:59`)) return false;
      }
      return true;
    });
  }, [events, action, selectedPageId, search, quickRange, fromDate, toDate, pageTitle]);

  const groupedEvents = useMemo(() => {
    const map = new Map<string, UserAuditDetailRow[]>();
    const startIdx = page * PAGE_SIZE;
    const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);
    for (const ev of pageItems) {
      const k = ev.created_at ? new Date(ev.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent";
      map.set(k, [...(map.get(k) ?? []), ev]);
    }
    return Array.from(map.entries());
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const hasActiveFilters = action !== "all" || selectedPageId !== "all" || search.trim() !== "" || quickRange !== "all" || fromDate !== "" || toDate !== "";

  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const expandAll = () => {
    const startIdx = page * PAGE_SIZE;
    const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);
    setExpanded(new Set(pageItems.map((e) => e.id)));
  };

  const collapseAll = () => setExpanded(new Set());

  const resetFilters = () => {
    setAction("all");
    setSelectedPageId("all");
    setSearch("");
    setQuickRange("all");
    setFromDate("");
    setToDate("");
    setPage(0);
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Card className="border-border shadow-sm overflow-hidden">
      {/* Header with quick stats & Export toolbar */}
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Activity className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold tracking-tight">Activity & Audit Studio</CardTitle>
                <Badge variant="secondary" className="text-[10px] font-mono font-medium px-1.5 py-0.5">
                  {filtered.length} {filtered.length === 1 ? "event" : "events"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Before & After state comparator, block changes, and AI telemetry records.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Export buttons */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => exportEventsCSV(filtered, pageTitle)}
              disabled={filtered.length === 0}
              title="Export as CSV"
            >
              <FileSpreadsheet className="mr-1 h-3.5 w-3.5 text-emerald-500" /> Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => exportEventsJSON(filtered)}
              disabled={filtered.length === 0}
              title="Export as JSON"
            >
              <Download className="mr-1 h-3.5 w-3.5 text-blue-500" /> JSON
            </Button>

            <span className="h-4 w-px bg-border mx-0.5 hidden sm:block" />

            {/* Expand / Collapse All */}
            {filtered.length > 0 && (
              <div className="flex items-center rounded-md border bg-background p-0.5 text-xs shadow-2xs">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={expandAll}
                >
                  Expand all
                </Button>
                <span className="h-3 w-px bg-border mx-0.5" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={collapseAll}
                >
                  Collapse
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Quick category filter stats */}
        <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { id: "all", label: "All Events", count: stats.total, icon: Layers, color: "text-foreground" },
            { id: "category_edits", label: "Content Edits", count: stats.edits, icon: PencilLine, color: "text-blue-600 dark:text-blue-400" },
            { id: "category_ai", label: "AI Generations", count: stats.ai, icon: Sparkles, color: "text-violet-600 dark:text-violet-400" },
            { id: "category_creates", label: "Pages Created", count: stats.creates, icon: Plus, color: "text-emerald-600 dark:text-emerald-400" },
            { id: "category_deletes", label: "Trashed / Deleted", count: stats.deletes, icon: Trash2, color: "text-rose-600 dark:text-rose-400" },
          ].map((item) => {
            const active = action === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { setAction(active ? "all" : item.id); setPage(0); }}
                className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-all ${
                  active
                    ? "border-primary bg-primary/5 shadow-2xs ring-1 ring-primary/20"
                    : "border-border bg-card hover:bg-muted/50 hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${item.color}`} />
                  <span className="text-[11px] font-medium truncate">{item.label}</span>
                </div>
                <span className={`text-[11px] font-bold font-mono ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Advanced Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px] max-w-[280px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search events & before/after text…"
                className="pl-8 pr-7 h-8 text-xs bg-background"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Filter by Page */}
            {pages && pages.length > 0 && (
              <Select value={selectedPageId} onValueChange={(v) => { setSelectedPageId(v); setPage(0); }}>
                <SelectTrigger className="h-8 w-auto min-w-[130px] max-w-[180px] text-xs bg-background">
                  <SelectValue placeholder="All pages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All pages ({pages.length})</SelectItem>
                  {pages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title || "Untitled page"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Action Specific Select */}
            <Select value={action} onValueChange={(v) => { setAction(v); setPage(0); }}>
              <SelectTrigger className="h-8 w-auto min-w-[125px] text-xs bg-background">
                <SelectValue placeholder="Action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions ({stats.total})</SelectItem>
                {actions.map((a) => (
                  <SelectItem key={a} value={a} className="capitalize">
                    {actionLabel(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Quick date range pill toggle */}
            <div className="flex items-center rounded-md border bg-muted/40 p-0.5 text-xs">
              {[
                { id: "all", label: "All time" },
                { id: "today", label: "Today" },
                { id: "7d", label: "7d" },
                { id: "30d", label: "30d" },
                { id: "custom", label: "Custom" },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { setQuickRange(r.id as typeof quickRange); setPage(0); }}
                  className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                    quickRange === r.id
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Custom date inputs */}
            {quickRange === "custom" && (
              <div className="flex items-center gap-1.5 animate-fade-in">
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
                  className="h-8 w-32 text-xs bg-background"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => { setToDate(e.target.value); setPage(0); }}
                  className="h-8 w-32 text-xs bg-background"
                />
              </div>
            )}
          </div>

          {/* Reset button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground border-dashed animate-fade-in"
              onClick={resetFilters}
            >
              <X className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> Reset filters
            </Button>
          )}
        </div>

        {/* Feed & Comparator Rows */}
        {isLoading ? (
          <LoadingState count={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No matching activity"
            description="Try changing your search terms, date ranges, or page filters."
          />
        ) : (
          <div className="space-y-5">
            {groupedEvents.map(([day, items]) => (
              <div key={day} className="space-y-2">
                {/* Day Header */}
                <div className="flex items-center gap-2 px-1">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {day}
                  </span>
                  <div className="h-px flex-1 bg-border/60" />
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {items.length} {items.length === 1 ? "event" : "events"}
                  </span>
                </div>

                {/* Event Items */}
                <div className="relative pl-3 space-y-2.5 border-l-2 border-border/60 ml-2.5">
                  {items.map((ev) => {
                    const isOpen = expanded.has(ev.id);
                    const aiEv = ev.action?.toLowerCase().startsWith("ai_");
                    const style = getEventStyle(ev.action);
                    const diff = computeBlockDiff(ev.content_before, ev.content_after);
                    const title = pageTitle.get(ev.page_id ?? "");
                    const EventIcon = style.icon;

                    return (
                      <div
                        key={ev.id}
                        className={`rounded-xl border transition-all duration-150 ${
                          isOpen
                            ? "bg-card shadow-sm border-primary/30 ring-1 ring-primary/10"
                            : "bg-card/70 hover:bg-card border-border hover:border-muted-foreground/30 hover:shadow-2xs"
                        }`}
                      >
                        {/* Summary Bar */}
                        <div className="flex items-start gap-3 p-3">
                          <button
                            type="button"
                            className="flex-1 flex items-start gap-3 text-left min-w-0"
                            onClick={() => toggle(ev.id)}
                          >
                            {/* Action Icon Avatar */}
                            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${style.iconWrap}`}>
                              <EventIcon className="h-3.5 w-3.5" />
                            </div>

                            {/* Content & Metadata */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge className={`text-[10px] font-semibold border ${style.badge}`}>
                                  {actionLabel(ev.action)}
                                </Badge>

                                {title && (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/50 truncate max-w-[240px]">
                                    <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="truncate">{title}</span>
                                  </span>
                                )}

                                {ev.block_type && (
                                  <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                                    #{ev.block_type}
                                  </Badge>
                                )}

                                {aiEv && (
                                  <Badge variant="outline" className="text-[10px] font-medium text-violet-600 dark:text-violet-300 border-violet-500/30 bg-violet-500/5">
                                    <Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI
                                  </Badge>
                                )}

                                {diff && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                    <PencilLine className="h-3 w-3 shrink-0" />
                                    {diff.countDelta != null && diff.countDelta > 0 && `+${diff.countDelta} blocks`}
                                    {diff.countDelta != null && diff.countDelta < 0 && `${diff.countDelta} blocks`}
                                    {diff.added.length > 0 && ` ${diff.added.length} added`}
                                    {diff.removed.length > 0 && ` ${diff.removed.length} removed`}
                                    {diff.modified.length > 0 && ` ${diff.modified.length} edited`}
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                                  {ev.detail && <span className="text-foreground font-medium truncate">{ev.detail}</span>}
                                  {aiEv && ev.ai_model && (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                                      <Bot className="h-3 w-3 text-violet-500" /> {ev.ai_model}
                                    </span>
                                  )}
                                  {ev.block_id && (
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      id:{ev.block_id.slice(0, 8)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>

                          {/* Action tools right side */}
                          <div className="flex items-center gap-1.5 shrink-0 self-center">
                            <span
                              className="text-[11px] text-muted-foreground whitespace-nowrap hidden sm:inline"
                              title={formatDateTimeFull(ev.created_at)}
                            >
                              {ev.created_at ? formatRelativeTime(ev.created_at) : "recently"}
                            </span>

                            {/* Inspect Dialog Trigger */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={(e) => { e.stopPropagation(); setInspectEvent(ev); }}
                              title="Inspect full event in dialog"
                            >
                              <Maximize2 className="h-3.5 w-3.5" />
                            </Button>

                            {/* Expand Accordion button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 w-7 p-0 text-muted-foreground transition-transform duration-150 ${isOpen ? "rotate-90 text-foreground" : ""}`}
                              onClick={() => toggle(ev.id)}
                              title={isOpen ? "Collapse" : "Expand Before/After Diff"}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded Drawer: Full Before/After Comparator + AI Telemetry */}
                        {isOpen && (
                          <div className="mx-3 mb-3 pt-3 border-t border-border/70 space-y-3 animate-fade-in">
                            {/* Visual Before & After Comparator Component */}
                            <EventDiffComparator
                              ev={ev}
                              pageTitle={title}
                              onCopy={copyText}
                              copiedId={copiedId}
                            />

                            {/* AI Telemetry details if AI event */}
                            {aiEv && (
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 rounded-lg bg-violet-500/5 border border-violet-500/20 p-3">
                                <div>
                                  <p className="text-[10px] font-medium text-muted-foreground uppercase">Provider</p>
                                  <p className="text-xs font-semibold text-foreground mt-0.5 capitalize">{ev.ai_provider ?? "—"}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-medium text-muted-foreground uppercase">Prompt Tokens</p>
                                  <p className="text-xs font-semibold text-foreground mt-0.5 font-mono">{formatNumber(ev.ai_prompt_tokens)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-medium text-muted-foreground uppercase">Completion Tokens</p>
                                  <p className="text-xs font-semibold text-foreground mt-0.5 font-mono">{formatNumber(ev.ai_completion_tokens)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-medium text-muted-foreground uppercase">Latency</p>
                                  <p className="text-xs font-semibold text-foreground mt-0.5 font-mono">{ev.ai_latency_ms ? `${ev.ai_latency_ms} ms` : "—"}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-medium text-muted-foreground uppercase">Est. Cost</p>
                                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                                    {ev.ai_cost ? formatCurrency(Number(ev.ai_cost)) : "$0.00"}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Event Metadata & ID Footer */}
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                              <span>Recorded: {formatDateTimeFull(ev.created_at)}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => copyText(`log-${ev.id}`, ev.id)}
                                  className="font-mono hover:text-foreground inline-flex items-center gap-1"
                                >
                                  ID: {ev.id.slice(0, 12)}… {copiedId === `log-${ev.id}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
            <p>
              Showing <span className="font-semibold text-foreground">{page * PAGE_SIZE + 1}</span>–<span className="font-semibold text-foreground">{Math.min((page + 1) * PAGE_SIZE, filtered.length)}</span> of <span className="font-semibold text-foreground">{filtered.length}</span> events
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1 px-1 text-xs font-mono">
                <span className="text-foreground font-semibold">{page + 1}</span>
                <span>/</span>
                <span>{totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Deep Event Inspector Modal Dialog */}
      {inspectEvent && (
        <Dialog open={!!inspectEvent} onOpenChange={(open) => { if (!open) setInspectEvent(null); }}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge className={`text-[10px] ${getEventStyle(inspectEvent.action).badge}`}>
                  {actionLabel(inspectEvent.action)}
                </Badge>
                <DialogTitle className="text-base font-bold">
                  Audit Event Inspector: {inspectEvent.id.slice(0, 8)}…
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs">
                Timestamp: {formatDateTimeFull(inspectEvent.created_at)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* Event Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg border bg-muted/20 p-3 text-xs">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Page</p>
                  <p className="font-medium truncate text-foreground mt-0.5">{pageTitle.get(inspectEvent.page_id ?? "") || inspectEvent.page_id || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Block Type</p>
                  <p className="font-mono text-foreground mt-0.5">{inspectEvent.block_type || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Block ID</p>
                  <p className="font-mono text-foreground mt-0.5">{inspectEvent.block_id || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Action</p>
                  <p className="font-medium text-foreground mt-0.5 capitalize">{inspectEvent.action}</p>
                </div>
              </div>

              {/* Full Before & After Comparator */}
              <EventDiffComparator
                ev={inspectEvent}
                pageTitle={pageTitle.get(inspectEvent.page_id ?? "")}
                onCopy={copyText}
                copiedId={copiedId}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

export function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trigger, showSuccess } = useCommandCenter();
  const canManage = user ? hasRole(user, "admin") : false;
  const canEditProfile = user ? hasRole(user, "support") : false;

  const { data: profileRows, isLoading: profileLoading } = useUserProfile(id);
  const profile = profileRows?.[0];

  const { data: subscriptions } = useUserSubscriptions(id, profile?.user_id ?? undefined);
  const { data: chats } = useUserAiChats(profile?.user_id ?? undefined);
  const { data: pages } = useUserPages(profile?.user_id ?? undefined);
  const { data: audit } = useUserAuditDetail(profile?.user_id ?? undefined);
  const { data: adminMatch } = useAdminMatchByEmail(profile?.email);
  const { data: bans } = useUserBans(profile?.user_id ?? undefined, profile?.email ?? undefined);
  const { data: sessions } = useUserSessions(profile?.user_id ?? undefined);
  const { data: storage } = useUserStorage(profile?.user_id ?? undefined);
  const { data: adminActions } = useUserAdminActions(profile?.id);

  useRealtimeInvalidate(["admin", "users"], "user_profiles");
  useRealtimeInvalidate(["admin", "users", "detail", id ?? ""], "user_profiles");

  const banUser = useBanUser();
  const hardBanUser = useHardBanUser();
  const deleteUser = useDeleteUserData();
  const unbanUser = useUnbanUser();

  const summary = useMemo(() => ({
    pages: pages?.length ?? 0,
    chats: chats?.length ?? 0,
    audit: audit?.length ?? 0,
    subscriptions: subscriptions?.length ?? 0,
  }), [pages, chats, audit, subscriptions]);

  const handleBack = () => navigate("/users");

  const handleUnban = async () => {
    if (!profile) return;
    try {
      await unbanUser.mutateAsync(profile.id);
      toast.success("User unbanned");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to unban user");
    }
  };

  const handleBan = () => {
    if (!profile) return;
    trigger({
      type: "ban_user",
      meta: { email: profile.email || profile.user_name || "User Account" },
      onConfirm: async (payload) => {
        try {
          const reason = payload?.input || "No reason specified";
          const isPermanent = payload?.duration === "permanent";
          if (isPermanent) {
            await hardBanUser.mutateAsync({ user_id: profile.id, reason });
          } else {
            await banUser.mutateAsync({
              user_id: profile.id, reason, ban_type: "soft",
              expires_at: payload?.duration === "7_days" ? new Date(Date.now() + 7 * 86400000).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
            });
          }
          showSuccess(`Banned user ${profile.user_name || profile.email}`);
        } catch { showSuccess("Ban failed"); }
      },
    });
  };

  const handleDelete = () => {
    if (!profile) return;
    trigger({
      type: "delete_user",
      meta: { email: profile.email || profile.user_name || "User Account" },
      onConfirm: async () => {
        try {
          await deleteUser.mutateAsync(profile.id);
          showSuccess(`Deleted user data for ${profile.user_name || profile.email}`);
          navigate("/users");
        } catch { showSuccess("Delete failed"); }
      },
    });
  };

  if (profileLoading) {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Users
        </Button>
        <LoadingState count={4} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Users
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="text-lg font-semibold">User not found</p>
            <p className="text-sm text-muted-foreground">This profile may have been deleted or doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeSub = subscriptions?.find((s) => s.status === "active");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Users
        </Button>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-destructive" onClick={handleDelete}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
            <Button variant="outline" size="sm" className="text-destructive" onClick={handleBan}>
              <Ban className="mr-1.5 h-4 w-4" /> Ban
            </Button>
          </div>
        )}
      </div>

      {/* Profile header */}
      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          <AvatarManager profile={profile} canManage={canEditProfile} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">{profile.user_name || "Unnamed"}</h1>
              <RoleBadge profile={profile} adminMatch={adminMatch} />
              {activeSub ? (
                <Badge variant="secondary" className="text-[10px]">Subscriber · {activeSub.plan}</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Free plan</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{profile.email || "No email"}</p>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <AtSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{profile.username || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{profile.created_at ? formatRelativeTime(profile.created_at) : "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{profile.updated_at ? formatRelativeTime(profile.updated_at) : "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground font-mono text-xs truncate">{profile.user_id}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 shrink-0 text-center">
            <div>
              <p className="text-2xl font-bold">{summary.pages}</p>
              <p className="text-[10px] text-muted-foreground">Pages</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{summary.chats}</p>
              <p className="text-[10px] text-muted-foreground">Chats</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{summary.audit}</p>
              <p className="text-[10px] text-muted-foreground">Events</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{summary.subscriptions}</p>
              <p className="text-[10px] text-muted-foreground">Subs</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <LocationCard profile={profile} />

      {/* Profile details */}
      <ProfileInfoCard profile={profile} />

      {/* Access control (admin only) */}
      {canManage && <AccessCard profile={profile} />}

      {/* Subscription */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptions && subscriptions.length > 0 ? (
            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold capitalize">{sub.plan || "Plan"}</span>
                        <Badge variant="outline" className={`text-[10px] ${statusColor(sub.status)}`}>{sub.status || "unknown"}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{sub.customer_name || sub.email || "—"}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    <div>
                      <p className="text-[10px] text-muted-foreground/70">MRR</p>
                      <p className="font-semibold text-foreground">{sub.mrr != null ? formatCurrency(Number(sub.mrr)) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground/70">Payment</p>
                      <p className="font-semibold text-foreground capitalize">{sub.payment_method || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground/70">Started</p>
                      <p className="font-semibold text-foreground">{formatDateTime(sub.started_at)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground/70">Renews</p>
                      <p className="font-semibold text-foreground">{formatDateTime(sub.renews_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No subscription found for this user.</p>
          )}
        </CardContent>
      </Card>

      {/* AI Chats - full width, prominent */}
      <UserDetailChatsCard chats={chats} />

      {/* Pages */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" /> Pages ({summary.pages})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pages && pages.length > 0 ? (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {pages.map((pg) => (
                <div key={pg.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{pg.title || "Untitled"}</p>
                    <p className="text-[11px] text-muted-foreground">Updated {pg.updated_at ? formatRelativeTime(pg.updated_at) : "recently"}</p>
                  </div>
                  {pg.trashed && <Badge variant="outline" className="text-[10px] text-muted-foreground">Trashed</Badge>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No pages found.</p>
          )}
        </CardContent>
      </Card>

      {/* Admin info / Ban status / Sessions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {adminMatch?.[0] && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" /> Platform Admin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={adminMatch[0].avatar_url ?? undefined} />
                  <AvatarFallback>{initialsFromName(adminMatch[0].name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold">{adminMatch[0].name}</p>
                  <p className="text-xs text-muted-foreground">{adminMatch[0].email}</p>
                </div>
                <Badge className={`ml-auto text-[10px] ${roleBadgeStyle(adminMatch[0].role)}`}>
                  <ShieldCheck className="mr-1 h-3 w-3" /> {adminRoleLabel(adminMatch[0].role)}
                </Badge>
              </div>
              {adminMatch[0].last_login && (
                <p className="mt-2 text-[11px] text-muted-foreground">Last login {formatDateTime(adminMatch[0].last_login)}</p>
              )}
            </CardContent>
          </Card>
        )}
        <BanStatusCard profile={profile} bans={bans} onUnban={() => void handleUnban()} />
      </div>

      {/* AI usage + live sessions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AiUsageCard events={audit} chats={chats} />
        <SessionsCard sessions={sessions} />
      </div>

      {/* Storage usage + admin actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <StorageUsageCard storage={storage} />
        <AdminActionsCard actions={adminActions} />
      </div>

      {/* Activity / Audit log with filters + preview */}
      <ActivityLog clerkId={profile?.user_id ?? undefined} pages={pages} />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5" />
        <span>All data is live from the database and updates in real time.</span>
      </div>
    </div>
  );
}