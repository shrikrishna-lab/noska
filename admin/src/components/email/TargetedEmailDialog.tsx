import { useEffect, useState } from "react";
import { Portal } from "@/components/ui/Portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, Loader2, X } from "lucide-react";
import { adminSelect } from "@/lib/queries";
import { sendCampaign } from "@/lib/email";
import { useCreateEmailCampaign } from "@/lib/queries";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export type TargetMode =
  | { kind: "all" }
  | { kind: "city"; value: string }
  | { kind: "state"; value: string }
  | { kind: "area"; value: string }
  | { kind: "country"; value: string }
  | { kind: "individual"; emails: string[] };

interface TargetOption {
  id: string;
  label: string;
  description: string;
}

const LOCATION_TARGETS: TargetOption[] = [
  { id: "all", label: "All Users", description: "Everyone with an email in user_profiles" },
  { id: "city", label: "City-wise", description: "Users whose city matches" },
  { id: "state", label: "State / Region-wise", description: "Users whose state matches" },
  { id: "area", label: "Area / Locality-wise", description: "Users whose area matches" },
  { id: "country", label: "Country-wise", description: "Users whose country matches" },
  { id: "individual", label: "Individual Emails", description: "Type specific email addresses" },
];

interface Recipient {
  email: string;
  name?: string;
}

interface LocationProfile {
  email?: string | null;
  user_name?: string | null;
  city?: string | null;
  state?: string | null;
  area?: string | null;
  country?: string | null;
}

export async function resolveTargetRecipients(
  target: TargetMode,
  existing: Array<{ email: string; name?: string }>
): Promise<Recipient[]> {
  if (target.kind === "individual") {
    const emails = target.emails
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));
    return [...new Set(emails)].map((email) => ({ email }));
  }

  if (target.kind === "all") {
    const profiles = await adminSelect<LocationProfile>("user_profiles", "email, user_name");
    return (profiles ?? [])
      .filter((p) => p.email)
      .map((p) => ({ email: p.email!, name: p.user_name ?? undefined }));
  }

  const profiles = await adminSelect<LocationProfile>(
    "user_profiles",
    "email, user_name, city, state, area, country"
  );
  const key = target.kind;
  const value = target.value.trim().toLowerCase();
  return (profiles ?? [])
    .filter((p) => p.email && p[key] && p[key]!.trim().toLowerCase() === value)
    .map((p) => ({ email: p.email!, name: p.user_name ?? undefined }));
}

export function TargetedEmailDialog({
  open,
  onClose,
  defaultTarget,
  defaultRecipients,
  defaultName,
  preResolved,
}: {
  open: boolean;
  onClose: () => void;
  defaultTarget?: TargetMode;
  defaultRecipients?: Recipient[];
  defaultName?: string;
  preResolved?: boolean;
}) {
  const navigate = useNavigate();
  const createCampaign = useCreateEmailCampaign();
  const [target, setTarget] = useState<TargetMode>(defaultTarget ?? { kind: "all" });
  const [name, setName] = useState(defaultName ?? "New Campaign");
  const [subject, setSubject] = useState("What's new at Noska");
  const [html, setHtml] = useState("<h2>Hello {{name}},</h2><p>Check out what's new at Noska!</p>");
  const [individualInput, setIndividualInput] = useState("");
  const [locationValue, setLocationValue] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>(defaultRecipients ?? []);
  const [resolved, setResolved] = useState(preResolved ?? false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open && defaultTarget) {
      setTarget(defaultTarget);
      setResolved(false);
    }
    if (open && defaultRecipients) {
      setRecipients(defaultRecipients);
      setResolved(true);
    }
  }, [open, defaultTarget, defaultRecipients]);

  if (!open) return null;

  const effectiveTarget: TargetMode =
    target.kind === "individual"
      ? { kind: "individual", emails: individualInput.split(/[,\n;]/) }
      : target.kind !== "all" && !locationValue
        ? target
        : target.kind === "all"
          ? target
          : { kind: target.kind, value: locationValue };

  const handleResolve = async () => {
    setLoading(true);
    try {
      const list = await resolveTargetRecipients(effectiveTarget, recipients);
      setRecipients(list);
      setResolved(true);
      if (list.length === 0) toast.error("No recipients match this target");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load recipients");
    }
    setLoading(false);
  };

  const handleSend = async (status: "draft" | "sending") => {
    if (!name.trim() || !subject.trim()) return;
    setSending(true);
    try {
      const id = await createCampaign.mutateAsync({
        name: name.trim(), subject: subject.trim(), html_content: html, status,
      });
      if (status === "draft") {
        toast.success("Draft campaign created");
        onClose();
        navigate("/email-campaigns");
        return;
      }
      if (recipients.length === 0) { toast.error("No recipients resolved"); return; }
      const res = await sendCampaign({
        campaign_id: id ?? "", campaign_name: name.trim(),
        recipients, subject: subject.trim(), html,
      });
      if (res.error) toast.error(`Send failed: ${res.error}`);
      else {
        toast.success(`Sent to ${res.sent ?? 0} recipients (${res.failed ?? 0} failed)`);
        onClose();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    }
    setSending(false);
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="w-full max-w-2xl rounded-xl border bg-background p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Send Targeted Email</h2>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Target</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LOCATION_TARGETS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setTarget(
                        opt.id === "all" ? { kind: "all" }
                        : opt.id === "individual" ? { kind: "individual", emails: [] }
                        : { kind: opt.id as "city" | "state" | "area" | "country", value: locationValue }
                      );
                      setResolved(false);
                    }}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      (target.kind === "all" && opt.id === "all") ||
                      (target.kind === "individual" && opt.id === "individual") ||
                      (target.kind !== "all" && target.kind !== "individual" && target.kind === opt.id)
                        ? "border-primary bg-primary/5"
                        : "border-input hover:bg-muted"
                    }`}
                  >
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {target.kind !== "all" && target.kind !== "individual" && (
              <div className="space-y-2">
                <Label>{target.kind === "city" ? "City" : target.kind === "state" ? "State / Region" : target.kind === "area" ? "Area / Locality" : "Country"}</Label>
                <Input
                  value={locationValue}
                  onChange={(e) => { setLocationValue(e.target.value); setResolved(false); }}
                  placeholder={target.kind === "city" ? "e.g., New York" : target.kind === "state" ? "e.g., California" : target.kind === "area" ? "e.g., Downtown" : "e.g., United States"}
                />
              </div>
            )}

            {target.kind === "individual" && (
              <div className="space-y-2">
                <Label>Email addresses (comma separated)</Label>
                <Textarea
                  value={individualInput}
                  onChange={(e) => { setIndividualInput(e.target.value); setResolved(false); }}
                  rows={3}
                  placeholder="user1@example.com, user2@example.com"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Campaign Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Subject Line</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            </div>

            <div className="space-y-2">
              <Label>HTML Content</Label>
              <Textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={6} className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground">Use <code className="rounded bg-muted px-1">{`{{name}}`}</code> and <code className="rounded bg-muted px-1">{`{{email}}`}</code> as placeholders.</p>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {loading ? <><Loader2 className="h-3 w-3 animate-spin" /> Resolving recipients...</> : (
                  resolved ? <><strong>{recipients.length}</strong> recipient{recipients.length !== 1 ? "s" : ""} resolved</> : "Recipients not yet resolved"
                )}
              </span>
              <Button variant="outline" size="sm" onClick={handleResolve} disabled={loading}>
                <Users className="mr-1 h-3 w-3" /> Resolve Recipients
              </Button>
            </div>

            {resolved && recipients.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-lg border p-2 text-xs text-muted-foreground">
                {recipients.slice(0, 50).map((r) => (
                  <div key={r.email} className="flex justify-between border-b border-muted/50 py-1 last:border-0">
                    <span>{r.email}</span>
                    {r.name && <span>{r.name}</span>}
                  </div>
                ))}
                {recipients.length > 50 && <p className="py-1">+{recipients.length - 50} more…</p>}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button variant="secondary" onClick={() => handleSend("draft")} disabled={sending}>
                {sending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Save Draft
              </Button>
              <Button onClick={() => handleSend("sending")} disabled={sending || !resolved}>
                {sending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Send Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}