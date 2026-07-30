import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { HardDrive } from "lucide-react";

export function ContentFiles() {
  const { data: buckets, isLoading } = useQuery({
    queryKey: ["admin", "storage", "buckets"],
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return [];
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="p-6">
      <PageHeader title="Storage" description="Storage buckets and usage" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Buckets</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{buckets?.length ?? 0}</p></CardContent>
        </Card>
      </div>

      {isLoading ? (
        <LoadingState count={3} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(buckets ?? []).map((bucket) => (
            <Card key={bucket.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">{bucket.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground capitalize">{bucket.public ? "Public" : "Private"} bucket</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
