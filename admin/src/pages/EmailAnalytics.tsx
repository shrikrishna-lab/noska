import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, getAdminToken, SUPABASE_ENABLED } from "@/lib/supabase";
import { useRealtimeInvalidate } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "@/components/ui/KpiCard";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { Send, CheckCircle2, Eye, MousePointerClick, AlertTriangle, Ban, Mail, Users, TrendingUp, X, RefreshCw, Clock, MessageSquare, Fingerprint } from "lucide-react";

type EmailEvent = {
  id: string;
  event: string;
  recipient: string;
  subject: string;
  message_id: string;
  campaign_id: string;
  raw_payload: Record<string, unknown>;
  created_at: string;
};

const eventConfig: Record<string, { color: string; icon: typeof Send; label: string }> = {
  sent:      { color: "#3b82f6", icon: Send, label: "Sent" },
  delivered: { color: "#22c55e", icon: CheckCircle2, label: "Delivered" },
  opened:    { color: "#10b981", icon: Eye, label: "Opened" },
  clicked:   { color: "#f59e0b", icon: MousePointerClick, label: "Clicked" },
  bounced:   { color: "#ef4444", icon: AlertTriangle, label: "Bounced" },
  complained:{ color: "#dc2626", icon: Ban, label: "Complained" },
};

const TIME_RANGES = [
  { value: "24h", label: "24H" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "all", label: "All Time" },
] as const;

function getDateCutoff(range: string): Date {
  const d = new Date();
  if (range === "24h") d.setHours(d.getHours() - 24);
  else if (range === "7d") d.setDate(d.getDate() - 7);
  else if (range === "30d") d.setDate(d.getDate() - 30);
  else if (range === "90d") d.setDate(d.getDate() - 90);
  else d.setFullYear(2000);
  return d;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
} as const;

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
} as const;

function EventBadge({ event }: { event: string }) {
  const cfg = eventConfig[event];
  const color = cfg?.color ?? "#6b7280";
  const Icon = cfg?.icon ?? Send;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
      style={{ backgroundColor: color + "18", color }}
    >
      <Icon className="h-3 w-3" />
      {event}
    </span>
  );
}

function DetailRow({ label, value, children, mono }: { label: string; value?: string; children?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      {children ?? <span className={mono ? "font-mono text-xs" : "font-medium"}>{value}</span>}
    </div>
  );
}

export function EmailAnalytics() {
  const [timeRange, setTimeRange] = useState("30d");
  const [eventFilter, setEventFilter] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EmailEvent | null>(null);
  useRealtimeInvalidate(["admin", "email-events"], "email_events");

  const { data: events, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["admin", "email-events"],
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return [];
      const token = getAdminToken();
      if (!token) return [];
      const { data } = await supabase.rpc("admin_select", {
        p_session_token: token, p_table: "email_events",
        p_select: "id, event, recipient, subject, message_id, campaign_id, raw_payload, created_at",
        p_order_col: "created_at", p_order_dir: "desc", p_limit: 500,
      });
      return (data ?? []) as EmailEvent[];
    },
    refetchInterval: 15_000,
  });

  const filtered = useMemo(() => {
    if (!events) return [];
    const cutoff = getDateCutoff(timeRange);
    return events.filter((e) => new Date(e.created_at) >= cutoff);
  }, [events, timeRange]);

  const displayEvents = useMemo(() => {
    if (!eventFilter) return filtered;
    return filtered.filter((e) => e.event === eventFilter);
  }, [filtered, eventFilter]);

  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of filtered) counts[e.event] = (counts[e.event] ?? 0) + 1;
    return counts;
  }, [filtered]);

  const total = Object.values(eventCounts).reduce((a, b) => a + b, 0);
  const uniqueRecipients = new Set(filtered.map((e) => e.recipient)).size;
  const sent = eventCounts.sent ?? 0;
  const delivered = eventCounts.delivered ?? 0;
  const opened = eventCounts.opened ?? 0;
  const clicked = eventCounts.clicked ?? 0;
  const bounced = eventCounts.bounced ?? 0;

  const deliveryRate = sent > 0 ? ((delivered / sent) * 100).toFixed(1) : "0";
  const openRate = delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : "0";
  const clickRate = opened > 0 ? ((clicked / opened) * 100).toFixed(1) : "0";
  const bounceRate = sent > 0 ? ((bounced / sent) * 100).toFixed(1) : "0";

  const pieData = Object.entries(eventCounts).map(([name, value]) => ({ name, value }));
  const sortedEvents = Object.entries(eventCounts).sort((a, b) => b[1] - a[1]);

  const timelineData = useMemo(() => {
    const map = new Map<string, Record<string, string | number>>();
    const sorted = [...filtered].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (const e of sorted) {
      const day = new Date(e.created_at).toLocaleDateString();
      if (!map.has(day)) map.set(day, { date: day });
      const row = map.get(day)!;
      row[e.event] = ((row[e.event] as number) ?? 0) + 1;
      row._total = ((row._total as number) ?? 0) + 1;
    }
    return Array.from(map.values()) as Array<Record<string, string | number>>;
  }, [filtered]);

  const columns: Column<EmailEvent>[] = [
    { key: "event", label: "Event", render: (row) => <EventBadge event={row.event} /> },
    { key: "recipient", label: "Recipient", render: (row) => <span className="font-medium">{row.recipient}</span> },
    { key: "subject", label: "Subject", render: (row) => (
      <span className="max-w-[200px] truncate text-muted-foreground">{row.subject || "—"}</span>
    )},
    { key: "message_id", label: "Message ID", hideOnMobile: true, render: (row) => row.message_id ? (
      <UITooltip>
        <TooltipTrigger asChild><span className="font-mono text-xs text-muted-foreground">{row.message_id.slice(0, 12)}…</span></TooltipTrigger>
        <TooltipContent><p className="font-mono text-xs">{row.message_id}</p></TooltipContent>
      </UITooltip>
    ) : <span className="text-muted-foreground/50">—</span> },
    { key: "created_at", label: "Time", sortable: true, render: (row) => (
      <UITooltip>
        <TooltipTrigger asChild><span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">{relativeTime(row.created_at)}</span></TooltipTrigger>
        <TooltipContent><p>{new Date(row.created_at).toLocaleString()}</p></TooltipContent>
      </UITooltip>
    )},
  ];

  if (isLoading) return <div className="p-6"><PageHeader title="Email Analytics" /><LoadingState count={4} /></div>;

  return (
    <TooltipProvider delayDuration={400}>
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="Email Analytics" description="Track sent, delivered, opened, clicked, bounced, and complained emails" className="min-w-0" />
        <Tabs value={timeRange} onValueChange={setTimeRange}>
          <TabsList>
            {TIME_RANGES.map((r) => (
              <TabsTrigger key={r.value} value={r.value} className="text-xs">{r.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <motion.div variants={item}>
          <KpiCard title="Total Events" value={total} icon={Mail} subtitle={`${uniqueRecipients} unique recipients`} />
        </motion.div>
        <motion.div variants={item}>
          <KpiCard title="Delivery Rate" value={`${deliveryRate}%`} icon={TrendingUp} subtitle={`${delivered} delivered / ${sent} sent`} />
        </motion.div>
        <motion.div variants={item}>
          <KpiCard title="Open Rate" value={`${openRate}%`} icon={Eye} subtitle={`${opened} opened / ${delivered} delivered`} />
        </motion.div>
        <motion.div variants={item}>
          <KpiCard title="Click Rate" value={`${clickRate}%`} icon={MousePointerClick} subtitle={`${clicked} clicked / ${opened} opened`} />
        </motion.div>
        <motion.div variants={item}>
          <KpiCard title="Bounce Rate" value={`${bounceRate}%`} icon={AlertTriangle} subtitle={`${bounced} bounced / ${sent} sent`} />
        </motion.div>
        <motion.div variants={item}>
          <KpiCard title="Unique Recipients" value={uniqueRecipients} icon={Users} subtitle="Total distinct emails" />
        </motion.div>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {sortedEvents.map(([event, count]) => {
          const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
          const cfg = eventConfig[event];
          return (
            <motion.button
              key={event}
              variants={item}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setEventFilter(eventFilter === event ? null : event)}
              className="relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 text-left shadow-sm transition-colors hover:shadow-md"
              style={{ borderColor: cfg?.color ? cfg.color + "30" : undefined, outline: eventFilter === event ? `2px solid ${cfg?.color}` : undefined }}
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-[0.07]" style={{ backgroundImage: `linear-gradient(to bottom right, ${cfg?.color}, transparent)` }} />
              <div className="relative z-10">
                <div className="mb-3 flex items-center justify-between">
                  {cfg && <cfg.icon className="h-4 w-4" style={{ color: cfg.color }} />}
                  <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
                </div>
                <div className="text-2xl font-bold tracking-tight">{count}</div>
                <div className="mt-1 text-sm capitalize text-muted-foreground">{event}</div>
              </div>
              <div className="absolute bottom-0 left-0 h-1 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cfg?.color }} />
            </motion.button>
          );
        })}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b border-border/50 px-6 py-4">
            <h3 className="text-sm font-semibold">Event Distribution</h3>
          </div>
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={eventConfig[entry.name]?.color ?? "#6b7280"} stroke="transparent" />
                  ))}
                </Pie>
                <ReTooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
<<<<<<< HEAD
                  formatter={(value: number, name: string) => [`${value} events`, name]}
=======
                  formatter={((value: number, name: string) => [`${value} events`, name]) as any}
>>>>>>> bfef9c4 (fix: recharts v3 formatter type compat with TS7)
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 border-t border-border/50 px-6 py-3">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: eventConfig[entry.name]?.color }} />
                <span className="capitalize">{entry.name}</span>
                <span className="font-medium tabular-nums">({((entry.value / total) * 100).toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b border-border/50 px-6 py-4">
            <h3 className="text-sm font-semibold">Events by Count</h3>
          </div>
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedEvents.map(([name, value]) => ({ name, value }))} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
                <ReTooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
<<<<<<< HEAD
                  formatter={(value: number, name: string) => [`${value} events`, name]}
=======
                  formatter={((value: number, name: string) => [`${value} events`, name]) as any}
>>>>>>> bfef9c4 (fix: recharts v3 formatter type compat with TS7)
                />
                {sortedEvents.map(([name]) => (
                  <Bar key={name} dataKey="value" fill={eventConfig[name]?.color ?? "#6b7280"} radius={[0, 4, 4, 0]} barSize={20} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b border-border/50 px-6 py-4">
            <h3 className="text-sm font-semibold">Events Over Time</h3>
          </div>
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  {Object.entries(eventConfig).map(([key, cfg]) => (
                    <linearGradient key={key} id={`gradient_${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={cfg.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <ReTooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
                />
                {Object.entries(eventConfig).map(([key, cfg]) => (
                  <Area key={key} type="monotone" dataKey={key} stroke={cfg.color} fill={`url(#gradient_${key})`} strokeWidth={2} dot={false} stackId="1" />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold">Recent Events</h3>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              {(() => {
                const t = relativeTime(dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : "");
                return t === "just now" ? "just now" : `${t} ago`;
              })()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {eventFilter && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Filtered: {eventFilter}
                <button onClick={() => setEventFilter(null)} className="ml-1 hover:text-foreground"><X className="h-3 w-3" /></button>
              </Badge>
            )}
          </div>
        </div>
        <div className="p-4">
          <DataTable
            columns={columns}
            data={displayEvents.slice(0, 100)}
            onRowClick={(row) => setSelectedEvent(row)}
          />
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: (eventConfig[selectedEvent.event]?.color ?? "#6b7280") + "20" }}>
                    {(() => { const Icon = eventConfig[selectedEvent.event]?.icon ?? Send; return <Icon className="h-5 w-5" style={{ color: eventConfig[selectedEvent.event]?.color }} />; })()}
                  </div>
                  <div>
                    <p className="font-semibold capitalize">{selectedEvent.event}</p>
                    <p className="text-xs text-muted-foreground">{relativeTime(selectedEvent.created_at)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedEvent(null)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-3 text-sm">
                <DetailRow label="Recipient" value={selectedEvent.recipient} />
                <DetailRow label="Subject" value={selectedEvent.subject || "—"} />
                <DetailRow label="Event" value={selectedEvent.event}>
                  <EventBadge event={selectedEvent.event} />
                </DetailRow>
                <DetailRow label="Time" value={new Date(selectedEvent.created_at).toLocaleString()} />
                {selectedEvent.message_id && <DetailRow label="Message ID" value={selectedEvent.message_id} mono />}
                {selectedEvent.campaign_id && <DetailRow label="Campaign ID" value={selectedEvent.campaign_id} mono />}
                {selectedEvent.raw_payload && Object.keys(selectedEvent.raw_payload).length > 0 && (
                  <div className="rounded-xl bg-muted/30 p-3">
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Fingerprint className="h-3 w-3" />
                      Webhook Payload
                    </div>
                    <pre className="max-h-48 overflow-auto rounded-lg bg-black/5 p-3 text-xs dark:bg-white/5">
                      {JSON.stringify(selectedEvent.raw_payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </TooltipProvider>
  );
}
