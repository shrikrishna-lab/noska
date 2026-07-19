import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAnnouncementBar, useUpdateAnnouncementBar, useRealtimeInvalidate } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { LoadingState } from "@/components/ui/LoadingState";
import { Megaphone, Save, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";

export function AnnouncementBarPage() {
  const { user } = useAuth();
  const { data: bar, isLoading } = useAnnouncementBar();
  const updateBar = useUpdateAnnouncementBar();
  useRealtimeInvalidate(["admin", "announcement-bar"], "announcement_bar");

  const [enabled, setEnabled] = useState(false);
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState("🚀");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const [textColor, setTextColor] = useState("#ffffff");
  const [dismissible, setDismissible] = useState(true);
  const [sticky, setSticky] = useState(false);
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [countdownTarget, setCountdownTarget] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (bar) {
      setEnabled(bar.enabled);
      setText(bar.text ?? "");
      setEmoji(bar.emoji ?? "🚀");
      setLinkUrl(bar.link_url ?? "");
      setLinkText(bar.link_text ?? "");
      setBgColor(bar.background_color ?? "#1a1a2e");
      setTextColor(bar.text_color ?? "#ffffff");
      setDismissible(bar.dismissible);
      setSticky(bar.sticky);
      setCountdownEnabled(bar.countdown_enabled);
      setCountdownTarget(bar.countdown_target?.slice(0, 16) ?? "");
    }
  }, [bar]);

  const handleSave = async () => {
    try {
      await updateBar.mutateAsync({
        enabled, text, emoji, link_url: linkUrl || null, link_text: linkText || null,
        background_color: bgColor, text_color: textColor, dismissible, sticky,
        countdown_enabled: countdownEnabled, countdown_target: countdownTarget ? new Date(countdownTarget).toISOString() : null,
        admin_name: user?.name ?? "Unknown",
      });
      setDirty(false);
      toast.success("Announcement bar saved");
    } catch { toast.error("Failed to save"); }
  };

  if (isLoading) return <div className="p-6"><PageHeader title="Announcement Bar" description="Manage announcement bar" /><LoadingState count={1} /></div>;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Announcement Bar"
        description={enabled ? "Currently visible on the site" : "Hidden from visitors"}
        actions={
          <div className="flex items-center gap-2">
            {dirty && <Button variant="outline" size="sm" onClick={() => setDirty(false)}><RotateCcw className="mr-1 h-3.5 w-3.5" /> Discard</Button>}
            <Button size="sm" onClick={handleSave} disabled={updateBar.isPending}>
              <Save className="mr-1 h-3.5 w-3.5" /> Save
            </Button>
          </div>
        }
      />

      {enabled && (
        <div className="rounded-lg border p-3 text-center text-sm" style={{ backgroundColor: bgColor, color: textColor }}>
          {emoji} {text}
          {linkUrl && <span className="ml-2 underline">{linkText || "Learn more"}</span>}
        </div>
      )}

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Enable Announcement Bar</p><p className="text-sm text-muted-foreground">Show bar at the top of the site</p></div>
            <Switch checked={enabled} onCheckedChange={(v) => { setEnabled(v); setDirty(true); }} />
          </div>

          <div className="space-y-2">
            <Label>Emoji</Label>
            <Input value={emoji} onChange={(e) => { setEmoji(e.target.value); setDirty(true); }} placeholder="🚀" />
          </div>
          <div className="space-y-2">
            <Label>Text</Label>
            <Input value={text} onChange={(e) => { setText(e.target.value); setDirty(true); }} placeholder="Early Beta is Live" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Link URL (optional)</Label>
              <Input value={linkUrl} onChange={(e) => { setLinkUrl(e.target.value); setDirty(true); }} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Link Text</Label>
              <Input value={linkText} onChange={(e) => { setLinkText(e.target.value); setDirty(true); }} placeholder="Learn more" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Background Color</Label>
              <div className="flex gap-2">
                <Input type="color" value={bgColor} onChange={(e) => { setBgColor(e.target.value); setDirty(true); }} className="w-12 p-1 h-9" />
                <Input value={bgColor} onChange={(e) => { setBgColor(e.target.value); setDirty(true); }} className="h-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Text Color</Label>
              <div className="flex gap-2">
                <Input type="color" value={textColor} onChange={(e) => { setTextColor(e.target.value); setDirty(true); }} className="w-12 p-1 h-9" />
                <Input value={textColor} onChange={(e) => { setTextColor(e.target.value); setDirty(true); }} className="h-9" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={dismissible} onCheckedChange={(v) => { setDismissible(v); setDirty(true); }} />
              <span className="text-sm">Dismissible</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={sticky} onCheckedChange={(v) => { setSticky(v); setDirty(true); }} />
              <span className="text-sm">Sticky</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Countdown Timer</p><p className="text-sm text-muted-foreground">Show countdown in the bar</p></div>
            <Switch checked={countdownEnabled} onCheckedChange={(v) => { setCountdownEnabled(v); setDirty(true); }} />
          </div>
          {countdownEnabled && (
            <div className="space-y-2">
              <Label>Target Date</Label>
              <Input type="datetime-local" value={countdownTarget} onChange={(e) => { setCountdownTarget(e.target.value); setDirty(true); }} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
