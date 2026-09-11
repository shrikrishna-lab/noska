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
  FileCode2, Tag, PackageOpen, AlertTriangle, ShieldCheck, Sparkles,
  Zap, Wrench, AlertOctagon, Lightbulb,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { releaseApi } from "@/lib/monitoring/api";
import type { GitHubRun, GitHubRelease, WhatsNew } from "@/lib/monitoring/api";

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

// --- Release-note privacy sanitization -------------------------------------
// Notes can end up in the PUBLIC releases repo, so everything derived from
// commit messages is scrubbed: no emails, no token/key shapes, no env-var
// names, no repo paths, no private hostnames, no code URLs.

const REDACT_PATTERNS: RegExp[] = [
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,                                  // emails
  /\b(?:ghp|gho|ghu|ghs|ghr|github_pat|sbp|sk|pk)[-_][A-Za-z0-9_]{8,}\b/g, // token shapes
  /\b[A-Z][A-Z0-9_]{3,}_(?:KEY|TOKEN|SECRET|PASSWORD|DSN)\b/g,      // ENV_SECRET names
  /\b(?:service_role|anon[\s-]?key|jwt|jwks|minisign|signing[\s-]?key)\b/gi,
  /\bhttps?:\/\/\S+/g,                                              // URLs
  /\b[\w.-]+(?:\/[\w.-]+)+\.(?:ts|tsx|js|jsx|json|toml|sql|ya?ml|py|md)\b/g, // repo paths
  /\bshrikrishna[\w-]*\b|\bnot-krrish\b|\bkrishnahandibag\w*\b/gi,  // private identities
];

// A commit that is ABOUT secrets/credentials/internal ops has no place in
// public notes even after redaction — drop it entirely.
const INTERNAL_MESSAGE = /\b(secret|credential|password|api[\s-]?key|token|env var|environment variable|\.env|service role|signing key|webhook secret)\b/i;

function sanitizeLine(text: string): string {
  let s = text;
  for (const p of REDACT_PATTERNS) s = s.replace(p, "…");
  return s
    .replace(/\s*[…,;:-]\s*(?=[…,;:-])/g, " ") // collapse repeated redactions
    .replace(/\s{2,}/g, " ")
    .replace(/[\s(]*(?:—|,|;)?[\s)*]*$/g, "")
    .trim();
}

// --- Note generation ---------------------------------------------------------

// Humanize a conventional-commit subject: "feat(desktop): add banner" ->
// { group: "Desktop", text: "Add banner" }. No invention — only the real
// subject text, de-prefixed and capitalized.
function humanizeCommit(message: string): { group: string; text: string } {
  const m = message.match(/^(feat|fix|chore|docs|refactor|perf|test|build|ci|style|revert)(\(([^)]*)\))?(!)?:\s*(.*)$/);
  if (!m) return { group: "General", text: message };
  const scope = m[3];
  const raw = m[5].trim();
  const text = raw.charAt(0).toUpperCase() + raw.slice(1);
  const ACRONYMS: Record<string, string> = { ai: "AI", ui: "UI", ci: "CI", api: "API" };
  if (!scope) return { group: "General", text };
  const base = scope.split(/[/|,]/)[0].replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { group: ACRONYMS[base.toLowerCase()] ?? base, text };
}

// Compose professional, public-safe release notes from real commits.
function generateNotes(data: WhatsNew, version: string): string {
  // Public-safe bullets: internal-topic commits are dropped, the rest are
  // redacted (emails/tokens/paths/URLs/identities) before display.
  const safeCommits = data.commits
    .filter((c) => !INTERNAL_MESSAGE.test(c.message))
    .map((c) => ({ ...c, ...humanizeCommit(c.message) }))
    .map((c) => ({ ...c, text: sanitizeLine(c.text) }))
    .filter((c) => c.text.replace(/[^a-zA-Z0-9]/g, "").length >= 4);

  const feats = safeCommits.filter((c) => c.type === "feat");
  const fixes = safeCommits.filter((c) => c.type === "fix");
  const chores = safeCommits.filter((c) => c.type === "other");
  const breaking = safeCommits.filter((c) => c.breaking);

  const lines: string[] = [];
  lines.push(`# Noska Desktop v${version}`);
  lines.push("");
  if (data.counts.total > 0) {
    const summary = breaking.length > 0
      ? `A significant release with major changes, ${feats.length} new feature${feats.length === 1 ? "" : "s"} and ${fixes.length} improvement${fixes.length === 1 ? "" : "s"}.`
      : feats.length > 0
        ? `A feature release bringing ${feats.length} new capabilit${feats.length === 1 ? "y" : "ies"} and ${fixes.length} improvement${fixes.length === 1 ? "" : "s"}.`
        : `A maintenance release focused on ${fixes.length} fix${fixes.length === 1 ? "" : "es"} and stability.`;
    lines.push(`> ${summary} Existing installs update automatically.`);
    lines.push("");
  }

  const section = (title: string, emoji: string, items: typeof safeCommits) => {
    if (items.length === 0) return;
    lines.push(`## ${emoji} ${title}`);
    lines.push("");
    // Newest first within each section, grouped by area for readability.
    const byGroup = new Map<string, typeof safeCommits>();
    for (const c of items) {
      const arr = byGroup.get(c.group) ?? [];
      arr.push(c);
      byGroup.set(c.group, arr);
    }
    for (const [group, itemsInGroup] of [...byGroup.entries()].sort((a, b) => b[1].length - a[1].length)) {
      for (const item of itemsInGroup) {
        lines.push(`- ${group === "General" ? "" : `**${group}** — `}${item.text}`);
      }
    }
    lines.push("");
  };

  section("New", "✨", feats);
  section("Fixed", "🛠", fixes);
  section("Maintenance", "🧹", chores);

  if (breaking.length > 0) {
    lines.push(`## ⚠️ Breaking changes`);
    lines.push("");
    for (const c of breaking) lines.push(`- ${c.text}`);
    lines.push("");
  }

  lines.push(`## 📦 Install & Update`);
  lines.push("");
  lines.push("- **Already using Noska?** The app updates itself in the background — restart when prompted.");
  lines.push("- **Fresh install:** grab the latest installer from the [releases page](https://github.com/shrikrishna-lab/noska-desktop-releases/releases/latest) (Windows, macOS — Apple Silicon & Intel, Linux).");
  lines.push("");

  if (data.baseTag) {
    lines.push("---");
    lines.push(`_Full changelog: ${data.counts.total} commit${data.counts.total === 1 ? "" : "s"} since \`${data.baseTag}\`._`);
  }
  return lines.join("\n").trim();
}

function NextReleaseCard({ data }: { data: WhatsNew }) {
  const groups = [
    { key: "feat", label: "Features", icon: Sparkles, color: "text-violet-500", commits: data.commits.filter((c) => c.type === "feat") },
    { key: "fix", label: "Fixes", icon: Zap, color: "text-emerald-500", commits: data.commits.filter((c) => c.type === "fix") },
    { key: "other", label: "Chores & Other", icon: Wrench, color: "text-muted-foreground", commits: data.commits.filter((c) => c.type === "other") },
  ];
  const breaking = data.commits.filter((c) => c.breaking);
  const KIND_BADGE: Record<string, string> = {
    major: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    minor: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
    patch: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">Next Release — What's in it</CardTitle>
        {data.suggested ? (
          <div className="flex items-center gap-2">
            <Badge className={KIND_BADGE[data.suggested.kind]}>{data.suggested.kind} bump</Badge>
            <span className="font-mono text-sm font-semibold">v{data.suggested.version}</span>
          </div>
        ) : (
          <Badge variant="secondary">nothing to release</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {data.baseTag
            ? `${data.counts.total} commit${data.counts.total === 1 ? "" : "s"} since ${data.baseTag} (${data.counts.breaking} breaking · ${data.counts.feat} feat · ${data.counts.fix} fix · ${data.counts.other} other)${data.suggested ? ` — ${data.suggested.reason}` : ""}`
            : "No desktop tags yet — this will be the first tagged release."}
        </p>

        {breaking.length > 0 && (
          <div className="rounded-lg border border-border border-l-4 border-l-red-500 bg-red-500/5 px-3 py-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
              <AlertOctagon className="h-3.5 w-3.5" /> Breaking changes ({breaking.length})
            </p>
            {breaking.map((c) => (
              <div key={c.sha} className="mt-1 flex items-baseline gap-2 text-xs">
                <span className="shrink-0 font-mono text-muted-foreground">{c.sha}</span>
                <span className="min-w-0 flex-1 truncate text-foreground">{c.message}</span>
              </div>
            ))}
          </div>
        )}

        {data.counts.total === 0 ? (
          <p className="text-sm text-muted-foreground">Every commit is already part of {data.baseTag ?? "a tagged release"}.</p>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => g.commits.length > 0 && (
              <div key={g.key}>
                <p className={`mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${g.color}`}>
                  <g.icon className="h-3 w-3" /> {g.label} ({g.commits.length})
                </p>
                <div className="space-y-1">
                  {g.commits.slice(0, 8).map((c) => (
                    <div key={c.sha} className="flex items-baseline gap-2 text-xs">
                      <a
                        href={`https://github.com/shrikrishna-lab/noska/commit/${c.sha}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 font-mono text-muted-foreground hover:text-foreground"
                      >
                        {c.sha}
                      </a>
                      <span className="min-w-0 flex-1 truncate">{c.message}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{c.author}</span>
                    </div>
                  ))}
                  {g.commits.length > 8 && (
                    <p className="text-[10px] text-muted-foreground">+{g.commits.length - 8} more…</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {data.suggestions.length > 0 && (
          <div className="space-y-1.5 border-t pt-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Lightbulb className="h-3 w-3" /> Suggestions
            </p>
            {data.suggestions.map((s, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 rounded-lg border border-border px-3 py-2.5 ${
                  s.level === "warn"
                    ? "border-l-4 border-l-amber-500 bg-amber-500/5"
                    : "border-l-4 border-l-emerald-500 bg-muted/30"
                }`}
              >
                {s.level === "warn"
                  ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-snug text-foreground">{s.title}</p>
                  {s.detail && (
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                      {s.detail}{" "}
                      {s.url && (
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 whitespace-nowrap font-medium text-primary hover:underline">
                          open <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
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

  const { data: whatsnew } = useQuery({
    queryKey: ["admin", "releases", "whatsnew"],
    queryFn: releaseApi.whatsnew,
    refetchInterval: 60000,
    retry: 1,
  });

  const trigger = useMutation({
    mutationFn: () => releaseApi.trigger(
      version.trim(),
      // Real generated notes beat the function's generic fallback.
      notes.trim() || (whatsnew && whatsnew.counts.total > 0 ? generateNotes(whatsnew, suggested) : ""),
    ),
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
  // Prefer the commit-derived suggestion (major/minor/patch from real commit
  // types); fall back to a plain patch bump of the current version.
  const recommended = whatsnew?.suggested?.version
    ?? (currentVersion ? bumpVersion(currentVersion, "patch") : "");
  const recommendedReason = whatsnew?.suggested?.reason ?? null;
  const suggested = version.trim() || recommended;

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
                  placeholder={recommended || "1.0.12"}
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                />
                {recommended && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setVersion(recommended)}
                  >
                    {recommended}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {recommendedReason
                  ? `Suggested: ${recommended} — ${recommendedReason}.`
                  : "Semver, must be greater than the current version."}
              </p>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="release-notes">Release notes</Label>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-40"
                  disabled={!whatsnew || whatsnew.counts.total === 0}
                  onClick={() => whatsnew && setNotes(generateNotes(whatsnew, suggested || ""))}
                >
                  <Sparkles className="h-3 w-3" />
                  Auto-generate from commits
                </button>
              </div>
              <Textarea
                id="release-notes"
                rows={7}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={whatsnew && whatsnew.counts.total > 0
                  ? "Write your own, or auto-generate from the commits below the fold…"
                  : "What's new in this release…"}
              />
              <p className="text-xs text-muted-foreground">
                {notes.trim()
                  ? "Your notes will be used for the draft release."
                  : whatsnew && whatsnew.counts.total > 0
                    ? "Left empty: notes are auto-generated from the real commits since " + (whatsnew.baseTag ?? "the last tag") + "."
                    : "Left empty: a generic default is used when there are no new commits."}
              </p>
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
          {whatsnew && <NextReleaseCard data={whatsnew} />}

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
