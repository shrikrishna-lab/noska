import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  useEmailSegments, useCreateEmailSegment, useDeleteEmailSegment,
  useRealtimeInvalidate,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { LoadingState } from "@/components/ui/LoadingState";
import { Tag, Plus, Trash2, Users, Search, Filter } from "lucide-react";
import toast from "react-hot-toast";

const FILTER_FIELDS = [
  { value: "country", label: "Country" },
  { value: "signup_date", label: "Signup Date" },
  { value: "role", label: "Role" },
  { value: "workspace_count", label: "Workspace Count" },
  { value: "waitlist_status", label: "Waitlist Status" },
  { value: "activity", label: "Activity" },
  { value: "tags", label: "Tags" },
  { value: "plan", label: "Plan" },
];

function CreateSegmentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const create = useCreateEmailSegment();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async () => {
    if (!name) { toast.error("Segment name is required"); return; }
    if (!user) return;
    await create.mutateAsync({
      name, description, filters: JSON.stringify([]),
      subscriber_count: 0, created_by: user.id,
    });
    toast.success("Segment created");
    onOpenChange(false);
    setName(""); setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Segment</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Segment Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., EU Users" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this segment..." />
          </div>
          <div className="space-y-2">
            <Label>Add Filter</Label>
            <select className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm">
              <option value="">Select a field...</option>
              {FILTER_FIELDS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <Button onClick={handleCreate} disabled={create.isPending} className="w-full">
            {create.isPending ? "Creating..." : "Create Segment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Segments() {
  const { data: segments, isLoading } = useEmailSegments();
  const del = useDeleteEmailSegment();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  useRealtimeInvalidate(["admin", "email-segments"], "email_segments");

  const filtered = useMemo(() => {
    if (!segments) return [];
    return segments.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  }, [segments, search]);

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Segments" description="Create and manage audience segments">
        <Button onClick={() => setShowCreate(true)}><Plus className="mr-1 h-4 w-4" /> New Segment</Button>
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search segments..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Tag className="mx-auto h-12 w-12 mb-3 opacity-30" />
            <p>No segments yet</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowCreate(true)}>
              Create your first segment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-indigo-500" />
                    <CardTitle className="text-sm">{s.name}</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete this segment?")) del.mutate(s.id); }}>
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">{s.description || "No description"}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {s.subscriber_count} subscribers</span>
                  <span>{s.filters?.length ?? 0} filters</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateSegmentDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}
