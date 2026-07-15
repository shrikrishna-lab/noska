import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFeedback, useUpdateFeedbackStatus } from "@/lib/queries";
import { formatRelativeTime } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { FeedbackItem } from "@/lib/types";
import { Star, MessageSquare, Archive, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import toast from "react-hot-toast";

const statusColors: Record<string, "secondary" | "warning" | "default" | "success" | "destructive"> = {
  new: "secondary", in_review: "warning", planned: "default", shipped: "success", archived: "destructive",
};

export function Feedback() {
  const { data: feedback, isLoading } = useFeedback();
  const updateStatus = useUpdateFeedbackStatus();
  const [archiving, setArchiving] = useState<string | null>(null);

  const columns: Column<FeedbackItem>[] = [
    { key: "user_name", label: "User", sortable: true, render: (row) => (
      <div>
        <p className="font-medium">{row.user_name}</p>
        <p className="text-xs text-muted-foreground">{row.email}</p>
      </div>
    )},
    { key: "rating", label: "Rating", sortable: true, render: (row) => (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => <Star key={i} className={cn("h-3 w-3", i < row.rating ? "fill-warning text-warning" : "text-muted-foreground/30")} />)}
      </div>
    )},
    { key: "category", label: "Category", sortable: true, render: (row) => <Badge variant="outline">{row.category}</Badge> },
    { key: "message", label: "Message", sortable: true, className: "max-w-xs", render: (row) => <span className="line-clamp-2 text-muted-foreground">{row.message}</span> },
    { key: "status", label: "Status", sortable: true, render: (row) => <Badge variant={statusColors[row.status] ?? "secondary"}>{row.status}</Badge> },
    { key: "created_at", label: "Date", sortable: true, render: (row) => <span className="text-muted-foreground">{formatRelativeTime(row.created_at)}</span>, hideOnMobile: true },
    { key: "actions", label: "", className: "text-right", render: (row) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
          if (row.status === "new") {
            updateStatus.mutate({ id: row.id, status: "in_review" });
            toast.success("Marked as in review");
          } else {
            toast("Already reviewed");
          }
        }}><MessageSquare className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => {
          if (row.status === "archived") { toast("Already archived"); return; }
          setArchiving(row.id);
          try { await updateStatus.mutateAsync({ id: row.id, status: "archived" }); toast.success("Archived"); }
          catch { toast.error("Failed to archive"); }
          setArchiving(null);
        }} disabled={archiving === row.id}>
          {archiving === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
        </Button>
      </div>
    )},
  ];

  if (isLoading) return <div className="p-6"><PageHeader title="Feedback" description="User feedback and ratings" /><LoadingState count={5} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Feedback" description="User feedback and ratings" />
      {feedback && feedback.length > 0 ? (
        <DataTable columns={columns} data={feedback} searchPlaceholder="Search feedback..." />
      ) : (
        <EmptyState title="No feedback yet" description="User feedback will appear here once collected." />
      )}
    </div>
  );
}