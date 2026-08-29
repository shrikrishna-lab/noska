import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { HardDrive, Folder, File, Trash2, Upload, ArrowLeft, RefreshCw } from "lucide-react";

interface BucketInfo { id: string; name: string; public: boolean; created_at: string; }
interface FileItem { name: string; id: string; metadata?: { size?: number; mimetype?: string } | null; created_at?: string; }

function formatBytes(bytes?: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function ContentFiles() {
  const qc = useQueryClient();
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const { data: buckets, isLoading: bucketsLoading } = useQuery({
    queryKey: ["admin", "storage", "buckets"],
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase) return [];
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      return (data ?? []) as BucketInfo[];
    },
  });

  const { data: files, isLoading: filesLoading, refetch: refetchFiles } = useQuery({
    queryKey: ["admin", "storage", "files", selectedBucket, currentPath],
    queryFn: async () => {
      if (!SUPABASE_ENABLED || !supabase || !selectedBucket) return [];
      const { data, error } = await supabase.storage.from(selectedBucket).list(currentPath || undefined, { limit: 100 });
      if (error) throw error;
      return (data ?? []) as FileItem[];
    },
    enabled: !!selectedBucket,
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ bucket, path }: { bucket: string; path: string }) => {
      if (!supabase) return;
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) throw error;
    },
    onSuccess: () => { refetchFiles(); },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ bucket, path, file }: { bucket: string; path: string; file: File }) => {
      if (!supabase) return;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (error) throw error;
    },
    onSuccess: () => { setUploadFile(null); refetchFiles(); },
  });

  const handleNavigate = (itemName: string) => {
    const item = files?.find((f) => f.name === itemName);
    if (item?.metadata?.size === undefined && !item?.name?.includes(".")) {
      setCurrentPath(currentPath ? `${currentPath}/${itemName}` : itemName);
    }
  };

  const handleGoBack = () => {
    const parts = currentPath.split("/");
    parts.pop();
    setCurrentPath(parts.join("/"));
  };

  const handleUpload = () => {
    if (!uploadFile || !selectedBucket) return;
    const path = currentPath ? `${currentPath}/${uploadFile.name}` : uploadFile.name;
    uploadMutation.mutateAsync({ bucket: selectedBucket, path, file: uploadFile });
  };

  const handleDeleteFile = (fileName: string) => {
    if (!selectedBucket) return;
    const path = currentPath ? `${currentPath}/${fileName}` : fileName;
    deleteMutation.mutateAsync({ bucket: selectedBucket, path });
  };

  return (
    <div className="p-6">
      <PageHeader title="Storage" description="Storage buckets and file management" />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Buckets</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{buckets?.length ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Current Bucket</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{selectedBucket || "—"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Files in View</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{files?.length ?? 0}</p></CardContent>
        </Card>
      </div>

      {selectedBucket ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              {currentPath && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleGoBack}><ArrowLeft className="h-4 w-4" /></Button>}
              <CardTitle className="text-sm font-medium">
                {selectedBucket}/{currentPath || ""}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchFiles()}><RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh</Button>
              <label>
                <Button size="sm" asChild>
                  <span><Upload className="h-3.5 w-3.5 mr-1" />Upload</span>
                </Button>
                <input type="file" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
              </label>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedBucket(null); setCurrentPath(""); }}>Back to Buckets</Button>
            </div>
          </CardHeader>
          <CardContent>
            {uploadFile && (
              <div className="mb-4 flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                <File className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm flex-1">{uploadFile.name} ({formatBytes(uploadFile.size)})</span>
                <Button size="sm" onClick={handleUpload} disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending ? "Uploading..." : "Upload Now"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setUploadFile(null)}>Cancel</Button>
              </div>
            )}

            {filesLoading ? (
              <LoadingState count={3} />
            ) : files && files.length > 0 ? (
              <div className="space-y-1">
                {files.map((item) => {
                  const isFolder = item.metadata?.size === undefined && !item.name.includes(".");
                  const fullPath = currentPath ? `${currentPath}/${item.name}` : item.name;
                  return (
                    <div key={item.id || item.name} className="flex items-center justify-between rounded-lg border p-2.5 hover:bg-muted/30 transition group">
                      <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => handleNavigate(item.name)}>
                        {isFolder ? <Folder className="h-4 w-4 text-amber-500 shrink-0" /> : <File className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          {item.metadata?.size !== undefined && (
                            <p className="text-[11px] text-muted-foreground">{formatBytes(item.metadata.size)} · {item.metadata.mimetype || "unknown"}</p>
                          )}
                        </div>
                      </div>
                      {!isFolder && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive" onClick={() => handleDeleteFile(item.name)} disabled={deleteMutation.isPending}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">This bucket is empty.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {bucketsLoading ? (
            <LoadingState count={3} />
          ) : buckets && buckets.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {buckets.map((bucket) => (
                <Card key={bucket.id} className="cursor-pointer hover:bg-muted/30 transition" onClick={() => setSelectedBucket(bucket.name)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">{bucket.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Badge variant={bucket.public ? "success" : "secondary"}>{bucket.public ? "Public" : "Private"}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <HardDrive className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">No storage buckets found.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
