import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Info, Sparkles, AlertTriangle, Rocket, Wrench, Gift, Star, Plus, Pencil, Trash2,
  Globe, Monitor, Layers, EyeOff, Eye, RefreshCw, Megaphone,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase, SUPABASE_ENABLED, getAdminToken } from "@/lib/supabase";

interface InfoCardRow {
  id: string;
  title: string;
  body: string;
  icon: string;
  accent: string;
  platform: string;
  dismissible: boolean;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ICON_OPTIONS = [
  { value: "info", label: "Info", Icon: Info },
  { value: "sparkles", label: "Sparkles", Icon: Sparkles },
  { value: "alert", label: "Alert", Icon: AlertTriangle },
  { value: "rocket", label: "Rocket", Icon: Rocket },
  { value: "maintenance", label: "Maintenance", Icon: Wrench },
  { value: "gift", label: "Gift", Icon: Gift },
  { value: "star", label: "Star", Icon: Star },
] as const;

const ACCENT_OPTIONS = ["blue", "green", "amber", "red", "purple"] as const;
const PLATFORM_OPTIONS = [
  { value: "both", label: "Web + Desktop", Icon: Layers },
  { value: "web", label: "Web only", Icon: Globe },
  { value: "desktop", label: "Desktop only", Icon: Monitor },
] as const;

const ACCENT_BADGE: Record<string, string> = {
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  purple: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
};

interface CardForm {
  title: string;
  body: string;
  icon: string;
  accent: string;
  platform: string;
  dismissible: boolean;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

const emptyForm = (): CardForm => ({
  title: "",
  body: "",
  icon: "info",
  accent: "blue",
  platform: "both",
  dismissible: true,
  starts_at: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
  ends_at: "",
  is_active: true,
});

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function isActiveNow(card: InfoCardRow): boolean {
  if (!card.is_active) return false;
  if (new Date(card.starts_at).getTime() > Date.now()) return false;
  if (card.ends_at && new Date(card.ends_at).getTime() <= Date.now()) return false;
  return true;
}

export function AnnouncementCardsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InfoCardRow | null>(null);
  const [form, setForm] = useState<CardForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<InfoCardRow | null>(null);

  const { data: cards, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "announcement-cards"],
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return [] as InfoCardRow[];
      const { data, error } = await supabase.rpc("admin_select", {
        p_session_token: getAdminToken(),
        p_table: "info_cards",
        p_select: "*",
        p_order_col: "created_at",
        p_order_dir: "desc",
        p_limit: 100,
      });
      if (error) throw error;
      return (data ?? []) as InfoCardRow[];
    },
    refetchInterval: 60000,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const token = getAdminToken();
      if (!token) throw new Error("No admin session");
      if (!form.title.trim() || !form.body.trim()) throw new Error("Title and body are required");
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        icon: form.icon,
        accent: form.accent,
        platform: form.platform,
        dismissible: form.dismissible,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase.rpc("admin_update", {
          p_session_token: token, p_table: "info_cards", p_id: editing.id,
          p_data: payload, p_min_role: "marketing",
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc("admin_insert", {
          p_session_token: token, p_table: "info_cards",
          p_data: payload, p_min_role: "marketing",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Card updated" : "Card created");
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "announcement-cards"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Save failed"),
  });

  const toggleActive = useMutation({
    mutationFn: async (card: InfoCardRow) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_update", {
        p_session_token: getAdminToken(), p_table: "info_cards", p_id: card.id,
        p_data: { is_active: !card.is_active }, p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "announcement-cards"] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Update failed"),
  });

  const remove = useMutation({
    mutationFn: async (card: InfoCardRow) => {
      if (!SUPABASE_ENABLED || !supabase) throw new Error("Supabase not available");
      const { error } = await supabase.rpc("admin_delete", {
        p_session_token: getAdminToken(), p_table: "info_cards", p_id: card.id,
        p_min_role: "marketing",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Card deleted");
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["admin", "announcement-cards"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (card: InfoCardRow) => {
    setEditing(card);
    setForm({
      title: card.title,
      body: card.body,
      icon: card.icon,
      accent: card.accent,
      platform: card.platform,
      dismissible: card.dismissible,
      starts_at: toLocalInput(card.starts_at),
      ends_at: toLocalInput(card.ends_at),
      is_active: card.is_active,
    });
    setDialogOpen(true);
  };

  const rows = useMemo(() => cards ?? [], [cards]);
  const activeCount = rows.filter(isActiveNow).length;
  const scheduledCount = rows.filter((c) => c.is_active && new Date(c.starts_at).getTime() > Date.now()).length;

  const FormIcon = ICON_OPTIONS.find((i) => i.value === form.icon)?.Icon ?? Info;

  return (
    <div className="p-6">
      <PageHeader
        title="Announcement Cards"
        description="Banners shown inside the Noska web & desktop app"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Card
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Megaphone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Live now</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Clockish />
            <div>
              <p className="text-lg font-bold">{scheduledCount}</p>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{rows.length}</p>
              <p className="text-xs text-muted-foreground">Total cards</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <LoadingState count={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No announcement cards"
          description="Create a card to surface an announcement inside the app. Cards appear in the workspace banner slot on the chosen platforms."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((card) => {
            const Icon = ICON_OPTIONS.find((i) => i.value === card.icon)?.Icon ?? Info;
            const live = isActiveNow(card);
            const platformMeta = PLATFORM_OPTIONS.find((p) => p.value === card.platform);
            return (
              <Card key={card.id} className={live ? "border-l-4 border-l-emerald-500" : card.is_active ? "border-l-4 border-l-amber-400" : "opacity-75"}>
                <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${ACCENT_BADGE[card.accent] ?? ACCENT_BADGE.blue}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(card.starts_at).toLocaleDateString()}
                        {card.ends_at ? ` → ${new Date(card.ends_at).toLocaleDateString()}` : " → no end"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {live ? (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Live</Badge>
                    ) : card.is_active ? (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Scheduled / Ended</Badge>
                    ) : (
                      <Badge variant="secondary">Paused</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{card.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      {platformMeta ? <platformMeta.Icon className="h-3 w-3" /> : <Layers className="h-3 w-3" />}
                      {platformMeta?.label ?? card.platform}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      {card.dismissible ? <><EyeOff className="h-3 w-3" /> Dismissible</> : <><Eye className="h-3 w-3" /> Persistent</>}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Switch checked={card.is_active} onCheckedChange={() => toggleActive.mutate(card)} />
                      {card.is_active ? "Active" : "Paused"}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(card)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(card)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit announcement card" : "New announcement card"}</DialogTitle>
            <DialogDescription>
              Cards appear at the top of the app workspace while active and inside the date range.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="card-title">Title</Label>
              <Input
                id="card-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Noska 1.1 is here"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="card-body">Body</Label>
              <Textarea
                id="card-body"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Short announcement text shown under the title"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Icon</Label>
                <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(({ value, label, Icon }) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5" /> {label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Accent</Label>
                <Select value={form.accent} onValueChange={(v) => setForm({ ...form, accent: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCENT_OPTIONS.map((a) => (
                      <SelectItem key={a} value={a}>
                        <span className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${ACCENT_BADGE[a].split(" ")[0]}`} /> {a}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Platform</Label>
                <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map(({ value, label, Icon }) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5" /> {label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end justify-between rounded-lg border px-3 py-2.5">
                <div>
                  <Label htmlFor="card-dismissible" className="text-sm">Dismissible</Label>
                  <p className="text-xs text-muted-foreground">User can close the card</p>
                </div>
                <Switch
                  id="card-dismissible"
                  checked={form.dismissible}
                  onCheckedChange={(v) => setForm({ ...form, dismissible: v })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="card-starts">Starts at</Label>
                <Input
                  id="card-starts"
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="card-ends">Ends at (optional)</Label>
                <Input
                  id="card-ends"
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                />
              </div>
            </div>

            {/* Live preview */}
            <div className="space-y-1.5">
              <Label>Preview</Label>
              <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${ACCENT_BADGE[form.accent]?.includes("blue") ? "border-blue-500/30" : "border-border"}`}>
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${ACCENT_BADGE[form.accent] ?? ACCENT_BADGE.blue}`}>
                  <FormIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">{form.title || "Card title"}</p>
                  <p className="mt-0.5 whitespace-pre-line text-xs leading-snug text-muted-foreground">{form.body || "Card body text"}</p>
                </div>
                {form.dismissible && <span className="mt-0.5 text-xs text-muted-foreground">✕</span>}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <Label htmlFor="card-active" className="text-sm">Active (publish immediately)</Label>
              <Switch
                id="card-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : editing ? "Save changes" : "Create card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete card?</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.title}” will be removed immediately and disappear from all clients.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && remove.mutate(deleteTarget)} disabled={remove.isPending}>
              {remove.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Clockish() {
  return <Wrench className="h-5 w-5 text-muted-foreground" />;
}

export default AnnouncementCardsPage;
