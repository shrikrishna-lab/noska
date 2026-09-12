import React, { useState, useEffect } from "react";
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
  Zap, Wrench, AlertOctagon, Lightbulb, Trash2, RotateCcw, Globe, Eye, X, CheckCircle2 as PassIcon, AlertTriangle as WarnIcon, XCircle as FailIcon, HelpCircle as UnknownIcon, ShieldCheck as PreIcon,
  GitBranch as GitBranchIcon,
  Smartphone, Copy, Link2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { releaseApi } from "@/lib/monitoring/api";
import { MarkdownBody } from "@/components/ui/MarkdownLite";
import type { GitHubRun, GitHubRelease, WhatsNew, PreflightCheck } from "@/lib/monitoring/api";

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
  /\b(?:edge function|gateway|admin panel|admin api|oauth config)\b/gi, // internal plumbing terms
];

// A commit is excluded from public notes when it is about internals:
// secrets/credentials, the admin panel, release/build engineering, CI/CD,
// backend infrastructure, or vendor tooling. Users don't act on these and
// they leak how the product is operated.
const INTERNAL_COMMIT =
  /\b(?:secret|credential|password|api[\s-]?key|token|env var|environment variable|\.env|service role|signing|webhook secret|admin|tauri(?:-action)?|workflow|github actions?|pipeline|infra(?:structure)?|deploy(?:ment|ed|ing|s)?|edge function|gateway|backend|server-?side|monitoring|sentry|posthog|supabase|vercel|notariz\w*|draft release|staging|jwt)\b/i;
// Infra scopes (e.g. "fix(release):", "chore(ci):") are internal by definition.
const INTERNAL_SCOPE = /^\w+\((?:release|ci|cd|build|infra|deploy|ops|admin|internal)\)/i;

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
    .filter((c) => !INTERNAL_COMMIT.test(c.message) && !INTERNAL_SCOPE.test(c.message))
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
    // Group by area, then merge each area's related commits into one story
    // bullet — several small commits for the same feature read better as a
    // single coherent line. Subjects stay verbatim; nothing is invented.
    const byGroup = new Map<string, typeof safeCommits>();
    for (const c of items) {
      const arr = byGroup.get(c.group) ?? [];
      arr.push(c);
      byGroup.set(c.group, arr);
    }
    const ordered = [...byGroup.entries()].sort((a, b) => b[1].length - a[1].length);
    for (const [group, itemsInGroup] of ordered) {
      const seen = new Set<string>();
      const parts: string[] = [];
      for (const item of itemsInGroup) {
        const normalized = item.text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        if (seen.has(normalized)) continue; // near-duplicate rewording
        seen.add(normalized);
        parts.push(item.text.charAt(0).toLowerCase() + item.text.slice(1));
      }
      const body = parts.slice(0, 4).join("; ");
      const extra = parts.length > 4 ? ` (+${parts.length - 4} more)` : "";
      lines.push(`- ${group === "General" ? "" : `**${group}** — `}${body}${extra}`);
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
    const scope = data.truncated
      ? `${data.totalCommits} commits since \`${data.baseTag}\` (highlights from the ${data.counts.total} most recent)`
      : `${data.counts.total} commit${data.counts.total === 1 ? "" : "s"} since \`${data.baseTag}\``;
    lines.push(`_Full changelog: ${scope}._`);
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
            ? `${data.truncated ? `${data.totalCommits} commits since ${data.baseTag} — showing the ${data.counts.total} most recent` : `${data.counts.total} commit${data.counts.total === 1 ? "" : "s"} since ${data.baseTag}`} (${data.counts.breaking} breaking · ${data.counts.feat} feat · ${data.counts.fix} fix · ${data.counts.other} other)${data.suggested ? ` — ${data.suggested.reason}` : ""}`
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

        {data.upcoming && data.upcoming.length > 0 && (
          <div className="space-y-1.5 border-t pt-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <GitBranchIcon className="h-3 w-3" /> Upcoming work — not in this release
            </p>
            {data.upcoming.map((b) => (
              <div key={b.name} className="flex items-start gap-2.5 rounded-lg border border-border border-l-4 border-l-blue-400/60 bg-muted/30 px-3 py-2">
                <GitBranchIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground">
                    {b.name}
                    <span className="ml-1.5 font-normal text-muted-foreground">{b.ahead} commit{b.ahead === 1 ? "" : "s"} ahead of {data.branch}</span>
                  </p>
                  {b.tip.message && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {b.tip.message} <span className="text-[10px]">· {b.tip.author}</span>
                    </p>
                  )}
                </div>
                <a
                  href={`https://github.com/shrikrishna-lab/noska/compare/${data.branch}...${encodeURIComponent(b.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[11px] font-medium text-primary hover:underline"
                >
                  compare
                </a>
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

const CHECK_STYLE: Record<string, { icon: typeof PassIcon; cls: string }> = {
  pass: { icon: PassIcon, cls: "text-emerald-500" },
  warn: { icon: WarnIcon, cls: "text-amber-500" },
  fail: { icon: FailIcon, cls: "text-red-500" },
  unknown: { icon: UnknownIcon, cls: "text-muted-foreground" },
};

// Character-by-character spring text (idle → cycling steps → results).
function AnimatedText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className} style={{ display: "inline-flex" }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={text} style={{ display: "inline-flex", willChange: "transform" }}>
          {text.split("").map((char, i) => (
            <motion.span
              key={`${text}-${i}`}
              initial={{ y: 8, opacity: 0, scale: 0.6, filter: "blur(2px)" }}
              animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ y: -8, opacity: 0, scale: 0.6, filter: "blur(2px)" }}
              transition={{ type: "spring", stiffness: 240, damping: 16, delay: i * 0.012 }}
              style={{ display: "inline-block", whiteSpace: char === " " ? "pre" : undefined }}
            >
              {char}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const PREFLIGHT_STEPS = [
  { label: "Validating version files", icon: FileCode2 },
  { label: "Inspecting Tauri config", icon: PreIcon },
  { label: "Checking dependencies & lockfiles", icon: PackageOpen },
  { label: "Verifying icon assets", icon: Sparkles },
  { label: "Probing updater manifest", icon: RefreshCw },
  { label: "Scanning mobile platform", icon: Zap },
  { label: "Pinging web deployment", icon: Globe },
  { label: "Reading GitHub state", icon: GitBranchIcon },
  { label: "Deep-checking dependency versions", icon: PackageOpen },
  { label: "Verifying updater signatures", icon: PreIcon },
];

function PreflightCard({
  report, isLoading, isError, onRerun, rerunning,
}: {
  report?: PreflightReportLike;
  isLoading: boolean;
  isError: boolean;
  onRerun: () => void;
  rerunning: boolean;
}) {
  // Full running animation only for the initial load — background
  // auto-refresh keeps results on screen (spinner lives on the button).
  const running = isLoading || (!report && !isError && !rerunning) || (rerunning && !report);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setStep((prev) => (prev + 1) % PREFLIGHT_STEPS.length), 1100);
    return () => clearInterval(interval);
  }, [running]);

  const summary = report?.summary;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <PreIcon className="h-4 w-4" />
          <AnimatedText text={running ? "Pre-flight running" : "Pre-flight checks"} />
        </CardTitle>
        <div className="flex items-center gap-2">
          {summary && !running && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="flex items-center gap-1.5 text-[10px] font-semibold"
            >
              {summary.fail > 0 && <span className="flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 font-bold text-white shadow-sm"><FailIcon className="h-3 w-3" /> {summary.fail} failing</span>}
              {summary.warn > 0 && <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 font-bold text-white shadow-sm"><WarnIcon className="h-3 w-3" /> {summary.warn} warnings</span>}
              {summary.unknown > 0 && <span className="flex items-center gap-1 rounded-full bg-zinc-500 px-2.5 py-1 font-semibold text-white shadow-sm"><UnknownIcon className="h-3 w-3" /> {summary.unknown}</span>}
              {summary.fail === 0 && summary.warn === 0 && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 font-bold text-white shadow-sm"><PassIcon className="h-3 w-3" /> all clear</span>
              )}
            </motion.div>
          )}
          <Button variant="ghost" size="sm" onClick={onRerun} disabled={running}>
            <RefreshCw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait" initial={false}>
          {running || isError || !report ? (
            <motion.div
              key="running"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-border px-4 py-3.5"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, scale: 0, rotate: -30, filter: "blur(3px)" }}
                    animate={{ opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0, rotate: 30, filter: "blur(3px)" }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  >
                    {React.createElement(PREFLIGHT_STEPS[step].icon, { className: "h-5 w-5 text-primary" })}
                  </motion.div>
                </AnimatePresence>
                <AnimatedText
                  text={isError ? "Pre-flight checks unavailable" : `${PREFLIGHT_STEPS[step].label}…`}
                  className="text-sm font-semibold text-foreground"
                />
              </div>
              <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                {isError ? "error" : "live"}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-2"
            >
              {report.checks.map((c, i) => {
                const meta = CHECK_STYLE[c.status] ?? CHECK_STYLE.unknown;
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -14, filter: "blur(2px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    transition={{ type: "spring", stiffness: 240, damping: 22, delay: i * 0.045 }}
                    className="flex items-start gap-2.5"
                  >
                    <meta.icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.cls}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold leading-snug text-foreground">{c.label}</p>
                      <p className="text-[11px] leading-snug text-muted-foreground">{c.detail}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

type PreflightReportLike = {
  branch: string;
  checks: PreflightCheck[];
  summary: { pass: number; warn: number; fail: number; unknown: number };
};

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

function ReleaseRow({ release, onDeleteDraft, deleting, onRetry, retrying }: { release: GitHubRelease; onDeleteDraft?: (tag: string) => void; deleting?: boolean; onRetry?: (tag: string, notes?: string) => void; retrying?: boolean }) {
  const installers = release.assets.filter((a) => !a.name.endsWith(".json") && !a.name.endsWith(".sig"));
  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
      <a
        href={release.html_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 flex-1 items-center gap-3"
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
      <div className="flex shrink-0 items-center gap-0.5">
        {onRetry && (
          <button
            type="button"
            title="Rebuild & re-release: move this tag to the current master (picking up fixes) and re-run the build"
            disabled={retrying}
            onClick={() => onRetry(release.tag_name, release.body ?? undefined)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-blue-500/10 hover:text-blue-500 disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
        {release.draft && onDeleteDraft && (
          <button
            type="button"
            title="Delete this draft release (staged leftovers)"
            disabled={deleting}
            onClick={() => onDeleteDraft(release.tag_name)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function ReleasesPage() {
  const qc = useQueryClient();
  const [platform, setPlatform] = useState<"desktop" | "mobile">("desktop");
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
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

  const {
    data: preflight,
    isLoading: preflightLoading,
    isError: preflightError,
    refetch: refetchPreflight,
    isRefetching: preflightRefetching,
  } = useQuery({
    queryKey: ["admin", "releases", "preflight"],
    queryFn: releaseApi.preflight,
    refetchInterval: 120000,
    retry: 1,
  });

  const trigger = useMutation({
    mutationFn: () => {
      // If auto-generated notes carry a version header that no longer matches
      // the version being shipped (user edited the version after generating),
      // correct the header so the published release is never mislabeled.
      let finalNotes = notes.trim();
      if (finalNotes && suggested) {
        finalNotes = finalNotes.replace(/# Noska Desktop v[^\s]+/, `# Noska Desktop v${suggested}`);
      }
      // Real generated notes beat the function's generic fallback.
      if (!finalNotes && whatsnew && whatsnew.counts.total > 0) {
        finalNotes = generateNotes(whatsnew, suggested);
      }
      return releaseApi.trigger(version.trim(), finalNotes);
    },
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

  const retryRelease = useMutation({
    mutationFn: (input: { tag: string; notes?: string }) => releaseApi.retry(input.tag, input.notes),
    onSuccess: (r) => {
      toast.success(`${r.tag} rebuild started from ${r.headSha} (was ${r.previousSha}) — watch the run below`);
      qc.invalidateQueries({ queryKey: ["admin", "releases"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message.slice(0, 200) : "Rebuild failed to start"),
  });

  const deleteDraft = useMutation({
    mutationFn: (tag: string) => releaseApi.deleteDraft(tag),
    onSuccess: (_r, tag) => {
      toast.success(`Draft ${tag} deleted`);
      qc.invalidateQueries({ queryKey: ["admin", "releases"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message.slice(0, 200) : "Delete failed"),
  });

  const currentVersion = status?.currentVersion ?? null;
  // Prefer the commit-derived suggestion (major/minor/patch from real commit
  // types); fall back to a plain patch bump of the current version.
  const recommended = whatsnew?.suggested?.version
    ?? (currentVersion ? bumpVersion(currentVersion, "patch") : "");
  const recommendedReason = whatsnew?.suggested?.reason ?? null;
  const suggested = version.trim() || recommended;
  // The exact notes that would ship right now — same logic as the trigger.
  const shipNotes = (() => {
    let n = notes.trim();
    if (n && suggested) n = n.replace(/# Noska Desktop v[^\s]+/, `# Noska Desktop v${suggested}`);
    if (!n && whatsnew && whatsnew.counts.total > 0) n = generateNotes(whatsnew, suggested);
    return n;
  })();

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

      {/* Platform tabs — desktop releases vs native mobile builds */}
      <div className="mb-6 inline-flex rounded-lg border bg-muted/30 p-1" role="tablist" aria-label="Release platform">
        {([
          ["desktop", Rocket, "Desktop"],
          ["mobile", Smartphone, "Mobile"],
        ] as const).map(([key, Icon, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={platform === key}
            onClick={() => setPlatform(key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
              platform === key
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {platform === "mobile" ? (
        <MobileReleasesPanel />
      ) : (
      <>
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
                  placeholder={recommended || "x.y.z — shows the suggested version once loaded"}
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
                  disabled={generating || !whatsnew || whatsnew.counts.total === 0}
                  onClick={async () => {
                    // Always pull fresh commit data from GitHub first — the
                    // cached query can lag up to a minute behind a new push.
                    setGenerating(true);
                    try {
                      const fresh = await qc.fetchQuery({
                        queryKey: ["admin", "releases", "whatsnew"],
                        queryFn: releaseApi.whatsnew,
                        staleTime: 0,
                      });
                      if (fresh.counts.total === 0) {
                        toast.error("No commits since the last tag — nothing to generate.");
                        return;
                      }
                      setNotes(generateNotes(fresh, suggested || ""));
                      toast.success(`Generated from ${fresh.truncated ? `all ${fresh.totalCommits} commits (highlights of latest ${fresh.counts.total})` : `${fresh.counts.total} commits`} — newest: ${fresh.commits[0]?.sha ?? "HEAD"}`);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message.slice(0, 200) : "Refresh failed");
                    } finally {
                      setGenerating(false);
                    }
                  }}
                >
                  {generating
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Sparkles className="h-3 w-3" />}
                  {generating ? "Fetching latest…" : "Auto-generate from commits"}
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
                    ? `Left empty: auto-generated from commits since ${whatsnew.baseTag ?? "the last tag"} — newest included: ${whatsnew.commits[0]?.sha ?? "…"}${whatsnew.commits[0]?.date ? ` (${new Date(whatsnew.commits[0].date).toLocaleString()})` : ""}. Just pushed? Generate re-fetches GitHub first.`
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
            <Button
              variant="outline"
              className="w-full"
              disabled={!suggested || !shipNotes}
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview what users see after updating
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
          <PreflightCard
            report={preflight}
            isLoading={preflightLoading}
            isError={preflightError}
            onRerun={() => refetchPreflight()}
            rerunning={preflightRefetching}
          />
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
                  {releases.slice(0, 8).map((release) => (
                    <ReleaseRow
                      key={release.id}
                      release={release}
                      deleting={deleteDraft.isPending}
                      retrying={retryRelease.isPending}
                      onRetry={(tag, notes) => {
                        const published = !release.draft;
                        if (window.confirm(
                          published
                            ? `Rebuild & re-release ${tag}? The tag moves to current master and the PUBLIC installers for this version are overwritten once the build completes.`
                            : `Rebuild ${tag}? The tag moves to current master and the build runs again.`,
                        )) {
                          retryRelease.mutate({ tag, notes });
                        }
                      }}
                      onDeleteDraft={(tag) => {
                        if (window.confirm(`Delete draft release ${tag}? Its staged installers are removed from the private repo.`)) {
                          deleteDraft.mutate(tag);
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── User-view preview: the post-update What's New modal ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            Preview — this exact modal appears once for every user after they update to desktop-v{suggested}. Dismissal is remembered per version.
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Rocket className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold leading-tight">Noska Desktop v{suggested}</p>
                  <p className="text-[11px] text-muted-foreground">Release notes · v{suggested}</p>
                </div>
              </div>
              <X className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="max-h-[45vh] overflow-y-auto px-4 py-3 text-sm text-foreground">
              {shipNotes
                ? <MarkdownBody body={shipNotes} className="space-y-2 text-[13px] leading-relaxed" />
                : <p className="text-xs text-muted-foreground">No notes yet — generate or write them to see the preview.</p>}
            </div>
            <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                Full release on GitHub <ExternalLink className="h-3 w-3" />
              </span>
              <span className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">
                <Sparkles className="h-3 w-3" /> Got it
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
      </>
      )}
    </div>
  );
}

/* ── Mobile (iOS/Android) builds panel ─────────────────────────────────── */

function MobileAssetRow({ asset }: { asset: { name: string; size: number; browser_download_url: string } }) {
  const mb = asset.size > 0 ? `${(asset.size / (1024 * 1024)).toFixed(1)} MB` : null;
  const kind = /\.apk$/i.test(asset.name)
    ? { label: "APK", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" }
    : /\.aab$/i.test(asset.name)
      ? { label: "AAB", cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" }
      : /\.ipa$/i.test(asset.name)
        ? { label: "IPA", cls: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400" }
        : { label: "File", cls: "" };
  return (
    <a
      href={asset.browser_download_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs transition-colors hover:bg-muted/50"
    >
      <Badge className={kind.cls}>{kind.label}</Badge>
      <span className="min-w-0 flex-1 truncate font-mono" title={asset.name}>{asset.name}</span>
      {mb && <span className="shrink-0 text-muted-foreground">{mb}</span>}
      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
    </a>
  );
}

/** Build + QA utility: composes noska:// deep links and their web fallbacks. */
function DeepLinkBuilder() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [pageId, setPageId] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const deepLink = pageId.trim()
    ? `noska://workspace/${workspaceId.trim() || "WORKSPACE_ID"}/page/${pageId.trim()}`
    : workspaceId.trim()
      ? `noska://workspace/${workspaceId.trim()}`
      : "";
  const webFallback = pageId.trim()
    ? `https://www.noska.me/link/workspace/${workspaceId.trim() || "WORKSPACE_ID"}/page/${pageId.trim()}`
    : workspaceId.trim()
      ? `https://www.noska.me/link/workspace/${workspaceId.trim()}`
      : "";

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed — select the text manually");
    }
  };

  const input = "w-full rounded-lg border bg-transparent px-3 py-2 font-mono text-xs outline-none focus:ring-1 focus:ring-primary";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Link2 className="h-4 w-4" /> Deep-link builder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Compose <span className="font-mono">noska://</span> links for mobile QA — the installed app opens
          straight to the content; the web fallback works when it isn't installed.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            className={input}
            placeholder="workspace id (UUID)"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
          />
          <Input
            className={input}
            placeholder="page id (optional)"
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
          />
        </div>
        {deepLink && (
          <div className="space-y-1.5">
            {[
              ["App link", deepLink],
              ["Web fallback", webFallback],
            ].map(([label, url]) => (
              <div key={label} className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
                <code className="min-w-0 flex-1 truncate text-xs">{url}</code>
                <Button variant="ghost" size="sm" className="h-7 shrink-0 px-2" onClick={() => void copy(label, url)}>
                  {copied === label ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MobileReleasesPanel() {
  const qc = useQueryClient();
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: mobile, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "releases", "mobile-status"],
    queryFn: releaseApi.mobileStatus,
    refetchInterval: 10000,
    retry: 1,
  });

  const trigger = useMutation({
    mutationFn: () => releaseApi.mobileTrigger(version.trim(), notes.trim() || undefined),
    onSuccess: (result) => {
      toast.success(`Mobile build ${result.tag} triggered — iOS + Android builds started`);
      setConfirmOpen(false);
      setNotes("");
      qc.invalidateQueries({ queryKey: ["admin", "releases", "mobile-status"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message.slice(0, 300) : "Mobile build trigger failed");
    },
  });

  if (isError) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return (
      <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-6 text-center dark:border-yellow-700 dark:bg-yellow-900/20">
        <AlertTriangle className="mx-auto h-8 w-8 text-yellow-600" />
        <h3 className="mt-2 text-sm font-semibold">Mobile builds unavailable</h3>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">{msg.slice(0, 250)}</p>
      </div>
    );
  }

  if (isLoading || !mobile) {
    return <LoadingState count={5} />;
  }

  const activeRun = mobile.runs.find((r) => r.status === "in_progress" || r.status === "queued");
  const pipelineReady = mobile.workflowOnBranch && mobile.androidProject === "committed";
  const canTrigger = Boolean(mobile.currentVersion) && pipelineReady;

  return (
    <div className="space-y-6">
      {activeRun && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3"
        >
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">Mobile build in progress — {activeRun.head_branch ?? "manual"}</p>
            <p className="text-xs text-muted-foreground">
              Started {new Date(activeRun.created_at).toLocaleString()} · Android (APK/AAB) + iOS build in one workflow
            </p>
          </div>
          <a href={activeRun.html_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">Watch run <ExternalLink className="ml-2 h-3 w-3" /></Button>
          </a>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Trigger + pipeline status */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Smartphone className="h-4 w-4" /> Trigger a mobile build
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="mobile-version">Version</Label>
                <div className="flex gap-2">
                  <Input
                    id="mobile-version"
                    placeholder={mobile.currentVersion ?? "x.y.z"}
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                  />
                  {mobile.currentVersion && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setVersion(mobile.currentVersion!)}
                    >
                      {mobile.currentVersion}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Mobile builds ship the repo <span className="font-medium">as-is</span> — the version must equal the
                  current repo version ({mobile.currentVersion ?? "?"}). Bump versions with a Desktop release first.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mobile-notes">Tag message (optional)</Label>
                <Textarea
                  id="mobile-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What this mobile build is for…"
                />
              </div>

              <Button
                className="w-full"
                disabled={!canTrigger || trigger.isPending}
                onClick={() => setConfirmOpen(true)}
              >
                {trigger.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                {trigger.isPending ? "Triggering…" : `Build mobile-v${version.trim() || mobile.currentVersion || "…"}`}
              </Button>
              {!pipelineReady && (
                <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {mobile.workflowOnBranch
                    ? "The native projects (src-tauri/gen) aren't committed to the branch yet — commit gen/android (and gen/apple once initialized) first."
                    : "build-mobile.yml isn't on the default branch yet."}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Tagging <span className="font-mono">mobile-v…</span> starts one workflow that builds Android
                (APK + AAB) and iOS, then stages a <span className="font-medium">draft pre-release</span> with the
                artifacts — publish it after review.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4" /> Mobile pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {([
                ["Workflow on branch", mobile.workflowOnBranch ? "build-mobile.yml found" : "build-mobile.yml missing", mobile.workflowOnBranch],
                ["Android project", mobile.androidProject === "committed" ? "gen/android committed" : "gen/android not committed", mobile.androidProject === "committed"],
                ["iOS project", mobile.iosProject === "committed" ? "gen/apple committed" : "gen/apple not committed (builds generate it; commit after first macOS init)", mobile.iosProject === "committed"],
                ["noska:// scheme", mobile.schemeRegistered === null ? "manifest not found" : mobile.schemeRegistered ? "registered in AndroidManifest" : "missing — run mobile:patch", mobile.schemeRegistered === true],
              ] as const).map(([label, detail, ok]) => (
                <div key={label} className="flex items-start gap-2.5 rounded-lg border bg-muted/20 px-3 py-2">
                  {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{detail}</p>
                  </div>
                </div>
              ))}
              {(mobile.storeLinks.appStore || mobile.storeLinks.googlePlay) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {mobile.storeLinks.appStore && (
                    <a href={mobile.storeLinks.appStore} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm"><Smartphone className="h-3.5 w-3.5" /> App Store <ExternalLink className="ml-1.5 h-3 w-3" /></Button>
                    </a>
                  )}
                  {mobile.storeLinks.googlePlay && (
                    <a href={mobile.storeLinks.googlePlay} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">Google Play <ExternalLink className="ml-1.5 h-3 w-3" /></Button>
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <DeepLinkBuilder />
        </div>

        {/* Runs + releases */}
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Mobile Workflow Runs (live)</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isRefetching}>
                <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {mobile.runs.length === 0 ? (
                <div className="px-4 pb-4">
                  <EmptyState
                    title={mobile.runsError ? "Runs unavailable" : "No mobile builds yet"}
                    description={mobile.runsError ?? "Trigger a mobile build to see runs here."}
                  />
                </div>
              ) : (
                <div className="divide-y">
                  {mobile.runs.slice(0, 8).map((run) => <RunRow key={run.id} run={run} />)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Mobile Releases</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {mobile.releases.length === 0 ? (
                <div className="px-4 pb-4">
                  <EmptyState
                    title="No mobile releases"
                    description="Draft mobile pre-releases (APK/AAB/IPA) appear here after a tagged build completes."
                  />
                </div>
              ) : (
                <div className="divide-y">
                  {mobile.releases.slice(0, 8).map((release) => (
                    <div key={release.id} className="px-4 py-3 transition-colors hover:bg-muted/30">
                      <a
                        href={release.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3"
                      >
                        <PackageOpen className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{release.name ?? release.tag_name}</span>
                            {release.draft && <Badge variant="secondary">Draft</Badge>}
                            {release.prerelease && <Badge variant="secondary">Pre-release</Badge>}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {new Date(release.published_at ?? release.created_at).toLocaleString()}
                          </p>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </a>
                      {release.assets.length > 0 && (
                        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                          {release.assets.map((a) => <MobileAssetRow key={a.name} asset={a} />)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Build mobile-v{version.trim() || mobile.currentVersion}?</DialogTitle>
            <DialogDescription>
              This tags <span className="font-mono">mobile-v{version.trim() || mobile.currentVersion}</span> on{" "}
              <span className="font-mono">{mobile.branch}</span> and starts the iOS + Android build workflow.
              Artifacts land in a draft pre-release for review.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            Desktop releases are unaffected — mobile builds share the app version but are shipped independently.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => trigger.mutate()} disabled={trigger.isPending}>
              {trigger.isPending ? "Triggering…" : "Confirm mobile build"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ReleasesPage;
