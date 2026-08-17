import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Portal } from "@/components/ui/Portal";
import {
  useEmailSegments, useCreateEmailSegment, useDeleteEmailSegment,
  useUpdateEmailSegment, useRealtimeInvalidate, adminSelect,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { LoadingState } from "@/components/ui/LoadingState";
import { TargetedEmailDialog, type TargetMode } from "@/components/email/TargetedEmailDialog";
import {
  Tag, Plus, Trash2, Users, Search, Pencil, Copy, Send, MapPin, Eye,
} from "lucide-react";
import toast from "react-hot-toast";

type Op = "equals" | "not_equals" | "contains" | "not_contains" | "starts_with" | "exists" | "not_exists";

interface FilterRow {
  field: string;
  op: Op;
  value: string;
}

interface ProfileLike {
  email?: string | null;
  user_name?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  area?: string | null;
  postal_code?: string | null;
  created_at?: string | null;
  last_active_at?: string | null;
  username?: string | null;
  preferences?: Record<string, unknown> | null;
}

const FILTER_FIELDS: Array<{ value: string; label: string }> = [
  { value: "country", label: "Country" },
  { value: "state", label: "State / Region" },
  { value: "city", label: "City" },
  { value: "area", label: "Area / Locality" },
  { value: "postal_code", label: "Postal Code" },
  { value: "signup_date", label: "Signup Date" },
  { value: "last_active", label: "Last Active" },
  { value: "username", label: "Username" },
  { value: "email", label: "Email" },
];

const OPERATORS: Array<{ value: Op; label: string }> = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "not contains" },
  { value: "starts_with", label: "starts with" },
  { value: "exists", label: "is set" },
  { value: "not_exists", label: "is not set" },
];

function matchFilter(p: ProfileLike, f: FilterRow): boolean {
  const raw =
    f.field === "signup_date" ? p.created_at
    : f.field === "last_active" ? p.last_active_at
    : p[f.field as keyof ProfileLike];
  const str = typeof raw === "string" ? raw : raw != null ? String(raw) : "";

  switch (f.op) {
    case "exists": return str.trim().length > 0;
    case "not_exists": return str.trim().length === 0;
    case "equals": return str.toLowerCase() === f.value.trim().toLowerCase();
    case "not_equals": return str.toLowerCase() !== f.value.trim().toLowerCase();
    case "contains": return str.toLowerCase().includes(f.value.trim().toLowerCase());
    case "not_contains": return !str.toLowerCase().includes(f.value.trim().toLowerCase());
    case "starts_with": return str.toLowerCase().startsWith(f.value.trim().toLowerCase());
    default: return true;
  }
}

async function resolveSegmentUsers(filters: FilterRow[]): Promise<ProfileLike[]> {
  const profiles = await adminSelect<ProfileLike>("user_profiles", "*");
  const all = profiles ?? [];
  if (filters.length === 0) return all;
  return all.filter((p) => filters.every((f) => matchFilter(p, f)));
}

function serializeFilters(filters: FilterRow[]): unknown {
  return filters.map((f) => ({ field: f.field, operator: f.op, value: f.value }));
}

function deserializeFilters(raw: unknown): FilterRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const row = (r ?? {}) as Record<string, unknown>;
    const op = (row.operator as Op) ?? "equals";
    return {
      field: String(row.field ?? "country"),
      op: OPERATORS.some((o) => o.value === op) ? op : "equals",
      value: row.value != null ? String(row.value) : "",
    };
  });
}

function SegmentDialog({
  open, onClose, initial, title,
}: {
  open: boolean; onClose: () => void; initial: { id?: string; name: string; description: string; filters: FilterRow[] } | null; title: string;
}) {
  const { user } = useAuth();
  const create = useCreateEmailSegment();
  const update = useUpdateEmailSegment();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [filters, setFilters] = useState<FilterRow[]>(initial?.filters ?? [{ field: "country", op: "equals", value: "" }]);
  const [preview, setPreview] = useState<ProfileLike[] | null>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setFilters(initial?.filters?.length ? initial.filters : [{ field: "country", op: "equals", value: "" }]);
      setPreview(null);
    }
  }, [open, initial]);

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const list = await resolveSegmentUsers(filters.filter((f) => f.op === "exists" || f.op === "not_exists" || f.value.trim()));
      setPreview(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    }
    setPreviewing(false);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Segment name is required"); return; }
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        filters: JSON.stringify(serializeFilters(filters)),
      };
      if (initial) {
        await update.mutateAsync({ id: initial.id ?? "", ...payload });
        toast.success("Segment updated");
      } else {
        await create.mutateAsync({
          ...payload,
          subscriber_count: 0,
          created_by: user?.id,
        });
        toast.success("Segment created");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save segment");
    }
  };

  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="w-full max-w-2xl rounded-xl border bg-background p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{title}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}><Trash2 className="h-4 w-4 rotate-45" /></Button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Segment Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Users in New York" /></div>
              <div className="space-y-2"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this segment..." /></div>
            </div>

            <div className="space-y-2">
              <Label>Filters</Label>
              {filters.map((f, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2">
                  <select
                    className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
                    value={f.field}
                    onChange={(e) => setFilters((prev) => prev.map((r, j) => j === i ? { ...r, field: e.target.value } : r))}
                  >
                    {FILTER_FIELDS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <select
                    className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
                    value={f.op}
                    onChange={(e) => setFilters((prev) => prev.map((r, j) => j === i ? { ...r, op: e.target.value as Op } : r))}
                  >
                    {OPERATORS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  {f.op !== "exists" && f.op !== "not_exists" && (
                    <Input
                      className="h-9 w-44"
                      value={f.value}
                      onChange={(e) => setFilters((prev) => prev.map((r, j) => j === i ? { ...r, value: e.target.value } : r))}
                      placeholder={f.field === "signup_date" || f.field === "last_active" ? "2026-01-01" : "value"}
                    />
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => setFilters((prev) => prev.filter((_, j) => j !== i))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setFilters((prev) => [...prev, { field: "country", op: "equals", value: "" }])}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Filter
              </Button>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
              All filters are combined with AND logic. City / area / country fields come from each user's profile.
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={handlePreview} disabled={previewing}>
                <Eye className="mr-1 h-3.5 w-3.5" /> {previewing ? "Loading..." : "Preview Matches"}
              </Button>
              {preview && (
                <span className="text-xs text-muted-foreground"><strong className="text-foreground">{preview.length}</strong> users match</span>
              )}
            </div>

            {preview && (
              <div className="max-h-36 overflow-y-auto rounded-lg border p-2 text-xs">
                {preview.length === 0 ? <p className="text-muted-foreground">No users match these filters.</p> : preview.slice(0, 30).map((p) => (
                  <div key={p.email ?? p.user_name} className="flex justify-between border-b border-muted/50 py-1 last:border-0">
                    <span>{p.user_name || "—"}</span>
                    <span className="text-muted-foreground">{p.email || "no email"}</span>
                  </div>
                ))}
                {preview.length > 30 && <p className="py-1 text-muted-foreground">+{preview.length - 30} more…</p>}
              </div>
            )}

            <Button onClick={handleSave} disabled={create.isPending || update.isPending} className="w-full">
              {create.isPending || update.isPending ? "Saving..." : "Save Segment"}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

export function Segments() {
  const { data: segments, isLoading } = useEmailSegments();
  const del = useDeleteEmailSegment();
  const create = useCreateEmailSegment();
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; description: string; filters: FilterRow[] } | null>(null);
  const [sendTarget, setSendTarget] = useState<{ mode: TargetMode; name: string } | null>(null);
  const [sendRecipients, setSendRecipients] = useState<Array<{ email: string; name?: string }> | undefined>(undefined);
  const [sendPreResolved, setSendPreResolved] = useState(false);
  useRealtimeInvalidate(["admin", "email-segments"], "email_segments");

  const filtered = useMemo(() => {
    if (!segments) return [];
    return segments.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  }, [segments, search]);

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Segments" description="Build audience segments with location & profile filters, then email them">
        <Button onClick={() => { setEditing(null); setEditorOpen(true); }}><Plus className="mr-1 h-4 w-4" /> New Segment</Button>
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
            <Button variant="outline" size="sm" className="mt-3" onClick={() => { setEditing(null); setEditorOpen(true); }}>
              Create your first segment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const rows = deserializeFilters(s.filters);
            return (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-indigo-500" />
                      <CardTitle className="text-sm">{s.name}</CardTitle>
                    </div>
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditing({ id: s.id, name: s.name, description: s.description ?? "", filters: rows });
                        setEditorOpen(true);
                      }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={async () => {
                        await del.mutate(s.id); toast.success("Segment deleted");
                      }}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">{s.description || "No description"}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {s.subscriber_count} subscribers</span>
                    <span>{rows.length} filter{rows.length !== 1 ? "s" : ""}</span>
                  </div>
                  {rows.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {rows.slice(0, 4).map((f, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {f.field.replace("_", " ")} {f.op.replace("_", " ")} {f.op === "exists" || f.op === "not_exists" ? "" : f.value}
                        </Badge>
                      ))}
                      {rows.length > 4 && <Badge variant="outline" className="text-[10px]">+{rows.length - 4}</Badge>}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1" onClick={async () => {
                      const matched = await resolveSegmentUsers(rows);
                      const recipients = matched
                        .filter((p) => p.email)
                        .map((p) => ({ email: p.email!, name: p.user_name ?? undefined }));
                      setSendRecipients(recipients);
                      setSendPreResolved(true);
                      setSendTarget({ mode: { kind: "all" }, name: s.name });
                    }}>
                      <Send className="mr-1 h-3 w-3" /> Send Email
                    </Button>
                    <Button variant="outline" size="sm" onClick={async () => {
                      await create.mutateAsync({
                        name: `${s.name} (copy)`, description: s.description ?? "",
                        filters: JSON.stringify(s.filters ?? []), subscriber_count: 0,
                      });
                      toast.success("Segment duplicated");
                    }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SegmentDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        initial={editing}
        title={editing ? "Edit Segment" : "Create Segment"}
      />

      {sendTarget && (
        <TargetedEmailDialog
          open={!!sendTarget}
          onClose={() => setSendTarget(null)}
          defaultTarget={sendTarget.mode}
          defaultRecipients={sendRecipients}
          preResolved={sendPreResolved}
          defaultName={`New Campaign — ${sendTarget.name}`}
        />
      )}
    </div>
  );
}