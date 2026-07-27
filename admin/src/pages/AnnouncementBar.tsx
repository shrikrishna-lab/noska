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
import { Megaphone, Save, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";

export function AnnouncementBarPage() {
  const { user } = useAuth();
  const { data: bar, isLoading } = useAnnouncementBar();
  const updateBar = useUpdateAnnouncementBar();
  useRealtimeInvalidate(["admin", "announcement-bar"], "announcement_bar");

  const [enabled, setEnabled] = useState(false);
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const [textColor, setTextColor] = useState("#ffffff");
  const [dismissible, setDismissible] = useState(true);
  const [sticky, setSticky] = useState(false);
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [countdownTarget, setCountdownTarget] = useState("");
  const [animation, setAnimation] = useState("slide");
  const [position, setPosition] = useState("top");
  const [bgStyle, setBgStyle] = useState("solid");
  const [gradientStart, setGradientStart] = useState("#1a1a2e");
  const [gradientEnd, setGradientEnd] = useState("#16213e");
  const [fontSize, setFontSize] = useState("md");
  const [borderStyle, setBorderStyle] = useState("bottom");
  const [pageTarget, setPageTarget] = useState("all");
  const [autoDismiss, setAutoDismiss] = useState(false);
  const [autoDismissSeconds, setAutoDismissSeconds] = useState(10);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [secondaryLinkUrl, setSecondaryLinkUrl] = useState("");
  const [secondaryLinkText, setSecondaryLinkText] = useState("");
  const [showCloseButton, setShowCloseButton] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (bar) {
      setEnabled(bar.enabled);
      setText(bar.text ?? "");
      setEmoji(bar.emoji ?? "");
      setLinkUrl(bar.link_url ?? "");
      setLinkText(bar.link_text ?? "");
      setBgColor(bar.background_color ?? "#1a1a2e");
      setTextColor(bar.text_color ?? "#ffffff");
      setDismissible(bar.dismissible);
      setSticky(bar.sticky);
      setCountdownEnabled(bar.countdown_enabled);
      setCountdownTarget(bar.countdown_target?.slice(0, 16) ?? "");
      setAnimation(bar.animation ?? "slide");
      setPosition(bar.position ?? "top");
      setBgStyle(bar.bg_style ?? "solid");
      setGradientStart(bar.gradient_start ?? "#1a1a2e");
      setGradientEnd(bar.gradient_end ?? "#16213e");
      setFontSize(bar.font_size ?? "md");
      setBorderStyle(bar.border_style ?? "bottom");
      setPageTarget(bar.page_target ?? "all");
      setAutoDismiss(bar.auto_dismiss_seconds != null);
      setAutoDismissSeconds(bar.auto_dismiss_seconds ?? 10);
      setStartAt(bar.start_at?.slice(0, 16) ?? "");
      setEndAt(bar.end_at?.slice(0, 16) ?? "");
      setSecondaryLinkUrl(bar.secondary_link_url ?? "");
      setSecondaryLinkText(bar.secondary_link_text ?? "");
      setShowCloseButton(bar.show_close_button);
    }
  }, [bar]);

  const handleSave = async () => {
    try {
      await updateBar.mutateAsync({
        enabled, text, emoji, link_url: linkUrl || null, link_text: linkText || null,
        background_color: bgColor, text_color: textColor, dismissible, sticky,
        countdown_enabled: countdownEnabled, countdown_target: countdownTarget ? new Date(countdownTarget).toISOString() : null,
        animation,
        position,
        bg_style: bgStyle,
        gradient_start: bgStyle === "gradient" ? gradientStart : null,
        gradient_end: bgStyle === "gradient" ? gradientEnd : null,
        font_size: fontSize,
        border_style: borderStyle,
        page_target: pageTarget,
        auto_dismiss_seconds: autoDismiss ? autoDismissSeconds : null,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        end_at: endAt ? new Date(endAt).toISOString() : null,
        secondary_link_url: secondaryLinkUrl || null,
        secondary_link_text: secondaryLinkText || null,
        show_close_button: showCloseButton,
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
        <div
          className="rounded-lg border p-3 text-center text-sm"
          style={{
            background: bgStyle === "gradient"
              ? `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`
              : bgColor,
            color: textColor,
          }}
        >
          {emoji} {text}
          {linkUrl && <span className="ml-2 underline">{linkText || "Learn more"}</span>}
        </div>
      )}

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Enable Announcement Bar</p><p className="text-sm text-muted-foreground">Show bar on the site</p></div>
            <Switch checked={enabled} onCheckedChange={(v) => { setEnabled(v); setDirty(true); }} />
          </div>

          <div className="space-y-2">
            <Label>Emoji</Label>
            <Input value={emoji} onChange={(e) => { setEmoji(e.target.value); setDirty(true); }} placeholder="" />
          </div>
          <div className="space-y-2">
            <Label>Text</Label>
            <Input value={text} onChange={(e) => { setText(e.target.value); setDirty(true); }} placeholder="Early Beta is Live" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Primary Link URL (optional)</Label>
              <Input value={linkUrl} onChange={(e) => { setLinkUrl(e.target.value); setDirty(true); }} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Primary Link Text</Label>
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Behavior</p><p className="text-sm text-muted-foreground">Dismiss, sticky, close button</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={dismissible} onCheckedChange={(v) => { setDismissible(v); setDirty(true); }} />
              <span className="text-sm">Dismissible</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showCloseButton} onCheckedChange={(v) => { setShowCloseButton(v); setDirty(true); }} />
              <span className="text-sm">Show close button</span>
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

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Styling</p><p className="text-sm text-muted-foreground">Animation, position, background, font, border</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Animation</Label>
              <Select value={animation} onValueChange={(v) => { setAnimation(v); setDirty(true); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="slide">Slide</SelectItem>
                  <SelectItem value="fade">Fade</SelectItem>
                  <SelectItem value="bounce">Bounce</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Select value={position} onValueChange={(v) => { setPosition(v); setDirty(true); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top (above navbar)</SelectItem>
                  <SelectItem value="bottom">Bottom (above footer)</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Background Style</Label>
              <Select value={bgStyle} onValueChange={(v) => { setBgStyle(v); setDirty(true); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid Color</SelectItem>
                  <SelectItem value="gradient">Gradient</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Font Size</Label>
              <Select value={fontSize} onValueChange={(v) => { setFontSize(v); setDirty(true); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Border Style</Label>
              <Select value={borderStyle} onValueChange={(v) => { setBorderStyle(v); setDirty(true); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="bottom">Bottom Line</SelectItem>
                  <SelectItem value="rounded">Rounded Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {bgStyle === "gradient" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Gradient Start</Label>
                <div className="flex gap-2">
                  <Input type="color" value={gradientStart} onChange={(e) => { setGradientStart(e.target.value); setDirty(true); }} className="w-12 p-1 h-9" />
                  <Input value={gradientStart} onChange={(e) => { setGradientStart(e.target.value); setDirty(true); }} className="h-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Gradient End</Label>
                <div className="flex gap-2">
                  <Input type="color" value={gradientEnd} onChange={(e) => { setGradientEnd(e.target.value); setDirty(true); }} className="w-12 p-1 h-9" />
                  <Input value={gradientEnd} onChange={(e) => { setGradientEnd(e.target.value); setDirty(true); }} className="h-9" />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Page Visibility</p><p className="text-sm text-muted-foreground">Which pages show this bar</p></div>
          </div>
          <div className="space-y-2">
            <Select value={pageTarget} onValueChange={(v) => { setPageTarget(v); setDirty(true); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pages</SelectItem>
                <SelectItem value="home">Home Only</SelectItem>
                <SelectItem value="pricing">Pricing Only</SelectItem>
                <SelectItem value="product">Product Only</SelectItem>
                <SelectItem value="enterprise">Enterprise Only</SelectItem>
                <SelectItem value="blog">Blog Only</SelectItem>
                <SelectItem value="docs">Docs Only</SelectItem>
                <SelectItem value="home,pricing">Home + Pricing</SelectItem>
                <SelectItem value="home,product">Home + Product</SelectItem>
                <SelectItem value="home,enterprise">Home + Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Schedule</p><p className="text-sm text-muted-foreground">Auto-show and auto-hide at specific times</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start At (optional)</Label>
              <Input type="datetime-local" value={startAt} onChange={(e) => { setStartAt(e.target.value); setDirty(true); }} />
            </div>
            <div className="space-y-2">
              <Label>End At (optional)</Label>
              <Input type="datetime-local" value={endAt} onChange={(e) => { setEndAt(e.target.value); setDirty(true); }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Advanced</p></div>
            <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          {showAdvanced && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div><p className="font-medium">Auto-Dismiss</p><p className="text-sm text-muted-foreground">Auto-hide after N seconds</p></div>
                <Switch checked={autoDismiss} onCheckedChange={(v) => { setAutoDismiss(v); setDirty(true); }} />
              </div>
              {autoDismiss && (
                <div className="space-y-2">
                  <Label>Seconds</Label>
                  <Input type="number" min={1} max={300} value={autoDismissSeconds} onChange={(e) => { setAutoDismissSeconds(Number(e.target.value)); setDirty(true); }} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Secondary Link URL (optional)</Label>
                  <Input value={secondaryLinkUrl} onChange={(e) => { setSecondaryLinkUrl(e.target.value); setDirty(true); }} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Secondary Link Text</Label>
                  <Input value={secondaryLinkText} onChange={(e) => { setSecondaryLinkText(e.target.value); setDirty(true); }} placeholder="Get started" />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
