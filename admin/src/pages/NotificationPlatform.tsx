import { useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, FlaskConical, RefreshCw, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { filterNotificationDeliveries, notificationPlatformError, parseTargetIds, platformTestInputSchema, PLATFORM_NOTIFICATION_TYPES, useNotificationPlatformOverview, useSendNotificationPlatformTest, type PlatformTestInput } from "@/lib/notificationPlatform";

const channelLabels: Record<string, string> = { in_app: "In-app", broadcast: "Realtime broadcast", email: "Email", push: "Push", desktop: "Desktop" };
const metric = (value: number | null | undefined) => value == null ? "Unavailable" : value.toLocaleString();
const date = (value: string) => new Date(value).toLocaleString();
const defaults = { search: "", channel: "all", status: "all", type: "all", mode: "all", read: "all" };

function Filter({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <label className="space-y-1 text-xs text-muted-foreground"><span>{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"><option value="all">All</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function TestComposer({ onClose, available }: { onClose: () => void; available: boolean }) {
  const send = useSendNotificationPlatformTest();
  const [targets, setTargets] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<PlatformTestInput["type"]>("system");
  const [review, setReview] = useState<PlatformTestInput | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const locked = useRef(false);
  const [attempted, setAttempted] = useState(false);
  const validation = platformTestInputSchema.safeParse({ userIds: parseTargetIds(targets), title, body, type });

  const submit = async () => {
    if (!review || locked.current || !available) return;
    locked.current = true;
    setAttempted(true);
    setError("");
    try {
      const response = await send.mutateAsync(review);
      setResult(response.count);
    } catch {
      setError("Send result could not be confirmed. Check delivery activity before creating another test to avoid duplicates. This request will not be retried automatically.");
    }
  };

  return <Dialog open onOpenChange={(open) => { if (!open && !send.isPending) onClose(); }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogTitle>Targeted platform test</DialogTitle>
      <DialogDescription>A real, labelled test for up to 10 explicit recipients. No broadcast and no channel override; server preferences and channel availability apply.</DialogDescription>
      {result !== null ? <div role="status" className="space-y-3 rounded-lg border p-4"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><p className="font-medium">{result} notification records created</p><p className="text-sm text-muted-foreground">This confirms creation, not delivery or reading. Review delivery activity for actual outcomes.</p><Button onClick={onClose}>Done</Button></div> : review ? <div className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4"><Badge variant="warning">TEST · real recipients</Badge><h3 className="mt-3 break-words font-semibold">{review.title}</h3><p className="mt-1 whitespace-pre-wrap break-words text-sm">{review.body || "No body"}</p><p className="mt-3 text-xs text-muted-foreground">Type: {review.type} · {review.userIds.length} recipients</p><ul className="mt-2 space-y-1 break-all font-mono text-xs">{review.userIds.map((id) => <li key={id}>{id}</li>)}</ul></div>
        {!available && <p role="alert" className="text-sm text-destructive">Platform unavailable. Refresh the overview before sending.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button variant="outline" disabled={attempted} onClick={() => setReview(null)}>Edit</Button><Button disabled={attempted || !available} onClick={() => void submit()}>{send.isPending ? "Submitting…" : "Confirm test send"}</Button></div>
      </div> : <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (validation.success) setReview(validation.data); }}>
        <div className="space-y-2"><Label htmlFor="platform-targets">Recipient user IDs</Label><Textarea id="platform-targets" value={targets} onChange={(event) => setTargets(event.target.value)} rows={3} maxLength={2200} placeholder="Explicit platform user IDs, separated by commas or newlines" /><p className="text-xs text-muted-foreground">Use canonical notification user IDs, not emails or profile IDs. Duplicates are removed. {parseTargetIds(targets).length}/10 recipients.</p></div>
        <div className="space-y-2"><Label htmlFor="platform-title">Title</Label><Input id="platform-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required /></div>
        <div className="space-y-2"><Label htmlFor="platform-body">Body</Label><Textarea id="platform-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} rows={3} /></div>
        <div className="space-y-2"><Label htmlFor="platform-type">Type</Label><select id="platform-type" className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={type} onChange={(event) => setType(event.target.value as PlatformTestInput["type"])}>{PLATFORM_NOTIFICATION_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
        {!validation.success && targets && title && <p role="alert" className="text-sm text-destructive">Enter 1–10 valid user IDs (letters, numbers, underscores or hyphens) and a non-empty title.</p>}
        <Button type="submit" className="w-full" disabled={!validation.success || !available}>Review test send</Button>
      </form>}
    </DialogContent>
  </Dialog>;
}

export function NotificationPlatform() {
  const { user } = useAuth();
  const overview = useNotificationPlatformOverview();
  const [filters, setFilters] = useState(defaults);
  const [composing, setComposing] = useState(false);
  const data = overview.data;
  const rows = useMemo(() => filterNotificationDeliveries(data?.recent ?? [], filters), [data, filters]);
  const options = (key: "channel" | "status" | "type") => [...new Set(data?.recent.map((row) => row[key]) ?? [])].sort().map((value) => ({ value, label: channelLabels[value] ?? value }));
  const healthy = Boolean(data && !overview.isError);
  const sendAvailable = healthy && Boolean(data?.channels.some((channel) => channel.available));

  if (!hasRole(user, "admin")) return <EmptyState icon={ShieldCheck} title="Administrator access required" description="Platform operations and test sends require the admin or super admin role. Your existing access has not changed." />;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold"><Activity className="h-4 w-4" />Notification operations</h2><p className="mt-1 text-xs text-muted-foreground">Server-reported outcomes · refreshes every minute while active</p></div><div className="flex gap-2"><Button variant="outline" disabled={overview.isFetching} onClick={() => void overview.refetch()}><RefreshCw className="mr-2 h-4 w-4" />{overview.isFetching ? "Refreshing…" : "Refresh"}</Button><Button disabled={!sendAvailable} onClick={() => setComposing(true)}><FlaskConical className="mr-2 h-4 w-4" />Targeted test</Button></div></div>
    {overview.isLoading ? <LoadingState /> : overview.isError || !data ? <div role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5"><h3 className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" />Operations unavailable</h3><p className="mt-2 text-sm text-muted-foreground">{notificationPlatformError(overview.error)}</p><p className="mt-2 text-xs text-muted-foreground">No delivery, read or failure metrics are available. Test sends are disabled.</p></div> : <>
      <p className="text-xs text-muted-foreground">Window: {date(data.window_start)} – {date(data.generated_at)}. Aggregates cover this full window, include tests and do not change with the recent-activity filters.</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        ["Notifications", metric(data.kpis.notifications), "Recipient notification records"],
        ["Sent by worker", metric(data.kpis.sent), `${metric(data.kpis.deliveries)} delivery records · not device receipts`],
        ["Failed", metric(data.kpis.failed), `${metric(data.kpis.pending)} pending delivery records`],
        ["Read", metric(data.kpis.read), data.kpis.read_rate == null ? "Read rate unavailable" : `${data.kpis.read_rate.toLocaleString()}% of notification records`],
      ].map(([label, value, hint]) => <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-2 text-2xl font-semibold ${label === "Failed" && (data.kpis.failed ?? 0) > 0 ? "text-destructive" : ""}`}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{hint}</p></CardContent></Card>)}</div>
      <Card><CardContent className="p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="text-sm font-semibold">Channel availability</h3><p className="text-xs text-muted-foreground">Pending reminders: {metric(data.kpis.reminders_pending)} · current queue</p></div><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[...new Set(["in_app", "email", "push", "desktop", ...data.channels.map((channel) => channel.channel)])].map((name) => {
        const channel = data.channels.find((entry) => entry.channel === name);
        return <div key={name} className="rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium">{channelLabels[name] ?? name}</span><Badge variant={channel?.available ? "success" : "secondary"}>{channel ? channel.available ? "Available" : "Unavailable" : "Not reported"}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{channel?.reason || (channel?.available ? "Reported available by the server; receipt is not guaranteed." : "No available delivery capability reported.")}</p></div>;
      })}</div></CardContent></Card>
      <Card><CardContent className="p-0"><div className="space-y-3 border-b p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="text-sm font-semibold">Recent delivery activity</h3><span className="text-xs text-muted-foreground">{rows.length} of {data.recent.length} returned records · not full history</span></div><Input aria-label="Search delivery activity" placeholder="Search title, recipient ID, notification ID or error…" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /><div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">{(["channel", "status", "type"] as const).map((key) => <Filter key={key} label={key[0].toUpperCase() + key.slice(1)} value={filters[key]} options={options(key)} onChange={(value) => setFilters({ ...filters, [key]: value })} />)}<Filter label="Send mode" value={filters.mode} options={[{ value: "test", label: "Tests" }, { value: "production", label: "Non-test" }]} onChange={(mode) => setFilters({ ...filters, mode })} /><Filter label="Read receipt" value={filters.read} options={[{ value: "read", label: "Read" }, { value: "unread", label: "No receipt" }]} onChange={(read) => setFilters({ ...filters, read })} /><Button variant="ghost" className="self-end" onClick={() => setFilters(defaults)}>Clear filters</Button></div></div>
        {!rows.length ? <div className="p-6"><EmptyState title={data.recent.length ? "No matching deliveries" : "No delivery activity reported"} description={data.recent.length ? "Clear or adjust filters to inspect other returned records." : "Delivery records will appear here when the server reports them."} /></div> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-muted-foreground">{["Notification / recipient", "Channel", "Outcome", "Read receipt", "Created"].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30"><td className="max-w-sm px-4 py-3"><p className="break-words font-medium">{row.is_test && <Badge variant="warning" className="mr-2">TEST</Badge>}{row.title}</p><p className="mt-1 break-all text-xs text-muted-foreground">{row.user_id} · {row.type}</p><p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">{row.notification_id}</p></td><td className="px-4 py-3">{channelLabels[row.channel] ?? row.channel}</td><td className="max-w-xs px-4 py-3"><Badge variant={row.status === "failed" ? "destructive" : row.status === "delivered" ? "success" : "secondary"}>{row.status}</Badge>{row.delivered_at && <p className="mt-1 text-xs text-muted-foreground">{date(row.delivered_at)}</p>}{row.error && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-destructive">{row.error}</p>}</td><td className="px-4 py-3 text-xs text-muted-foreground">{row.read_at ? date(row.read_at) : "No receipt"}</td><td className="px-4 py-3 text-xs text-muted-foreground">{date(row.created_at)}</td></tr>)}</tbody></table></div>}
      </CardContent></Card>
    </>}
    {composing && <TestComposer available={sendAvailable} onClose={() => setComposing(false)} />}
  </div>;
}
