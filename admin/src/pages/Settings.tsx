import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAllPlatformSettings, useUpdatePlatformSetting, useRealtimeInvalidate } from "@/lib/queries";
import { supabase, getAdminToken } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import { Save, AlertTriangle, Loader2, CheckCircle2, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";
import { useIslandNotification } from "@/components/ui/DynamicIslandNotification";

export function Settings() {
  const { confirm } = useConfirmDialog();
  const island = useIslandNotification();
  const { data: settings, isLoading } = useAllPlatformSettings();
  const updateSetting = useUpdatePlatformSetting();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  useRealtimeInvalidate(["admin", "settings"], "platform_settings");

  useEffect(() => {
    if (settings && Object.keys(values).length === 0) {
      setValues({ ...settings });
    }
  }, [settings]);

  const handleSave = async (key: string) => {
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      await updateSetting.mutateAsync({ key, value: values[key] });
      toast.success(`${key} saved successfully`);
    } catch {
      toast.error(`Failed to save ${key}`);
    }
    setSaving((prev) => ({ ...prev, [key]: false }));
  };

  const handleSaveMultiple = async (keys: string[], label: string) => {
    keys.forEach((k) => setSaving((prev) => ({ ...prev, [k]: true })));
    try {
      await Promise.all(keys.map((key) => updateSetting.mutateAsync({ key, value: values[key] })));
      toast.success(`${label} saved successfully`);
    } catch {
      toast.error(`Failed to save ${label}`);
    }
    keys.forEach((k) => setSaving((prev) => ({ ...prev, [k]: false })));
  };

  const getStr = (key: string, fallback = ""): string => String(values[key] ?? fallback);
  const getBool = (key: string, fallback = false): boolean => {
    const v = values[key];
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return v === "true";
    return fallback;
  };

  if (isLoading) return <div className="p-6"><PageHeader title="Settings" description="Platform configuration and preferences" /><LoadingState count={4} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Settings" description="Platform configuration and preferences" />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="brand">Brand</TabsTrigger>
          <TabsTrigger value="auth">Authentication</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>General Settings</CardTitle><CardDescription>Basic platform configuration</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Platform Name</Label>
                  <Input value={getStr("platform_name")} onChange={(e) => setValues((v) => ({ ...v, platform_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Support Email</Label>
                  <Input value={getStr("support_email")} onChange={(e) => setValues((v) => ({ ...v, support_email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Default Language</Label>
                  <Select value={getStr("default_language")} onValueChange={(val) => setValues((v) => ({ ...v, default_language: val }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={getStr("timezone")} onValueChange={(val) => setValues((v) => ({ ...v, timezone: val }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="EST">EST</SelectItem>
                      <SelectItem value="PST">PST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => handleSaveMultiple(["platform_name", "support_email", "default_language", "timezone"], "General settings")} disabled={saving["platform_name"]}>
                {saving["platform_name"] ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brand" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Brand Settings</CardTitle><CardDescription>Customize your platform branding</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input value={getStr("logo_url")} onChange={(e) => setValues((v) => ({ ...v, logo_url: e.target.value }))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input value={getStr("primary_color")} onChange={(e) => setValues((v) => ({ ...v, primary_color: e.target.value }))} className="w-24 font-mono" />
                    <div className="h-9 w-9 rounded-lg border" style={{ backgroundColor: getStr("primary_color") }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex gap-2">
                    <Input value={getStr("accent_color")} onChange={(e) => setValues((v) => ({ ...v, accent_color: e.target.value }))} className="w-24 font-mono" />
                    <div className="h-9 w-9 rounded-lg border" style={{ backgroundColor: getStr("accent_color") }} />
                  </div>
                </div>
              </div>
              <Button onClick={() => handleSaveMultiple(["logo_url", "primary_color", "accent_color"], "Brand settings")} disabled={saving["logo_url"]}>
                {saving["logo_url"] ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auth" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Authentication</CardTitle><CardDescription>Configure authentication providers</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "auth_email_password", label: "Email/Password", desc: "Allow email and password sign-in" },
                { key: "auth_google_oauth", label: "Google OAuth", desc: "Allow sign-in with Google" },
                { key: "auth_github_oauth", label: "GitHub OAuth", desc: "Allow sign-in with GitHub" },
                { key: "auth_magic_link", label: "Magic Link", desc: "Passwordless email sign-in" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <div><p className="font-medium">{label}</p><p className="text-sm text-muted-foreground">{desc}</p></div>
                  <Switch checked={getBool(key)} onCheckedChange={(val) => setValues((v) => ({ ...v, [key]: val }))} />
                </div>
              ))}
              <Button onClick={() => handleSaveMultiple(["auth_email_password", "auth_google_oauth", "auth_github_oauth", "auth_magic_link"], "Auth settings")} disabled={saving["auth_email_password"]}>
                {saving["auth_email_password"] ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Billing Settings</CardTitle><CardDescription>Configure Stripe integration and pricing</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Stripe Secret Key</Label>
                <Input type="password" value={getStr("stripe_secret_key")} onChange={(e) => setValues((v) => ({ ...v, stripe_secret_key: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Stripe Webhook Secret</Label>
                <Input type="password" value={getStr("stripe_webhook_secret")} onChange={(e) => setValues((v) => ({ ...v, stripe_webhook_secret: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between">
                <div><p className="font-medium">Test Mode</p><p className="text-sm text-muted-foreground">Use Stripe test environment</p></div>
                <Switch checked={getBool("stripe_test_mode")} onCheckedChange={(val) => setValues((v) => ({ ...v, stripe_test_mode: val }))} />
              </div>
              <Button onClick={() => handleSaveMultiple(["stripe_secret_key", "stripe_webhook_secret", "stripe_test_mode"], "Billing settings")} disabled={saving["stripe_secret_key"]}>
                {saving["stripe_secret_key"] ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Security Settings</CardTitle><CardDescription>Platform security configuration</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><p className="font-medium">Two-Factor Authentication</p><p className="text-sm text-muted-foreground">Require 2FA for all admins</p></div>
                <Switch checked={getBool("two_factor_auth")} onCheckedChange={(val) => setValues((v) => ({ ...v, two_factor_auth: val }))} />
              </div>
              <div className="flex items-center justify-between">
                <div><p className="font-medium">Session Timeout</p><p className="text-sm text-muted-foreground">Auto-logout after inactivity</p></div>
                <Select value={getStr("session_timeout")} onValueChange={(val) => setValues((v) => ({ ...v, session_timeout: val }))}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 hour</SelectItem>
                    <SelectItem value="6h">6 hours</SelectItem>
                    <SelectItem value="24h">24 hours</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Allowed IPs (optional)</Label>
                <Input
                  placeholder="192.168.1.0/24, 10.0.0.0/8"
                  value={getStr("allowed_ips")}
                  onChange={(e) => setValues((v) => ({ ...v, allowed_ips: e.target.value }))}
                />
              </div>
              <Button onClick={() => handleSave("two_factor_auth")} disabled={saving["two_factor_auth"]}>
                {saving["two_factor_auth"] ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                2FA
              </Button>
              <Button onClick={() => handleSave("allowed_ips")} disabled={saving["allowed_ips"]}>
                {saving["allowed_ips"] ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                Save IPs
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Email Settings</CardTitle><CardDescription>Configure Resend integration for transactional and campaign emails</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Resend API Key</Label>
                <Input type="password" value={getStr("resend_api_key")} onChange={(e) => setValues((v) => ({ ...v, resend_api_key: e.target.value }))} placeholder="re_..." />
              </div>
              <div className="space-y-2">
                <Label>From Email</Label>
                <Input value={getStr("from_email")} onChange={(e) => setValues((v) => ({ ...v, from_email: e.target.value }))} placeholder="noreply@yourdomain.com" />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleSaveMultiple(["resend_api_key", "from_email"], "Email settings")} disabled={saving["resend_api_key"]}>
                  {saving["resend_api_key"] ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                  Save Email Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Test Email</CardTitle><CardDescription>Send a test email to verify your configuration</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Recipient Email</Label>
                <Input value={getStr("test_recipient")} onChange={(e) => setValues((v) => ({ ...v, test_recipient: e.target.value }))} placeholder="you@example.com" />
              </div>
              <Button variant="outline" onClick={async () => {
                const to = getStr("test_recipient");
                if (!to) { toast.error("Enter a recipient email"); return; }
                try {
                  const res = await sendEmail({ to, subject: "Test from Noska Admin", html: "<h2>Test Email</h2><p>If you see this, email is working!</p>" });
                  if (res.error) { toast.error("Test failed: " + res.error); return; }
                  toast.success("Test email sent! Check " + to);
                } catch { toast.error("Test failed"); }
              }} disabled={!getStr("test_recipient")}>
                <Mail className="mr-1 h-4 w-4" /> Send Test Email
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger">
          <Card className="border-destructive/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Danger Zone</CardTitle>
              </div>
              <CardDescription>Irreversible and destructive actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-destructive/20 p-4">
                <div>
                  <p className="font-medium">Enable Maintenance Mode</p>
                  <p className="text-sm text-muted-foreground">Put the platform in read-only mode for all users</p>
                </div>
                <Button variant="destructive" onClick={async () => {
                  await updateSetting.mutateAsync({ key: "maintenance_mode", value: true });
                  island.warning("Maintenance Started", "The platform is now in read-only maintenance mode.");
                }}>
                  {getBool("maintenance_mode") ? "Enabled" : "Enable"}
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-destructive/20 p-4">
                <div>
                  <p className="font-medium">Disable Registration</p>
                  <p className="text-sm text-muted-foreground">Prevent new users from signing up</p>
                </div>
                <Button variant="destructive" onClick={async () => {
                  await updateSetting.mutateAsync({ key: "registration_enabled", value: false });
                  island.warning("Registration Disabled", "New user registrations are now disabled.");
                }}>
                  {getBool("registration_enabled") ? "Disable" : "Disabled"}
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-destructive/20 p-4">
                <div>
                  <p className="font-medium">Export All Data</p>
                  <p className="text-sm text-muted-foreground">Download all platform data as JSON</p>
                </div>
                <Button variant="outline" onClick={async () => {
                  try {
                    const token = getAdminToken();
                    if (!token || !supabase) { toast.error("No admin session"); return; }
                    const tables = ["user_profiles", "subscriptions", "payments", "audit_events", "ai_chats", "pages", "feedback", "support_tickets"];
                    const all: Record<string, unknown[]> = {};
                    for (const t of tables) {
                      const { data, error } = await supabase.rpc("admin_select", {
                        p_session_token: token, p_table: t, p_select: "*",
                      });
                      if (error) throw error;
                      if (data) all[t] = data;
                    }
                    const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = "platform-export.json"; a.click();
                    URL.revokeObjectURL(url);
                    toast.success("Export downloaded");
                  } catch { toast.error("Export failed"); }
                }}><CheckCircle2 className="mr-1 h-4 w-4" /> Export</Button>
               </div>
             </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
