import { useState, useMemo } from "react";
import { Portal } from "@/components/ui/Portal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLaunchSettings, useUpdateLaunchSettings, useWaitlistStats, useRealtimeInvalidate, useLaunchAuditLogs } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatRelativeTime } from "@/lib/utils";
import { Megaphone, Globe, Clock, EyeOff, Users, CheckCircle2, ChevronDown, ChevronUp, History, RotateCcw, Sparkles, ArrowUpDown } from "lucide-react";
import toast from "react-hot-toast";

const MODE_LABELS: Record<string, string> = {
  waitlist: "Waitlist",
  early_beta: "Early Beta",
  closed_beta: "Closed Beta",
  open_beta: "Open Beta",
  public: "Public Launch",
  maintenance: "Maintenance",
};

const MODE_COLORS: Record<string, "secondary" | "warning" | "default" | "success" | "destructive"> = {
  waitlist: "secondary",
  early_beta: "warning",
  closed_beta: "default",
  open_beta: "success",
  public: "success",
  maintenance: "destructive",
};

function ModeSelector({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
      {Object.entries(MODE_LABELS).map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          disabled={disabled}
          className={`relative rounded-lg border-2 px-3 py-3 text-center text-sm font-medium transition-all ${
            value === key
              ? "border-primary bg-primary/10 text-primary shadow-sm"
              : "border-border hover:border-muted-foreground/30 hover:bg-accent"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {value === key && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
              <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
            </span>
          )}
          {label}
        </button>
      ))}
    </div>
  );
}

function ToggleCard({ title, description, enabled, onToggle, children }: { title: string; description: string; enabled: boolean; onToggle: (v: boolean) => void; children?: React.ReactNode }) {
  return (
    <Card className={enabled ? "border-primary/20" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{title}</span>
              <Badge variant={enabled ? "success" : "secondary"} className="text-[9px] px-1.5">{enabled ? "ON" : "OFF"}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
        {enabled && children && <div className="mt-3 pt-3 border-t">{children}</div>}
      </CardContent>
    </Card>
  );
}

export function LaunchControl() {
  const { user } = useAuth();
  const { data: settings, isLoading } = useLaunchSettings();
  const updateSettings = useUpdateLaunchSettings();
  const { data: stats } = useWaitlistStats();
  const { data: auditLogs } = useLaunchAuditLogs(10);
  useRealtimeInvalidate(["admin", "launch-settings"], "launch_settings");
  useRealtimeInvalidate(["admin", "waitlist-stats"], "waitlist_entries");

  const [local, setLocal] = useState<Record<string, unknown>>({});
  const [showAudit, setShowAudit] = useState(false);
  const [dirty, setDirty] = useState(false);

  const merged = useMemo(() => {
    if (!settings) return null;
    return { ...settings, ...local } as typeof settings;
  }, [settings, local]);

  const set = (key: string, value: unknown) => {
    setLocal((p) => ({ ...p, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!dirty || !user) return;
    try {
      await updateSettings.mutateAsync({ ...local, admin_name: user.name });
      setLocal({});
      setDirty(false);
      toast.success("Launch settings saved");
    } catch (e) {
      toast.error("Failed to save: " + (e instanceof Error ? e.message : "Unknown"));
    }
  };

  const handleReset = () => {
    setLocal({});
    setDirty(false);
    toast.success("Changes discarded");
  };

  if (isLoading) return <div className="p-6"><PageHeader title="Launch Control" description="Manage launch mode and global settings" /><LoadingState count={3} /></div>;
  if (!merged) return <div className="p-6"><PageHeader title="Launch Control" description="Manage launch mode and global settings" /><p className="text-muted-foreground">No launch settings found.</p></div>;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Launch Control"
        description={`Current mode: ${MODE_LABELS[merged.launch_mode] ?? merged.launch_mode}`}
        actions={
          <div className="flex items-center gap-2">
            {dirty && (
              <>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> Discard
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
                  <Sparkles className="mr-1 h-3.5 w-3.5" /> Publish Changes
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowAudit(!showAudit)}>
              <History className="mr-1 h-3.5 w-3.5" /> Audit Log
            </Button>
          </div>
        }
      />

      {showAudit && auditLogs && auditLogs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Changes</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-60 overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="px-4 py-2.5 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-medium">{log.admin_name ?? "Unknown"}</span>
                    <span className="text-muted-foreground"> — {log.action} </span>
                    <code className="rounded bg-muted px-1">{log.entity_type}</code>
                    {log.field && <span className="text-muted-foreground"> ({log.field})</span>}
                  </div>
                  <span className="text-muted-foreground">{formatRelativeTime(log.created_at)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><Globe className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold capitalize">{MODE_LABELS[merged.launch_mode]}</p><p className="text-xs text-muted-foreground">Launch Mode</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Users className="h-5 w-5 text-blue-500" /><div><p className="text-2xl font-bold">{stats?.total ?? 0}</p><p className="text-xs text-muted-foreground">Total Waitlist</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Clock className="h-5 w-5 text-amber-500" /><div><p className="text-2xl font-bold">{stats?.today ?? 0}</p><p className="text-xs text-muted-foreground">Today's Signups</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><EyeOff className="h-5 w-5 text-muted-foreground" /><div><p className="text-2xl font-bold">{merged.show_pricing ? "Visible" : "Hidden"}</p><p className="text-xs text-muted-foreground">Pricing Page</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Launch Mode</CardTitle></CardHeader>
        <CardContent>
          <ModeSelector value={merged.launch_mode} onChange={(v) => set("launch_mode", v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Feature Flags</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ToggleCard title="Pricing" description="Show pricing page" enabled={merged.show_pricing} onToggle={(v) => set("show_pricing", v)} />
          <ToggleCard title="Blog" description="Show blog section" enabled={merged.show_blog} onToggle={(v) => set("show_blog", v)} />
          <ToggleCard title="Docs" description="Show documentation" enabled={merged.show_docs} onToggle={(v) => set("show_docs", v)} />
          <ToggleCard title="Changelog" description="Show changelog" enabled={merged.show_changelog} onToggle={(v) => set("show_changelog", v)} />
          <ToggleCard title="Login" description="Show login page" enabled={merged.show_login} onToggle={(v) => set("show_login", v)} />
          <ToggleCard title="Signup" description="Show signup page" enabled={merged.show_signup} onToggle={(v) => set("show_signup", v)} />
          <ToggleCard title="Waitlist" description="Show waitlist page" enabled={merged.show_waitlist} onToggle={(v) => set("show_waitlist", v)} />
          <ToggleCard title="Discord" description="Show Discord link" enabled={merged.show_discord} onToggle={(v) => set("show_discord", v)} />
          <ToggleCard title="Community" description="Show community section" enabled={merged.show_community} onToggle={(v) => set("show_community", v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Countdown / Launch Date</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={merged.countdown_enabled} onCheckedChange={(v) => set("countdown_enabled", v)} />
            <div>
              <p className="text-sm font-medium">Enable Countdown</p>
              <p className="text-xs text-muted-foreground">Show countdown timer on the site</p>
            </div>
          </div>
          {merged.countdown_enabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Launch Date</Label>
                <Input type="datetime-local" value={merged.launch_date?.slice(0, 16) ?? ""} onChange={(e) => set("launch_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Auto-switch to</Label>
                <Select value={merged.auto_switch_mode ?? ""} onValueChange={(v) => set("auto_switch_mode", v)}>
                  <SelectTrigger><SelectValue placeholder="Don't auto-switch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="waitlist">Waitlist</SelectItem>
                    <SelectItem value="early_beta">Early Beta</SelectItem>
                    <SelectItem value="closed_beta">Closed Beta</SelectItem>
                    <SelectItem value="open_beta">Open Beta</SelectItem>
                    <SelectItem value="public">Public Launch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Maintenance Mode</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {merged.launch_mode === "maintenance" && (
            <>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={merged.maintenance_title} onChange={(e) => set("maintenance_title", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea value={merged.maintenance_message} onChange={(e) => set("maintenance_message", e.target.value)} rows={2} />
              </div>
            </>
          )}
          {merged.launch_mode !== "maintenance" && (
            <p className="text-sm text-muted-foreground">Switch to Maintenance mode above to configure maintenance message.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Global CTA Behavior</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Login Button Mode</Label>
            <Select value={merged.login_mode} onValueChange={(v) => set("login_mode", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="login">Login (/login)</SelectItem>
                <SelectItem value="launch">Launch (/launch)</SelectItem>
                <SelectItem value="waitlist">Waitlist (/waitlist)</SelectItem>
                <SelectItem value="custom">Custom URL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {merged.login_mode === "custom" && (
            <div className="space-y-2">
              <Label>Custom Login URL</Label>
              <Input value={merged.custom_login_url ?? ""} onChange={(e) => set("custom_login_url", e.target.value)} placeholder="https://..." />
            </div>
          )}
          <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
            All login/CTA buttons across the site will automatically redirect based on this setting. Individual CTA buttons can override this in the CTA Manager.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
