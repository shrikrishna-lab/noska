import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Rocket, RefreshCw, ExternalLink, CheckCircle2, XCircle, Loader2, Clock,
  FileCode2, Tag, PackageOpen, AlertTriangle, ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { releaseApi } from "@/lib/monitoring/api";
import type { GitHubRun, GitHubRelease } from "@/lib/monitoring/api";

const RUN_STATUS: Record<string, { label: string; badge: string; icon: typeof Clock }> = {
  queued: { label: "Queued", badge: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300", icon: Clock },
  in_progress: { label: "Building", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: Loader2 },
  completed: { label: "Done", badge: "", icon: CheckCircle2 },
};

const CONCLUSION: Record<string, { label: string; badge: string }> = {
  success: { label: "Success", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  failure: { label: "Failed", badge: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  cancelled: { label: "Cancelled", badge: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300" },
  timed_out: { label: "Timed out", badge: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

function bumpVersion(v: string, part: "major" | "minor" | "patch"): string {
  const [ma, mi, pa] = v.split("-")[0].split(".").map(Number);
  if (part === "major") return `${(ma || 0) + 1}.0.0`;
  if (part === "minor") return `${ma || 0}.${(mi || 0) + 1}.0`;
  return `${ma || 0}.${mi || 0}.${(pa || 0) + 1}`;
}

function RunRow({ run }: { run: GitHubRun }) {
  const statusMeta = RUN_STATUS[run.status ?? "queued"];
  const conclusionMeta = run.conclusion ? CONCLUSION[run.conclusion] : null;
  const building = run.status === "in_progress";
  const failed = run.conclusion === "failure" || run.conclusion === "timed_out";
  const ok = run.conclusion === "success";
  const tag = run.head_branch ?? "";
  return (
    <a
      href={run.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
    >
      {building ? (
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      ) : ok ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      ) : failed ? (
        <XCircle className="h-5 w-5 text-red-500" />
      ) : (
        <Clock className="h-5 w-5 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" /> {tag || "manual run"}
          </span>
          {conclusionMeta && <Badge className={conclusionMeta.badge}>{conclusionMeta.label}</Badge>}
          {!conclusionMeta && run.status !== "completed" && (
            <Badge className={statusMeta.badge}>{statusMeta.label}</Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {new Date(run.created_at).toLocaleString()} · {run.event}
        </p>
      </div>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </a>
  );
}

function ReleaseRow({ release }: { release: GitHubRelease }) {
  const installers = release.assets.filter((a) => !a.name.endsWith(".json") && !a.name.endsWith(".sig"));
  return (
    <a
      href={release.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
    >
      <PackageOpen className="h-5 w-5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{release.name ?? release.tag_name}</span>
          {release.draft && <Badge variant="secondary">Draft</Badge>}
          {release.prerelease && <Badge variant="secondary">Pre-release</Badge>}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {(release.published_at ?? release.created_at) ? new Date(release.published_at ?? release.created_at).toLocaleString() : ""}
          {" · "}
          {installers.length} installer{installers.length === 1 ? "" : "s"}
          {installers.length > 0 && ` (${[...new Set(installers.map((a) => {
            if (a.name.includes("macos") || a.name.includes("dmg") || a.name.includes("darwin")) return "macOS";
            if (a.name.includes("msi") || a.name.includes("nsis") || a.name.includes("windows")) return "Windows";
            if (a.name.includes("appimage") || a.name.includes("deb") || a.name.includes("rpm")) return "Linux";
            return "Other";
          }))].join(", ")})`}
        </p>
      </div>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </a>
  );
}

export function ReleasesPage() {
  const qc = useQueryClient();
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: status, isLoading, refetch, isRefetching, isError, error } = useQuery({
    queryKey: ["admin", "releases", "status"],
    queryFn: releaseApi.status,
    refetchInterval: 15000,
    retry: 1,
  });

  const { data: runsData } = useQuery({
    queryKey: ["admin", "releases", "runs"],
    queryFn: releaseApi.runs,
    refetchInterval: 10000,
    retry: 1,
  });

  const trigger = useMutation({
    mutationFn: () => releaseApi.trigger(version.trim(), notes.trim()),
    onSuccess: (result) => {
      toast.success(`Release ${result.tag} triggered — build started`);
      setConfirmOpen(false);
      setNotes("");
      qc.invalidateQueries({ queryKey: ["admin", "releases"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message.slice(0, 300) : "Release trigger failed");
    },
  });

  const currentVersion = status?.currentVersion ?? null;
  const suggested = version.trim() || (currentVersion ? bumpVersion(currentVersion, "patch") : "");

  if (isError) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    const notConfigured = msg.includes("SERVICE_NOT_CONFIGURED") || msg.includes("not configured") || msg.includes("503");
    return (
      <div className="p-6">
        <PageHeader title="Releases" description="Trigger and track Noska desktop releases" />
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-6 text-center dark:border-yellow-700 dark:bg-yellow-900/20">
          <AlertTriangle className="mx-auto h-8 w-8 text-yellow-600" />
          <h3 className="mt-2 text-sm font-semibold">
            {notConfigured ? "GitHub integration not configured" : "Releases unavailable"}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            {notConfigured
              ? "Ask an operator to set the GITHUB_TOKEN secret on the Supabase project (fine-grained token with Contents read/write on shrikrishna-lab/noska)."
              : msg.slice(0, 200)}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !status) {
    return (
      <div className="p-6">
        <PageHeader title="Releases" description="Trigger and track Noska desktop releases" />
        <LoadingState count={6} />
      </div>
    );
  }

  const runs = runsData?.runs ?? status.runs;
  const releases = status.releases ?? [];
  const activeRun = runs.find((r) => r.status === "in_progress" || r.status === "queued");

  return (
    <div className="p-6">
      <PageHeader
        title="Releases"
        description="Trigger and track Noska desktop releases"
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {activeRun && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3"
        >
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">Build in progress — {activeRun.head_branch ?? "manual"}</p>
            <p className="text-xs text-muted-foreground">Started {new Date(activeRun.created_at).toLocaleString()} · status updates every 10s</p>
          </div>
          <a href={activeRun.html_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">Watch run <ExternalLink className="ml-2 h-3 w-3" /></Button>
          </a>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Trigger form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Rocket className="h-4 w-4" /> Trigger a release
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="release-version">Version</Label>
              <div className="flex gap-2">
                <Input
                  id="release-version"
                  placeholder={currentVersion ? bumpVersion(currentVersion, "patch") : "1.0.12"}
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                />
                {currentVersion && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setVersion(bumpVersion(currentVersion, "patch"))}
                  >
                    {bumpVersion(currentVersion, "patch")}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Semver, must be greater than the current version.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Current versions</Label>
              <div className="space-y-1">
                {status.versions.map((v) => (
                  <div key={v.path} className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-xs">
                    <span className="flex items-center gap-1.5 font-mono text-muted-foreground">
                      <FileCode2 className="h-3.5 w-3.5" /> {v.path}
                    </span>
                    <span className="font-semibold">{v.version ?? `? (${v.error})`}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="release-notes">Release notes</Label>
              <Textarea
                id="release-notes"
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What's new in this release…"
              />
            </div>

            <Button
              className="w-full"
              disabled={!suggested || trigger.isPending}
              onClick={() => setConfirmOpen(true)}
            >
              <Rocket className="mr-2 h-4 w-4" />
              Build &amp; Publish {suggested ? `desktop-v${suggested}` : ""}
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Bumps the version files on <span className="font-mono">{status.branch}</span>, pushes tag{" "}
              <span className="font-mono">desktop-v{version || "…"}</span> and pre-creates a draft release with
              your notes. GitHub Actions then builds and signs installers for macOS, Windows and Linux and
              refreshes the auto-update manifest.
            </p>
          </CardContent>
        </Card>

        {/* Runs + releases */}
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Workflow Runs (live)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {runs.length === 0 ? (
                <div className="px-4 pb-4">
                  <EmptyState title="No runs yet" description="Trigger a release to see build runs here." />
                </div>
              ) : (
                <div className="divide-y">
                  {runs.slice(0, 8).map((run) => <RunRow key={run.id} run={run} />)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Desktop Releases</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {releases.length === 0 ? (
                <div className="px-4 pb-4">
                  <EmptyState title="No releases" description="Published desktop releases will appear here." />
                </div>
              ) : (
                <div className="divide-y">
                  {releases.slice(0, 8).map((release) => <ReleaseRow key={release.id} release={release} />)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Release desktop-v{version.trim() || suggested}?</DialogTitle>
            <DialogDescription>
              This commits version bumps to <span className="font-mono">{status.branch}</span>, tags the
              repository and starts a full cross-platform build. Only admins can trigger releases.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            The build uploads a draft release first; publishing to the public distribution repo runs
            automatically after all platform jobs succeed.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => trigger.mutate()} disabled={trigger.isPending}>
              {trigger.isPending ? "Triggering…" : "Confirm release"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ReleasesPage;
