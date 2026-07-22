import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSocialLinks, useUpdateSocialLink, useRealtimeInvalidate } from "@/lib/queries";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Save, ExternalLink, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import type { SocialLink } from "@/lib/types";

const PLATFORM_ICONS: Record<string, string> = {
  x: "𝕏", linkedin: "in", github: "GH", discord: "DC", youtube: "YT", email: "✉", website: "🌐",
};

function SocialLinkEditor({ link, onSave, onToggle }: { link: SocialLink; onSave: (id: string, data: Record<string, unknown>) => Promise<void>; onToggle: (id: string, active: boolean) => void }) {
  const [url, setUrl] = useState(link.url);
  const [label, setLabel] = useState(link.label ?? "");
  const [saving, setSaving] = useState(false);

  const dirty = url !== link.url || (label || null) !== (link.label ?? null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(link.id, { url, label: label || null });
      toast.success(`${link.platform} updated`);
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  };

  return (
    <Card className={link.active ? "" : "opacity-60"}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{PLATFORM_ICONS[link.platform] ?? link.platform.slice(0, 2).toUpperCase()}</span>
            <div>
              <p className="text-sm font-medium capitalize">{link.platform}</p>
              {link.label && <p className="text-xs text-muted-foreground">{link.label}</p>}
            </div>
            <Badge variant={link.active ? "success" : "secondary"} className="text-[9px]">{link.active ? "Active" : "Hidden"}</Badge>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px]">URL</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-[10px]">Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-8 text-sm" placeholder="@noska" />
          </div>
          <Switch checked={link.active} onCheckedChange={(checked) => onToggle(link.id, checked)} className="mt-4" />
        </div>
        <Button size="sm" onClick={handleSave} disabled={!dirty || saving} className="w-full h-7 text-xs">
          {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
          {saving ? "Saving..." : dirty ? "Save Changes" : "Saved"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function SocialLinksPage() {
  const { data: links, isLoading } = useSocialLinks();
  const updateLink = useUpdateSocialLink();
  useRealtimeInvalidate(["admin", "social-links"], "social_links");

  const handleSave = async (id: string, data: Record<string, unknown>) => {
    await updateLink.mutateAsync({ id, ...data });
  };

  const handleToggle = (id: string, active: boolean) => {
    updateLink.mutate({ id, active });
  };

  if (isLoading) return <div className="p-6"><PageHeader title="Social Links" description="Manage social media links" /><LoadingState count={6} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Social Links" description="Edit social media and community links" />
      {links && links.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <SocialLinkEditor key={link.id} link={link} onSave={handleSave} onToggle={handleToggle} />
          ))}
        </div>
      ) : (
        <EmptyState title="No social links" description="Social links will appear here once configured." />
      )}
    </div>
  );
}
