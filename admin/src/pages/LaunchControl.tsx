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
import { useLaunchSettings, useUpdateLaunchSettings, useWaitlistStats, useRealtimeInvalidate, useLaunchAuditLogs, useCTAButtons, useUpdateCTAButton } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatRelativeTime } from "@/lib/utils";
import { Megaphone, Globe, Clock, EyeOff, Users, CheckCircle2, ChevronDown, ChevronUp, History, RotateCcw, Sparkles, ArrowUpDown, RefreshCw } from "lucide-react";
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

const MODE_CTA_PRESETS: Record<string, Record<string, { text: string; dest: string }>> = {
  waitlist: {
    navbar_login: { text: "Log in", dest: "/login" },
    navbar_cta: { text: "Join Waitlist", dest: "/launch" },
    navbar_demo: { text: "Request a demo", dest: "/enterprise" },
    hero_primary: { text: "Join Waitlist", dest: "/launch" },
    hero_secondary: { text: "Watch Demo", dest: "#demo" },
    footer_cta: { text: "Join Waitlist", dest: "/launch" },
    pricing_cta: { text: "View all plans", dest: "/pricing" },
    final_cta_primary: { text: "Join Waitlist", dest: "/launch" },
    final_cta_secondary: { text: "Learn more", dest: "/product" },
    mobile_login: { text: "Log in", dest: "/login" },
    mobile_cta: { text: "Join Waitlist", dest: "/launch" },
    launch_navbar_login: { text: "Log in", dest: "/login" },
    launch_navbar_cta: { text: "Join Waitlist", dest: "/launch" },
    launch_hero_primary: { text: "Join Waitlist", dest: "/launch" },
    launch_hero_secondary: { text: "Watch Demo", dest: "#demo" },
  },
  early_beta: {
    navbar_login: { text: "Log in", dest: "/login" },
    navbar_cta: { text: "Get Started", dest: "/signup" },
    navbar_demo: { text: "Request a demo", dest: "/enterprise" },
    hero_primary: { text: "Get Started", dest: "/signup" },
    hero_secondary: { text: "See what's inside", dest: "/product" },
    footer_cta: { text: "Get Started", dest: "/signup" },
    pricing_cta: { text: "View all plans", dest: "/pricing" },
    final_cta_primary: { text: "Get Started", dest: "/signup" },
    final_cta_secondary: { text: "Learn more", dest: "/product" },
    mobile_login: { text: "Log in", dest: "/login" },
    mobile_cta: { text: "Get Started", dest: "/signup" },
    launch_navbar_login: { text: "Log in", dest: "/login" },
    launch_navbar_cta: { text: "Get Started", dest: "/signup" },
    launch_hero_primary: { text: "Get Started", dest: "/signup" },
    launch_hero_secondary: { text: "See what's inside", dest: "/product" },
  },
  closed_beta: {
    navbar_login: { text: "Log in", dest: "/login" },
    navbar_cta: { text: "Get Started", dest: "/signup" },
    navbar_demo: { text: "Request a demo", dest: "/enterprise" },
    hero_primary: { text: "Get Started", dest: "/signup" },
    hero_secondary: { text: "See what's inside", dest: "/product" },
    footer_cta: { text: "Get Started", dest: "/signup" },
    pricing_cta: { text: "View all plans", dest: "/pricing" },
    final_cta_primary: { text: "Get Started", dest: "/signup" },
    final_cta_secondary: { text: "Learn more", dest: "/product" },
    mobile_login: { text: "Log in", dest: "/login" },
    mobile_cta: { text: "Get Started", dest: "/signup" },
    launch_navbar_login: { text: "Log in", dest: "/login" },
    launch_navbar_cta: { text: "Get Started", dest: "/signup" },
    launch_hero_primary: { text: "Get Started", dest: "/signup" },
    launch_hero_secondary: { text: "See what's inside", dest: "/product" },
  },
  open_beta: {
    navbar_login: { text: "Log in", dest: "/login" },
    navbar_cta: { text: "Get Started", dest: "/signup" },
    navbar_demo: { text: "Request a demo", dest: "/enterprise" },
    hero_primary: { text: "Get started free", dest: "/signup" },
    hero_secondary: { text: "See what's inside", dest: "/product" },
    footer_cta: { text: "Get started free", dest: "/signup" },
    pricing_cta: { text: "View all plans", dest: "/pricing" },
    final_cta_primary: { text: "Get started free", dest: "/signup" },
    final_cta_secondary: { text: "Learn more", dest: "/product" },
    mobile_login: { text: "Log in", dest: "/login" },
    mobile_cta: { text: "Get started free", dest: "/signup" },
    launch_navbar_login: { text: "Log in", dest: "/login" },
    launch_navbar_cta: { text: "Get started free", dest: "/signup" },
    launch_hero_primary: { text: "Get started free", dest: "/signup" },
    launch_hero_secondary: { text: "What's new", dest: "/changelog" },
  },
  public: {
    navbar_login: { text: "Log in", dest: "/login" },
    navbar_cta: { text: "Get started free", dest: "/signup" },
    navbar_demo: { text: "Request a demo", dest: "/enterprise" },
    hero_primary: { text: "Get started free", dest: "/signup" },
    hero_secondary: { text: "See what's inside", dest: "/product" },
    footer_cta: { text: "Get started free", dest: "/signup" },
    pricing_cta: { text: "View all plans", dest: "/pricing" },
    final_cta_primary: { text: "Get started free", dest: "/signup" },
    final_cta_secondary: { text: "Learn more", dest: "/product" },
    mobile_login: { text: "Log in", dest: "/login" },
    mobile_cta: { text: "Get started free", dest: "/signup" },
    launch_navbar_login: { text: "Log in", dest: "/login" },
    launch_navbar_cta: { text: "Get started free", dest: "/signup" },
    launch_hero_primary: { text: "Get started free", dest: "/signup" },
    launch_hero_secondary: { text: "What's new", dest: "/changelog" },
  },
};

const CTA_LABELS: Record<string, string> = {
  navbar_login: "Navbar Login",
  navbar_cta: "Navbar Primary CTA",
  navbar_demo: "Navbar Demo",
  hero_primary: "Hero Primary CTA",
  hero_secondary: "Hero Secondary CTA",
  footer_cta: "Footer CTA",
  pricing_cta: "Pricing CTA",
  final_cta_primary: "Final CTA Primary",
  final_cta_secondary: "Final CTA Secondary",
  mobile_login: "Mobile Login",
  mobile_cta: "Mobile CTA",
  launch_navbar_login: "Launch Navbar Login",
  launch_navbar_cta: "Launch Navbar CTA",
  launch_hero_primary: "Launch Hero Primary",
  launch_hero_secondary: "Launch Hero Secondary",
};

export function LaunchControl() {
  const { user } = useAuth();
  const { data: settings, isLoading } = useLaunchSettings();
  const updateSettings = useUpdateLaunchSettings();
  const { data: stats } = useWaitlistStats();
  const { data: auditLogs } = useLaunchAuditLogs(10);
  const { data: ctaButtons } = useCTAButtons();
  const updateCTAButton = useUpdateCTAButton();
  useRealtimeInvalidate(["admin", "launch-settings"], "launch_settings");
  useRealtimeInvalidate(["admin", "waitlist-stats"], "waitlist_entries");

  const [local, setLocal] = useState<Record<string, unknown>>({});
  const [showAudit, setShowAudit] = useState(false);
  const [showCtaPreview, setShowCtaPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [applyingPresets, setApplyingPresets] = useState(false);

  const merged = useMemo(() => {
    if (!settings) return null;
    return { ...settings, ...local } as typeof settings;
  }, [settings, local]);

  const set = (key: string, value: unknown) => {
    setLocal((p) => ({ ...p, [key]: value }));
    setDirty(true);
  };

  const handleModeChange = (newMode: string) => {
    const updates: Record<string, unknown> = { launch_mode: newMode };
    switch (newMode) {
      case "waitlist":
        updates.show_waitlist = true;
        updates.show_pricing = false;
        updates.show_blog = false;
        updates.show_docs = false;
        updates.show_login = false;
        updates.show_signup = false;
        break;
      case "early_beta":
        updates.show_waitlist = false;
        updates.show_pricing = true;
        updates.show_blog = true;
        updates.show_docs = true;
        updates.show_login = true;
        updates.show_signup = false;
        break;
      case "closed_beta":
        updates.show_waitlist = false;
        updates.show_pricing = true;
        updates.show_blog = true;
        updates.show_docs = true;
        updates.show_login = true;
        updates.show_signup = false;
        break;
      case "open_beta":
        updates.show_waitlist = false;
        updates.show_pricing = true;
        updates.show_blog = true;
        updates.show_docs = true;
        updates.show_login = true;
        updates.show_signup = true;
        break;
      case "public":
        updates.show_waitlist = false;
        updates.show_pricing = true;
        updates.show_blog = true;
        updates.show_docs = true;
        updates.show_login = true;
        updates.show_signup = true;
        break;
      case "maintenance":
        updates.show_waitlist = false;
        updates.show_pricing = false;
        updates.show_blog = false;
        updates.show_docs = false;
        updates.show_login = false;
        updates.show_signup = false;
        break;
    }
    setLocal((p) => ({ ...p, ...updates }));
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
          <ModeSelector value={merged.launch_mode} onChange={handleModeChange} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Feature Flags</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ToggleCard title="Pricing" description="Show pricing page" enabled={merged.show_pricing} onToggle={(v) => { set("show_pricing", v); updateSettings.mutate({ show_pricing: v, admin_name: user?.name }); }} />
          <ToggleCard title="Blog" description="Show blog section" enabled={merged.show_blog} onToggle={(v) => { set("show_blog", v); updateSettings.mutate({ show_blog: v, admin_name: user?.name }); }} />
          <ToggleCard title="Docs" description="Show documentation" enabled={merged.show_docs} onToggle={(v) => { set("show_docs", v); updateSettings.mutate({ show_docs: v, admin_name: user?.name }); }} />
          <ToggleCard title="Changelog" description="Show changelog" enabled={merged.show_changelog} onToggle={(v) => { set("show_changelog", v); updateSettings.mutate({ show_changelog: v, admin_name: user?.name }); }} />
          <ToggleCard title="Login" description="Show login page" enabled={merged.show_login} onToggle={(v) => { set("show_login", v); updateSettings.mutate({ show_login: v, admin_name: user?.name }); }} />
          <ToggleCard title="Signup" description="Show signup page" enabled={merged.show_signup} onToggle={(v) => { set("show_signup", v); updateSettings.mutate({ show_signup: v, admin_name: user?.name }); }} />
          <ToggleCard title="Waitlist" description="Show waitlist page" enabled={merged.show_waitlist} onToggle={(v) => { set("show_waitlist", v); updateSettings.mutate({ show_waitlist: v, admin_name: user?.name }); }} />
          <ToggleCard title="Discord" description="Show Discord link" enabled={merged.show_discord} onToggle={(v) => { set("show_discord", v); updateSettings.mutate({ show_discord: v, admin_name: user?.name }); }} />
          <ToggleCard title="Community" description="Show community section" enabled={merged.show_community} onToggle={(v) => { set("show_community", v); updateSettings.mutate({ show_community: v, admin_name: user?.name }); }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Countdown / Launch Date</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={merged.countdown_enabled} onCheckedChange={(v) => { set("countdown_enabled", v); updateSettings.mutate({ countdown_enabled: v, admin_name: user?.name }); }} />
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Global CTA Behavior</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowCtaPreview(!showCtaPreview)}>
              {showCtaPreview ? "Hide" : "Preview"} CTAs
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Login Button Mode</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await updateSettings.mutateAsync({ login_mode: merged.login_mode, admin_name: user?.name });
                    setLocal((p) => {
                      const { login_mode, ...rest } = p;
                      return rest;
                    });
                    if (!Object.keys(local).filter(k => k !== "login_mode").length) {
                      setDirty(false);
                    }
                    toast.success("Login button mode saved");
                  } catch (e) {
                    toast.error("Failed to save: " + (e instanceof Error ? e.message : "Unknown"));
                  }
                }}
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
                Save
              </Button>
            </div>
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

          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
            <div className="text-sm text-muted-foreground">
              <strong>Mode Presets:</strong> Apply {MODE_LABELS[merged.launch_mode]}-optimized button text and destinations to all CTAs.
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={applyingPresets}
              onClick={async () => {
                if (!user || !ctaButtons) return;
                setApplyingPresets(true);
                const preset = MODE_CTA_PRESETS[merged.launch_mode];
                if (!preset) { toast.error("No presets for this mode"); setApplyingPresets(false); return; }
                let count = 0;
                for (const btn of ctaButtons) {
                  const p = preset[btn.button_id];
                  if (p) {
                    try {
                      await updateCTAButton.mutateAsync({
                        id: btn.id,
                        button_text: p.text,
                        destination: p.dest,
                        admin_name: user.name,
                      });
                      count++;
                    } catch { /* skip failed */ }
                  }
                }
                toast.success(`Applied ${count} CTA presets for ${MODE_LABELS[merged.launch_mode]}`);
                setApplyingPresets(false);
              }}
            >
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${applyingPresets ? "animate-spin" : ""}`} />
              {applyingPresets ? "Applying..." : "Apply Mode Presets"}
            </Button>
          </div>

          {showCtaPreview && ctaButtons && (
            <div className="rounded-lg border overflow-hidden">
              <div className="max-h-72 overflow-y-auto divide-y text-xs">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 font-medium text-muted-foreground">
                  <span className="flex-1">Button</span>
                  <span className="w-28">Current</span>
                  <span className="w-28">Mode Preset</span>
                </div>
                {ctaButtons.map((btn) => {
                  const preset = MODE_CTA_PRESETS[merged.launch_mode]?.[btn.button_id];
                  const currentText = btn.button_text;
                  const presetText = preset?.text;
                  return (
                    <div key={btn.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30">
                      <span className="flex-1 font-medium">{CTA_LABELS[btn.button_id] ?? btn.button_id}</span>
                      <span className="w-28 truncate text-muted-foreground">
                        {currentText} <span className="text-[10px] opacity-50">→ {btn.destination}</span>
                      </span>
                      <span className={`w-28 truncate ${currentText !== presetText && presetText ? "text-primary font-medium" : "text-muted-foreground"}`}>
                        {presetText ? `${presetText} → ${preset.dest}` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
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
