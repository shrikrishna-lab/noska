import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEmailBranding, useUpdateEmailBranding } from "@/lib/queries";
import { useRealtimeInvalidate } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { LoadingState } from "@/components/ui/LoadingState";
import { Palette, Save } from "lucide-react";
import toast from "react-hot-toast";

export function BrandSettings() {
  const { user } = useAuth();
  const { data: branding, isLoading } = useEmailBranding();
  const update = useUpdateEmailBranding();
  const [form, setForm] = useState<Record<string, string>>({});
  useRealtimeInvalidate(["admin", "email-branding"], "email_branding");

  useEffect(() => {
    if (branding) {
      const entries: Record<string, string> = {};
      for (const [k, v] of Object.entries(branding)) {
        if (typeof v === "string") entries[k] = v;
      }
      setForm(entries);
    }
  }, [branding]);

  const handleSave = async () => {
    if (!branding || !user) return;
    await update.mutateAsync({ id: branding.id, ...form });
    toast.success("Brand settings saved");
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Brand Settings" description="Centralize your email branding">
        <Button onClick={handleSave} disabled={update.isPending}>
          <Save className="mr-1 h-4 w-4" /> {update.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Company Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={form.company_name || ""} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Support Email</Label>
              <Input value={form.support_email || ""} onChange={(e) => setForm({ ...form, support_email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input value={form.website_url || ""} onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Footer Text</Label>
              <Input value={form.footer_text || ""} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Brand Colors</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex gap-2">
                <Input type="color" value={form.primary_color || "#6366f1"} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-12 h-9 p-1" />
                <Input value={form.primary_color || ""} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Secondary Color</Label>
              <div className="flex gap-2">
                <Input type="color" value={form.secondary_color || "#8b5cf6"} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} className="w-12 h-9 p-1" />
                <Input value={form.secondary_color || ""} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accent Color</Label>
              <div className="flex gap-2">
                <Input type="color" value={form.accent_color || "#06b6d4"} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} className="w-12 h-9 p-1" />
                <Input value={form.accent_color || ""} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Logos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input value={form.logo_url || ""} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Favicon URL</Label>
              <Input value={form.favicon_url || ""} onChange={(e) => setForm({ ...form, favicon_url: e.target.value })} placeholder="https://..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Social Links</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "github_url", label: "GitHub" },
              { key: "discord_url", label: "Discord" },
              { key: "linkedin_url", label: "LinkedIn" },
              { key: "twitter_url", label: "X (Twitter)" },
              { key: "youtube_url", label: "YouTube" },
            ].map((s) => (
              <div key={s.key} className="space-y-1">
                <Label className="text-xs">{s.label}</Label>
                <Input value={form[s.key] || ""} onChange={(e) => setForm({ ...form, [s.key]: e.target.value })} placeholder={`https://${s.label.toLowerCase().replace(/\s+/g, "")}.com/...`} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {branding && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Preview</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg border p-6 max-w-lg mx-auto" style={{ backgroundColor: "#fff", color: "#333" }}>
              <div style={{ textAlign: "center" as const, padding: "20px 0" }}>
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" style={{ maxHeight: 40, margin: "0 auto" }} />
                ) : (
                  <div style={{ fontSize: 24, fontWeight: 700, color: form.primary_color }}>{form.company_name || "Noska"}</div>
                )}
              </div>
              <div style={{ padding: "20px 0" }}>
                <h1 style={{ fontSize: 20, fontWeight: 600, color: form.primary_color }}>Welcome to {form.company_name || "Noska"}</h1>
                <p style={{ fontSize: 14, color: "#666", marginTop: 8 }}>This is a preview of how your branded emails will look.</p>
                <div style={{ marginTop: 16, textAlign: "center" as const }}>
                  <a href="#" style={{
                    display: "inline-block",
                    padding: "10px 24px",
                    borderRadius: 6,
                    backgroundColor: form.primary_color || "#6366f1",
                    color: "#fff",
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: 500,
                  }}>Get Started</a>
                </div>
              </div>
              <div style={{ borderTop: "1px solid #eee", padding: "16px 0", textAlign: "center" as const, fontSize: 12, color: "#999" }}>
                {form.footer_text || "© 2026 Noska. All rights reserved."}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
