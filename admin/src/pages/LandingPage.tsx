import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLandingContent, useUpdateLandingContent, useRealtimeInvalidate } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { PanelTop, Save, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero Section",
  features: "Features",
  faq: "FAQ Section",
  pricing: "Pricing Section",
  testimonials: "Testimonials",
  footer: "Footer",
  trust_bar: "Trust Bar",
  stats: "Stats Section",
  story_sections: "Story Sections",
  capabilities: "Capabilities",
  security: "Security Section",
  final_cta: "Final CTA",
};

function SectionEditor({ section, onSave }: { section: { id: string; section: string; title?: string | null; subtitle?: string | null; body?: string | null; cta_text?: string | null; cta_link?: string | null; secondary_cta_text?: string | null; secondary_cta_link?: string | null; badge?: string | null; image_url?: string | null; active: boolean }; onSave: (id: string, data: Record<string, unknown>) => Promise<void> }) {
  const [title, setTitle] = useState(section.title ?? "");
  const [subtitle, setSubtitle] = useState(section.subtitle ?? "");
  const [body, setBody] = useState(section.body ?? "");
  const [cta, setCta] = useState(section.cta_text ?? "");
  const [ctaLink, setCtaLink] = useState(section.cta_link ?? "");
  const [secCta, setSecCta] = useState(section.secondary_cta_text ?? "");
  const [secCtaLink, setSecCtaLink] = useState(section.secondary_cta_link ?? "");
  const [badge, setBadge] = useState(section.badge ?? "");
  const [active, setActive] = useState(section.active);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(section.id, { title: title || null, subtitle: subtitle || null, body: body || null, cta_text: cta || null, cta_link: ctaLink || null, secondary_cta_text: secCta || null, secondary_cta_link: secCtaLink || null, badge: badge || null, active });
      toast.success(`${SECTION_LABELS[section.section]} saved`);
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  };

  return (
    <Card className={active ? "" : "opacity-60"}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={active ? "success" : "secondary"} className="text-[9px]">{active ? "Active" : "Hidden"}</Badge>
          </div>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
        <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        {section.section === "hero" && (
          <div className="space-y-2"><Label>Subtitle</Label><Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></div>
        )}
        {["features", "faq", "testimonials"].includes(section.section) && (
          <div className="space-y-2"><Label>Body</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} /></div>
        )}
        {(section.section === "hero" || section.section === "final_cta") && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2"><Label>CTA Text</Label><Input value={cta} onChange={(e) => setCta(e.target.value)} /></div>
              <div className="space-y-2"><Label>CTA Link</Label><Input value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2"><Label>Secondary CTA</Label><Input value={secCta} onChange={(e) => setSecCta(e.target.value)} /></div>
              <div className="space-y-2"><Label>Secondary Link</Label><Input value={secCtaLink} onChange={(e) => setSecCtaLink(e.target.value)} /></div>
            </div>
          </>
        )}
        <div className="space-y-2"><Label>Badge</Label><Input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="e.g. ✨ New" /></div>
        <Button size="sm" onClick={handleSave} disabled={saving} className="w-full">
          <Save className="mr-1 h-3.5 w-3.5" /> {saving ? "Saving..." : "Save Section"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function LandingPage() {
  const { user } = useAuth();
  const { data: sections, isLoading } = useLandingContent();
  const updateSection = useUpdateLandingContent();
  useRealtimeInvalidate(["admin", "landing-content"], "landing_content");

  const handleSave = async (id: string, data: Record<string, unknown>) => {
    await updateSection.mutateAsync({ id, ...data, admin_name: user?.name ?? "Unknown" });
  };

  if (isLoading) return <div className="p-6"><PageHeader title="Landing Page" description="Edit landing page content" /><LoadingState count={6} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Landing Page" description="Edit every section of the landing page" />
      {sections && sections.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((sec) => (
            <SectionEditor key={sec.id} section={sec} onSave={handleSave} />
          ))}
        </div>
      ) : (
        <EmptyState title="No content sections" description="Landing content sections will appear once configured." />
      )}
    </div>
  );
}
