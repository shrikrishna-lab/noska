import { Link } from "react-router-dom";
import { Activity, ArrowRight, CheckCircle2, ClipboardList, FileText, LifeBuoy, Megaphone, ShieldCheck, Users, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/auth";
import { can, ROLE_CAPABILITIES, ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_WORKFLOWS, type AdminCapability } from "@/lib/rbac";
import { useAuditCount, usePageCount, useRealtimeAuditFeed, useUserCount, useWaitlistCount } from "@/lib/queries";

const CAPABILITY_LINKS: Record<AdminCapability, { label: string; href: string; icon: typeof Activity }> = {
  dashboard: { label: "Platform dashboard", href: "/", icon: Activity },
  users: { label: "Manage users", href: "/users", icon: Users },
  waitlist: { label: "Review waitlist", href: "/waitlist", icon: ClipboardList },
  content: { label: "Manage content", href: "/pages", icon: FileText },
  marketing: { label: "Open marketing", href: "/email-dashboard", icon: Megaphone },
  support: { label: "Support inbox", href: "/support", icon: LifeBuoy },
  monitoring: { label: "System monitoring", href: "/monitoring/overview", icon: Wrench },
  audit_logs: { label: "Audit logs", href: "/audit-logs", icon: ShieldCheck },
  manage_admins: { label: "Administrator accounts", href: "/admin-accounts", icon: ShieldCheck },
  destructive_actions: { label: "User lifecycle controls", href: "/users", icon: Wrench },
};

export function RoleDashboard() {
  const { user } = useAuth();
  const liveEvents = useRealtimeAuditFeed(5);
  const { data: users } = useUserCount();
  const { data: pages } = usePageCount();
  const { data: waitlist } = useWaitlistCount();
  const { data: audits } = useAuditCount();
  if (!user) return null;
  const capabilities = ROLE_CAPABILITIES[user.role] ?? [];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="My workspace" description="Role-scoped tools, permissions and live activity" />
      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2"><Badge>{ROLE_LABELS[user.role]}</Badge><span className="text-xs text-muted-foreground">Signed in as {user.email}</span></div>
            <h2 className="text-xl font-semibold">Your Noska control center</h2>
            <p className="mt-1 text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[user.role]}</p>
          </div>
          <Button asChild variant="outline"><Link to="/"><Activity className="mr-2 h-4 w-4" />Open overview</Link></Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {can(user, "users") && <Metric label="Users" value={users} href="/users" />}
        {can(user, "content") && <Metric label="Pages" value={pages} href="/pages" />}
        {can(user, "waitlist") && <Metric label="Waitlist" value={waitlist} href="/waitlist" />}
        {can(user, "audit_logs") && <Metric label="Audit events" value={audits} href="/audit-logs" />}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {capabilities.map((capability) => {
          const item = CAPABILITY_LINKS[capability];
          const Icon = item.icon;
          return <Card key={capability} className="transition-colors hover:border-primary/40"><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">Available to your role</p></div><Button asChild size="icon" variant="ghost"><Link to={item.href} aria-label={`Open ${item.label}`}><ArrowRight className="h-4 w-4" /></Link></Button></CardContent></Card>;
        })}
      </div>

      <section>
        <div className="mb-3"><h2 className="text-base font-semibold">Your role workflows</h2><p className="text-xs text-muted-foreground">Five focused tools for the {ROLE_LABELS[user.role]} operating model. Each opens live production data.</p></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ROLE_WORKFLOWS[user.role].map((workflow) => <Card key={workflow.id} className="group transition-colors hover:border-primary/40"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{workflow.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{workflow.description}</p></div><Badge variant="outline" className="shrink-0 text-[10px]">Live</Badge></div><Button asChild variant="link" size="sm" className="mt-2 h-auto px-0 text-xs"><Link to={workflow.href}>Open workflow <ArrowRight className="ml-1 h-3 w-3" /></Link></Button></CardContent></Card>)}
        </div>
      </section>

      {can(user, "audit_logs") && <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" />Live admin activity</CardTitle></CardHeader><CardContent className="space-y-2">{liveEvents.length === 0 ? <p className="text-sm text-muted-foreground">No recent events.</p> : liveEvents.map((event) => <div key={event.id} className="flex items-center gap-3 rounded-lg border p-3"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><div className="min-w-0 flex-1"><p className="truncate text-sm">{event.user_name} {event.action}</p><p className="text-xs text-muted-foreground">{event.detail ?? "platform activity"}</p></div><span className="text-xs text-muted-foreground">{event.created_at ? new Date(event.created_at).toLocaleTimeString() : ""}</span></div>)}</CardContent></Card>}
    </div>
  );
}

function Metric({ label, value, href }: { label: string; value?: number; href: string }) {
  return <Link to={href} className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{typeof value === "number" ? value.toLocaleString() : "—"}</p><p className="mt-1 text-[11px] text-muted-foreground">Live from Supabase <ArrowRight className="ml-1 inline h-3 w-3" /></p></Link>;
}
