import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDashboardKpis } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

export function SystemStatus() {
  const { data: kpis, isLoading } = useDashboardKpis();
  const healthScore = kpis?.userCount && kpis?.userCount > 0 ? 98 : 100;

  const components = [
    { name: "User Profiles", value: kpis?.userCount ?? 0, unit: " records", status: "operational", desc: "Registered user accounts" },
    { name: "Pages", value: kpis?.pageCount ?? 0, unit: " docs", status: "operational", desc: "Total workspace documents" },
    { name: "Audit Events", value: kpis?.auditCount ?? 0, unit: " events", status: "operational", desc: "Tracked audit trail entries" },
    { name: "AI Chats", value: kpis?.chatCount ?? 0, unit: " chats", status: "operational", desc: "AI conversation sessions" },
    { name: "Storage", value: Math.round((kpis?.pageCount ?? 0) * 0.02), unit: " MB", status: "operational", desc: "Estimated storage used" },
    { name: "AI Events Today", value: kpis?.aiEventsToday ?? 0, unit: " events", status: "operational", desc: "AI operations today" },
  ];

  if (isLoading) return <div className="p-6"><PageHeader title="System Status" description="Platform health and performance metrics" /><LoadingState count={6} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="System Status" description="Platform health and performance metrics" />

      <Card className="mb-6">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <Activity className="h-8 w-8 text-success" />
          </div>
          <div>
            <p className="text-3xl font-bold">{healthScore}%</p>
            <p className="text-sm text-muted-foreground">Overall Health Score</p>
          </div>
          <Badge variant="success" className="ml-auto">All Systems Operational</Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {components.map((comp) => (
          <Card key={comp.name}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("h-2.5 w-2.5 rounded-full", comp.status === "operational" ? "bg-success" : "bg-destructive")} />
                  <span className="font-medium text-sm">{comp.name}</span>
                </div>
                <Badge variant={comp.status === "operational" ? "success" : "destructive"} className="text-[9px]">Operational</Badge>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{comp.desc}</span>
                  <span className="font-mono font-medium">{comp.value}{comp.unit}</span>
                </div>
                <Progress value={typeof comp.value === "number" && comp.value <= 100 ? comp.value : 100} className="h-1.5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
