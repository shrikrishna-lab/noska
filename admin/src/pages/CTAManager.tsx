import { useState } from "react";
import { Portal } from "@/components/ui/Portal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCTAButtons, useUpdateCTAButton, useResetCTAButton, useRealtimeInvalidate, useLaunchSettings } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { MousePointerClick, X, Save, RotateCcw, ExternalLink, Search } from "lucide-react";
import toast from "react-hot-toast";
import type { CTAButton } from "@/lib/types";

const MODE_LABELS: Record<string, string> = {
  waitlist: "Waitlist",
  early_beta: "Early Beta",
  closed_beta: "Closed Beta",
  open_beta: "Open Beta",
  public: "Public Launch",
  maintenance: "Maintenance",
};

function CTAEditor({ button, onSave, onReset }: { button: CTAButton; onSave: (id: string, data: Record<string, unknown>) => Promise<void>; onReset: (id: string) => Promise<void> }) {
  const [text, setText] = useState(button.button_text);
  const [dest, setDest] = useState(button.destination);
  const [variant, setVariant] = useState<string>(button.variant);
  const [visible, setVisible] = useState(button.visible);
  const [enabled, setEnabled] = useState(button.enabled);
  const [newTab, setNewTab] = useState(button.open_in_new_tab);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(button.id, { button_text: text, destination: dest, variant, visible, enabled, open_in_new_tab: newTab });
      toast.success(`"${button.button_id}" saved`);
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">{button.button_id}</code>
            <Badge variant={enabled ? (visible ? "success" : "secondary") : "destructive"} className="text-[9px]">
              {!enabled ? "Disabled" : !visible ? "Hidden" : "Active"}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => { await onReset(button.id); toast.success("Reset to default"); }} title="Reset to default">
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1"><Label className="text-[10px]">Button Text</Label><Input value={text} onChange={(e) => setText(e.target.value)} className="h-8 text-sm" /></div>
          <div className="space-y-1"><Label className="text-[10px]">Destination</Label><Input value={dest} onChange={(e) => setDest(e.target.value)} className="h-8 text-sm" /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px]">Variant</Label>
            <Select value={variant} onValueChange={setVariant}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="ghost">Ghost</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="danger">Danger</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 pb-1">
            <div className="flex items-center gap-1.5">
              <Switch checked={enabled} onCheckedChange={setEnabled} />
              <span className="text-[10px] text-muted-foreground">Enabled</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Switch checked={visible} onCheckedChange={setVisible} />
              <span className="text-[10px] text-muted-foreground">Visible</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Switch checked={newTab} onCheckedChange={setNewTab} />
              <span className="text-[10px] text-muted-foreground">New Tab</span>
            </div>
          </div>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving} className="w-full h-7 text-xs">
          <Save className="mr-1 h-3 w-3" /> {saving ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function CTAManager() {
  const { user } = useAuth();
  const { data: buttons, isLoading } = useCTAButtons();
  const { data: launchSettings } = useLaunchSettings();
  const updateButton = useUpdateCTAButton();
  const resetButton = useResetCTAButton();
  useRealtimeInvalidate(["admin", "cta-buttons"], "cta_buttons");

  const [search, setSearch] = useState("");

  const filtered = (buttons ?? []).filter(
    (b) => b.button_id.toLowerCase().includes(search.toLowerCase()) || b.button_text.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (id: string, data: Record<string, unknown>) => {
    await updateButton.mutateAsync({ id, ...data, admin_name: user?.name ?? "Unknown" });
  };

  const handleReset = async (id: string) => {
    await resetButton.mutateAsync(id);
  };

  if (isLoading) return <div className="p-6"><PageHeader title="CTA Buttons" description="Manage website buttons" /><LoadingState count={8} /></div>;

  return (
    <div className="p-6">
      <PageHeader
        title="CTA Buttons"
        description={`${buttons?.length ?? 0} buttons · Global mode: ${MODE_LABELS[launchSettings?.launch_mode ?? "waitlist"]}`}
      />
      <div className="mb-4">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search buttons..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
      </div>
      {filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((btn) => (
            <CTAEditor key={btn.id} button={btn} onSave={handleSave} onReset={handleReset} />
          ))}
        </div>
      ) : (
        <EmptyState title="No CTA buttons found" description={search ? "Try a different search." : "No buttons configured."} />
      )}
    </div>
  );
}
