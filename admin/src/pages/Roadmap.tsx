import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useRoadmap, useRealtimeInvalidate } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { RoadmapItem } from "@/lib/types";

const statusColors: Record<string, "secondary" | "warning" | "default" | "success"> = {
  backlog: "secondary", in_progress: "warning", review: "default", shipped: "success",
};
const priorityColors: Record<string, "secondary" | "default" | "warning" | "destructive"> = {
  low: "secondary", medium: "default", high: "warning", critical: "destructive",
};

export function Roadmap() {
  const { data: items, isLoading } = useRoadmap();
  useRealtimeInvalidate(["admin", "roadmap"], "roadmap");

  if (isLoading) return <div className="p-6"><PageHeader title="Roadmap" description="Product roadmap" /><LoadingState count={5} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Roadmap" description="Product roadmap and feature tracking" />
      {items && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item: RoadmapItem) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.title}</span>
                      <Badge variant={statusColors[item.status] ?? "secondary"}>{item.status.replace("_", " ")}</Badge>
                      <Badge variant={priorityColors[item.priority] ?? "default"}>{item.priority}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Owner: {item.owner || "—"}</span>
                      <span>ETA: {item.eta || "—"}</span>
                      <span>Dependencies: {item.dependencies}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-medium">{item.progress}%</span>
                    <Progress value={item.progress} className={cn("h-2 w-24", item.progress === 100 && "bg-success/20 [&>div]:bg-success")} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No roadmap items" description="Roadmap items will appear here once created." />
      )}
    </div>
  );
}
