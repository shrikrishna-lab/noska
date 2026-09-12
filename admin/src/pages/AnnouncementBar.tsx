import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAnnouncementBar, useUpdateAnnouncementBar, useRealtimeInvalidate } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { LoadingState } from "@/components/ui/LoadingState";
import { Banner, type BannerTheme } from "@/components/ui/banner";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";
import {
  Save,
  RotateCcw,
  Sparkles,
  Link as LinkIcon,
  Gift,
  Zap,
  Flame,
  Rocket,
  Bell,
  Eye,
  Trash2,
  Send,
  PauseCircle,
  Calendar,
  Layers,
  Palette,
  Clock,
  Radio,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";

function getIconForEmoji(emoji?: string) {
  if (!emoji) return <Sparkles className="h-4 w-4 text-emerald-800" />;
  if (emoji.includes("🔗") || emoji.includes("link")) return <LinkIcon className="h-4 w-4 text-emerald-800" />;
  if (emoji.includes("🎁") || emoji.includes("gift")) return <Gift className="h-4 w-4 text-emerald-800" />;
  if (emoji.includes("🚀") || emoji.includes("rocket")) return <Rocket className="h-4 w-4 text-emerald-800" />;
  if (emoji.includes("⚡") || emoji.includes("zap")) return <Zap className="h-4 w-4 text-emerald-800" />;
  if (emoji.includes("🔥") || emoji.includes("fire")) return <Flame className="h-4 w-4 text-emerald-800" />;
  if (emoji.includes("🔔") || emoji.includes("bell")) return <Bell className="h-4 w-4 text-emerald-800" />;
  return <span className="text-sm leading-none">{emoji}</span>;
}

const TEMPLATES = [
  {
    name: "Claim .link Domain (Live Promo)",
    text: "Claim a free .link domain, free for 1 year.",
    emoji: "🔗",
    linkText: "Claim Domain",
    linkUrl: "https://noska.me/pricing",
    secondaryUrl: "https://noska.me/docs",
    theme: "emerald" as BannerTheme,
  },
  {
    name: "Claude 3.7 Hybrid Reasoning Engine",
    text: "Claude 3.7 Sonnet hybrid reasoning models are now active on Noska!",
    emoji: "🚀",
    linkText: "Explore Models",
    linkUrl: "/new-updated",
    secondaryUrl: "/docs",
    theme: "violet" as BannerTheme,
  },
  {
    name: "Early Beta Pro Access 50% Off",
    text: "Early Beta Launch: Get 50% off Pro for your entire team.",
    emoji: "🎁",
    linkText: "Claim 50% Off",
    linkUrl: "/pricing",
    secondaryUrl: "/enterprise",
    theme: "amber" as BannerTheme,
  },
  {
    name: "Realtime Voice Engine Update",
    text: "Sub-120ms neural acoustic streaming is now available across all platforms.",
    emoji: "⚡",
    linkText: "Read Changelog",
    linkUrl: "/new-updated",
    secondaryUrl: "/docs",
    theme: "dark" as BannerTheme,
  },
];

export function AnnouncementBarPage() {
  const { user } = useAuth();
  const { data: bar, isLoading } = useAnnouncementBar();
  const updateBar = useUpdateAnnouncementBar();
  const { confirm } = useConfirmDialog();
  useRealtimeInvalidate(["admin", "announcement-bar"], "announcement_bar");

  const [enabled, setEnabled] = useState(true);
  const [text, setText] = useState("Claim a free .link domain, free for 1 year.");
  const [emoji, setEmoji] = useState("🔗");
  const [linkUrl, setLinkUrl] = useState("https://noska.me/pricing");
  const [linkText, setLinkText] = useState("Claim Domain");
  const [secondaryLinkUrl, setSecondaryLinkUrl] = useState("https://noska.me/docs");
  const [theme, setTheme] = useState<BannerTheme>("emerald");
  const [dismissible, setDismissible] = useState(true);
  const [sticky, setSticky] = useState(false);
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [countdownTarget, setCountdownTarget] = useState("");
  const [position, setPosition] = useState("top");
  const [pageTarget, setPageTarget] = useState("all");
  const [autoDismiss, setAutoDismiss] = useState(false);
  const [autoDismissSeconds, setAutoDismissSeconds] = useState(10);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [showCloseButton, setShowCloseButton] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [previewDismissed, setPreviewDismissed] = useState(false);

  useEffect(() => {
    if (bar) {
      setEnabled(bar.enabled ?? true);
      setText(bar.text ?? "Claim a free .link domain, free for 1 year.");
      setEmoji(bar.emoji ?? "🔗");
      setLinkUrl(bar.link_url ?? "");
      setLinkText(bar.link_text ?? "Claim Domain");
      setSecondaryLinkUrl(bar.secondary_link_url ?? "");
      setDismissible(bar.dismissible ?? true);
      setSticky(bar.sticky ?? false);
      setCountdownEnabled(bar.countdown_enabled ?? false);
      setCountdownTarget(bar.countdown_target?.slice(0, 16) ?? "");
      setPosition(bar.position ?? "top");
      setPageTarget(bar.page_target ?? "all");
      setAutoDismiss(bar.auto_dismiss_seconds != null);
      setAutoDismissSeconds(bar.auto_dismiss_seconds ?? 10);
      setStartAt(bar.start_at?.slice(0, 16) ?? "");
      setEndAt(bar.end_at?.slice(0, 16) ?? "");
      setShowCloseButton(bar.show_close_button ?? true);

      // Map background color back into preset theme
      const bg = (bar.background_color || "").toLowerCase();
      if (bg.includes("1a1a") || bg.includes("0909") || bg.includes("000000")) setTheme("dark");
      else if (bg.includes("purple") || bg.includes("fuchsia") || bg.includes("8b5cf6")) setTheme("violet");
      else if (bg.includes("amber") || bg.includes("orange") || bg.includes("f59e0b")) setTheme("amber");
      else if (bg.includes("blue") || bg.includes("sky") || bg.includes("3b82f6")) setTheme("blue");
      else if (bg.includes("rose") || bg.includes("red") || bg.includes("f43f5e")) setTheme("rose");
      else setTheme("emerald");
    }
  }, [bar]);

  // Compute live schedule status
  const scheduleStatus = useMemo(() => {
    if (!enabled) return { label: "Paused / Inactive", variant: "secondary" as const, color: "text-muted-foreground" };
    const now = Date.now();
    if (startAt && new Date(startAt).getTime() > now) {
      return { label: `Scheduled (Starts ${new Date(startAt).toLocaleDateString()})`, variant: "warning" as const, color: "text-amber-500" };
    }
    if (endAt && new Date(endAt).getTime() < now) {
      return { label: "Expired", variant: "destructive" as const, color: "text-rose-500" };
    }
    return { label: "Live on Site Now", variant: "success" as const, color: "text-emerald-500" };
  }, [enabled, startAt, endAt]);

  const applyTemplate = (tmpl: (typeof TEMPLATES)[0]) => {
    setText(tmpl.text);
    setEmoji(tmpl.emoji);
    setLinkText(tmpl.linkText);
    setLinkUrl(tmpl.linkUrl);
    setSecondaryLinkUrl(tmpl.secondaryUrl);
    setTheme(tmpl.theme);
    setPreviewDismissed(false);
    setDirty(true);
    toast.success(`Loaded template: ${tmpl.name}`);
  };

  const getThemeHex = (t: BannerTheme) => {
    switch (t) {
      case "dark": return "#09090b";
      case "violet": return "#8b5cf6";
      case "amber": return "#f59e0b";
      case "blue": return "#3b82f6";
      case "rose": return "#f43f5e";
      default: return "#10b981";
    }
  };

  const handleSave = async (overrideEnabled?: boolean) => {
    const isLive = overrideEnabled !== undefined ? overrideEnabled : enabled;
    try {
      const bg = getThemeHex(theme);
      await updateBar.mutateAsync({
        enabled: isLive,
        text,
        emoji,
        link_url: linkUrl || null,
        link_text: linkText || null,
        background_color: bg,
        text_color: theme === "dark" ? "#ffffff" : "#111827",
        dismissible,
        sticky,
        countdown_enabled: countdownEnabled,
        countdown_target: countdownTarget ? new Date(countdownTarget).toISOString() : null,
        animation: "slide",
        position,
        bg_style: "gradient",
        gradient_start: bg,
        gradient_end: bg,
        font_size: "md",
        border_style: "rounded",
        page_target: pageTarget,
        auto_dismiss_seconds: autoDismiss ? autoDismissSeconds : null,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        end_at: endAt ? new Date(endAt).toISOString() : null,
        secondary_link_url: secondaryLinkUrl || null,
        secondary_link_text: "Learn more",
        show_close_button: showCloseButton,
        admin_name: user?.name ?? "Admin",
      });
      setDirty(false);
      if (overrideEnabled === true) {
        setEnabled(true);
        toast.success("🚀 Announcement banner published live to marketing site!");
      } else if (overrideEnabled === false) {
        setEnabled(false);
        toast.success("⏸ Announcement banner paused.");
      } else {
        toast.success("Changes saved successfully.");
      }
    } catch {
      toast.error("Failed to update announcement banner.");
    }
  };

  // Push live shortcut
  const handlePushLive = () => {
    handleSave(true);
  };

  // Pause / unpublish
  const handlePause = () => {
    handleSave(false);
  };

  // Delete / clear announcement
  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Clear Announcement Banner?",
      description: "This will remove the current announcement text, links, and disable the banner on the live marketing site.",
      confirmText: "Clear and Delete",
      variant: "delete",
    });

    if (!confirmed) return;

    try {
      setText("");
      setEmoji("✨");
      setLinkUrl("");
      setLinkText("");
      setSecondaryLinkUrl("");
      setEnabled(false);
      setStartAt("");
      setEndAt("");
      setCountdownEnabled(false);

      await updateBar.mutateAsync({
        enabled: false,
        text: "",
        emoji: "✨",
        link_url: null,
        link_text: null,
        secondary_link_url: null,
        start_at: null,
        end_at: null,
        countdown_enabled: false,
        countdown_target: null,
        admin_name: user?.name ?? "Admin",
      });
      setDirty(false);
      toast.success("Announcement banner cleared and removed.");
    } catch {
      toast.error("Failed to clear banner.");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <PageHeader title="Announcement Banner" description="Manage real-time marketing announcements" />
        <LoadingState count={1} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Top Header with Comprehensive Actions */}
      <PageHeader
        title="Announcement Banner"
        description="Real-time marketing bar synchronized with the production website"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {dirty && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDirty(false);
                  setPreviewDismissed(false);
                }}
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Discard
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Clear Banner
            </Button>

            {enabled ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePause}
                disabled={updateBar.isPending}
              >
                <PauseCircle className="mr-1 h-3.5 w-3.5" /> Pause Live
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handlePushLive}
                disabled={updateBar.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
              >
                <Send className="mr-1 h-3.5 w-3.5" /> Push Live Now
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => handleSave()}
              disabled={updateBar.isPending}
            >
              <Save className="mr-1 h-3.5 w-3.5" /> Save Changes
            </Button>
          </div>
        }
      />

      {/* Real-time Status Card & Live 1:1 Preview */}
      <Card className="overflow-hidden border-2 border-primary/25 bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between border-b bg-muted/40 px-5 py-3 gap-2">
          <div className="flex items-center gap-2.5">
            <Radio className={`h-4 w-4 animate-pulse ${enabled ? "text-emerald-500" : "text-muted-foreground"}`} />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Live Production Preview
            </span>
            <Badge variant={scheduleStatus.variant} className="text-[11px] font-medium">
              {scheduleStatus.label}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Target: <strong className="text-foreground">{pageTarget === "all" ? "All Pages" : pageTarget}</strong> ({position})
            </span>
            {previewDismissed && (
              <Button variant="ghost" size="sm" onClick={() => setPreviewDismissed(false)} className="h-7 text-xs px-2">
                Reset Preview
              </Button>
            )}
          </div>
        </div>

        <CardContent className="p-6">
          <Banner
            show={!previewDismissed}
            onHide={() => setPreviewDismissed(true)}
            showCloseButton={showCloseButton}
            icon={getIconForEmoji(emoji)}
            theme={theme}
            title={
              <span className="flex flex-wrap items-center gap-1.5">
                <span>{text || "Enter your announcement message..."}</span>
                {countdownEnabled && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-black/10 dark:bg-white/15">
                    ⏱ 3d 14h left
                  </span>
                )}
              </span>
            }
            action={
              linkText
                ? {
                    label: linkText,
                    onClick: () => toast.success(`Action Destination: ${linkUrl}`),
                  }
                : undefined
            }
            learnMoreUrl={secondaryLinkUrl || undefined}
          />
        </CardContent>
      </Card>

      {/* Main Configuration Tabs */}
      <Tabs defaultValue="content" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[480px]">
          <TabsTrigger value="content" className="flex items-center gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" /> Content
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5" /> Schedule
          </TabsTrigger>
          <TabsTrigger value="targeting" className="flex items-center gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" /> Delivery
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1.5 text-xs">
            <Palette className="h-3.5 w-3.5" /> Themes
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Content & Messaging */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <p className="font-semibold text-sm">Banner Visibility</p>
                  <p className="text-xs text-muted-foreground">Turn the announcement bar on or off on the live marketing site</p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) => {
                    setEnabled(v);
                    setDirty(true);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Icon Symbol / Emoji</Label>
                <div className="flex gap-2">
                  <Input
                    value={emoji}
                    onChange={(e) => {
                      setEmoji(e.target.value);
                      setDirty(true);
                    }}
                    className="w-20 text-center text-lg"
                    placeholder="🔗"
                  />
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {["🔗", "🚀", "🎁", "⚡", "🔥", "🔔", "✨", "🎉", "📢"].map((char) => (
                      <button
                        key={char}
                        type="button"
                        onClick={() => {
                          setEmoji(char);
                          setDirty(true);
                        }}
                        className="h-8 w-8 rounded-lg border bg-muted/40 hover:bg-muted text-sm transition-all hover:scale-105 cursor-pointer"
                      >
                        {char}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Headline Message</Label>
                <Input
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="e.g. Claim a free .link domain, free for 1 year."
                  className="font-medium"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Action Button Label</Label>
                  <Input
                    value={linkText}
                    onChange={(e) => {
                      setLinkText(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="e.g. Claim Domain"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Action Target URL</Label>
                  <Input
                    value={linkUrl}
                    onChange={(e) => {
                      setLinkUrl(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="e.g. https://noska.me/pricing or /pricing"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Secondary "Learn More" URL (Optional)</Label>
                <Input
                  value={secondaryLinkUrl}
                  onChange={(e) => {
                    setSecondaryLinkUrl(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="e.g. https://noska.me/docs"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Schedule & Countdown */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-5">
              <div>
                <h3 className="text-sm font-semibold">Campaign Scheduling</h3>
                <p className="text-xs text-muted-foreground">Auto-activate and auto-expire the announcement at exact dates and times</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Start DateTime (Auto-Publish)</Label>
                  <Input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => {
                      setStartAt(e.target.value);
                      setDirty(true);
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground">Leave empty to activate immediately upon saving</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">End DateTime (Auto-Expire)</Label>
                  <Input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => {
                      setEndAt(e.target.value);
                      setDirty(true);
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground">Leave empty to run continuously without expiration</p>
                </div>
              </div>

              <div className="border-t pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">Countdown Timer Badge</p>
                    <p className="text-xs text-muted-foreground">Show a ticking dynamic timer pill inside the banner</p>
                  </div>
                  <Switch
                    checked={countdownEnabled}
                    onCheckedChange={(v) => {
                      setCountdownEnabled(v);
                      setDirty(true);
                    }}
                  />
                </div>

                {countdownEnabled && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Countdown Target Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={countdownTarget}
                      onChange={(e) => {
                        setCountdownTarget(e.target.value);
                        setDirty(true);
                      }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Targeting & Delivery Rules */}
        <TabsContent value="targeting" className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-5">
              <div>
                <h3 className="text-sm font-semibold">Delivery & Page Targeting</h3>
                <p className="text-xs text-muted-foreground">Choose which routes and behaviors control banner visibility</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Page Visibility Scope</Label>
                  <Select
                    value={pageTarget}
                    onValueChange={(v) => {
                      setPageTarget(v);
                      setDirty(true);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Marketing Pages</SelectItem>
                      <SelectItem value="home">Home Page Only</SelectItem>
                      <SelectItem value="pricing">Pricing Page Only</SelectItem>
                      <SelectItem value="product">Product Page Only</SelectItem>
                      <SelectItem value="enterprise">Enterprise Page Only</SelectItem>
                      <SelectItem value="docs">Docs Only</SelectItem>
                      <SelectItem value="home,pricing">Home + Pricing Pages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Screen Position</Label>
                  <Select
                    value={position}
                    onValueChange={(v) => {
                      setPosition(v);
                      setDirty(true);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top (Above Header Navbar)</SelectItem>
                      <SelectItem value="bottom">Bottom (Above Footer)</SelectItem>
                      <SelectItem value="both">Both Top and Bottom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 border-t pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">Allow Visitor Dismissal</p>
                    <p className="text-[11px] text-muted-foreground">Visitors can close the banner during their session</p>
                  </div>
                  <Switch
                    checked={dismissible}
                    onCheckedChange={(v) => {
                      setDismissible(v);
                      setDirty(true);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">Show Close Button (X)</p>
                    <p className="text-[11px] text-muted-foreground">Displays close icon on the top right</p>
                  </div>
                  <Switch
                    checked={showCloseButton}
                    onCheckedChange={(v) => {
                      setShowCloseButton(v);
                      setDirty(true);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">Auto-Dismiss Timer</p>
                    <p className="text-[11px] text-muted-foreground">Automatically hide the banner after N seconds</p>
                  </div>
                  <Switch
                    checked={autoDismiss}
                    onCheckedChange={(v) => {
                      setAutoDismiss(v);
                      setDirty(true);
                    }}
                  />
                </div>

                {autoDismiss && (
                  <div className="space-y-2 pl-4">
                    <Label className="text-xs font-semibold">Auto-Dismiss Duration (Seconds)</Label>
                    <Input
                      type="number"
                      min={3}
                      max={120}
                      value={autoDismissSeconds}
                      onChange={(e) => {
                        setAutoDismissSeconds(Number(e.target.value));
                        setDirty(true);
                      }}
                      className="w-32"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Theme Palette & Real Templates */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold">Theme Palette</h3>
                <p className="text-xs text-muted-foreground">Select signature mesh grid gradient aesthetic</p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { id: "emerald", name: "Emerald & Lime Grid", color: "bg-emerald-500", desc: "Signature green gradient" },
                  { id: "violet", name: "Neon Violet Grid", color: "bg-purple-500", desc: "Purple & fuchsia gradient" },
                  { id: "amber", name: "Cyber Amber Grid", color: "bg-amber-500", desc: "Warm gold & orange" },
                  { id: "blue", name: "Electric Sky Grid", color: "bg-blue-500", desc: "Cyan & indigo palette" },
                  { id: "rose", name: "Velvet Rose Grid", color: "bg-rose-500", desc: "Ruby pink & red gradient" },
                  { id: "dark", name: "Obsidian Dark Grid", color: "bg-zinc-900", desc: "Ultra-dark glassmorphism" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTheme(item.id as BannerTheme);
                      setDirty(true);
                    }}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                      theme === item.id ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-3.5 w-3.5 rounded-full ${item.color}`} />
                      <span className="text-xs font-semibold">{item.name}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{item.desc}</span>
                  </button>
                ))}
              </div>

              <div className="border-t pt-5">
                <h3 className="text-sm font-semibold mb-3">One-Click Production Templates</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.name}
                      type="button"
                      onClick={() => applyTemplate(tmpl)}
                      className="flex flex-col items-start gap-1.5 rounded-xl border bg-card p-3.5 text-left transition-all hover:border-primary hover:bg-muted/30 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span>{tmpl.emoji}</span>
                        <span>{tmpl.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{tmpl.text}</p>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
export default AnnouncementBarPage;
