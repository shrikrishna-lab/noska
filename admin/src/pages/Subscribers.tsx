import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Portal } from "@/components/ui/Portal";
import {
  useNewsletterSubscribers,
  useCreateNewsletterSubscriber,
  useRealtimeInvalidate,
} from "@/lib/queries";
import { LoadingState } from "@/components/ui/LoadingState";
import { downloadCSV } from "@/lib/utils";
import { Users, Search, Download, UserPlus, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const SOURCES = ["all", "waitlist", "signup", "manual", "import", "referral"];

const STATUSES = ["active", "unsubscribed", "bounced"] as const;

function AddSubscriberDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useCreateNewsletterSubscriber();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [source, setSource] = useState("manual");
  const [status, setStatus] = useState<string>("active");

  const handleSubmit = async () => {
    if (!email.trim() || !email.includes("@")) { toast.error("Enter a valid email"); return; }
    await create.mutateAsync({ email: email.trim(), name: name.trim() || undefined, source, status });
    toast.success("Subscriber added");
    onOpenChange(false);
    setEmail(""); setName(""); setSource("manual"); setStatus("active");
  };

  return (
    <Portal>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => onOpenChange(false)}>
          <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Subscriber</h2>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="subscriber@example.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Source</label>
                  <select
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  >
                    <option value="waitlist">Waitlist</option>
                    <option value="signup">Roadmap</option>
                    <option value="manual">Manual</option>
                    <option value="import">Import</option>
                    <option value="referral">Referral</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleSubmit} disabled={create.isPending || !email.trim()}>
                  {create.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1 h-4 w-4" />}
                  Add Subscriber
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Portal>
  );
}

export function Subscribers() {
  const { data: subscribers, isLoading } = useNewsletterSubscribers();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  useRealtimeInvalidate(["admin", "newsletter-subscribers"], "newsletter_subscribers");

  const filtered = useMemo(() => {
    if (!subscribers) return [];
    return subscribers.filter((s) => {
      if (search && !s.email.toLowerCase().includes(search.toLowerCase()) && !(s.name || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (sourceFilter !== "all" && s.source !== sourceFilter) return false;
      return true;
    });
  }, [subscribers, search, statusFilter, sourceFilter]);

  const stats = useMemo(() => {
    if (!subscribers) return { total: 0, active: 0, unsubscribed: 0, bounced: 0 };
    return {
      total: subscribers.length,
      active: subscribers.filter((s) => s.status === "active").length,
      unsubscribed: subscribers.filter((s) => s.status === "unsubscribed").length,
      bounced: subscribers.filter((s) => s.status === "bounced").length,
    };
  }, [subscribers]);

  const handleExport = () => {
    if (filtered.length === 0) { toast.error("No subscribers to export"); return; }
    downloadCSV("subscribers.csv", filtered.map((s) => ({
      email: s.email, name: s.name || "", status: s.status, source: s.source === "signup" ? "Roadmap" : s.source,
      subscribed_at: s.subscribed_at,
    })));
    toast.success("CSV exported");
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Subscribers" description={`${stats.active} active subscribers`}>
        <Button variant="outline" onClick={handleExport}><Download className="mr-1 h-4 w-4" /> Export</Button>
        <Button onClick={() => setShowAdd(true)}><UserPlus className="mr-1 h-4 w-4" /> Add Subscriber</Button>
      </PageHeader>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-emerald-500">{stats.active}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-amber-500">{stats.unsubscribed}</p><p className="text-xs text-muted-foreground">Unsubscribed</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-red-500">{stats.bounced}</p><p className="text-xs text-muted-foreground">Bounced</p></CardContent></Card>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by email or name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select
          className="flex h-9 w-36 rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="bounced">Bounced</option>
        </select>
        <div className="flex gap-1 rounded-lg border border-input bg-transparent p-0.5">
          {SOURCES.map((src) => (
            <button
              key={src}
              onClick={() => setSourceFilter(src)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize",
                sourceFilter === src ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {src === "signup" ? "Roadmap" : src === "all" ? "All" : src}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-3 opacity-30" />
              <p>No subscribers found</p>
            </div>
          ) : (
            <div className="divide-y">
              <div className="flex items-center gap-3 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
                <span className="flex-1">Email</span>
                <span className="w-28">Name</span>
                <span className="w-20">Status</span>
                <span className="w-24">Source</span>
                <span className="w-28">Subscribed</span>
              </div>
              {filtered.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/20">
                  <span className="flex-1 truncate">{s.email}</span>
                  <span className="w-28 truncate text-muted-foreground">{s.name || "—"}</span>
                  <span className="w-20">
                    <Badge variant="outline" className="text-[10px] capitalize">{s.status}</Badge>
                  </span>
                  <span className="w-24 text-muted-foreground text-xs capitalize">{s.source === "signup" ? "Roadmap" : s.source}</span>
                  <span className="w-28 text-xs text-muted-foreground">{new Date(s.subscribed_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddSubscriberDialog open={showAdd} onOpenChange={setShowAdd} />
    </div>
  );
}