import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";
import {
  validateAdmin,
  requireRole,
  getAuthToken,
  handleCors,
  res,
  resError,
} from "../monitoring-utils/auth.ts";

// Desktop release trigger. Admins call `action: "trigger"` with a version and
// optional notes; this function bumps the three version files in a single
// commit (git data API), tags it `desktop-v{version}`, and the existing
// .github/workflows/release-desktop.yml does the rest (build/sign/draft
// release + auto-update manifest). `status`/`runs`/`releases` power the live
// UI. Requires GITHUB_TOKEN (fine-grained, contents read/write on the repo).

const REPO_OWNER = Deno.env.get("GITHUB_REPO_OWNER") ?? "shrikrishna-lab";
const REPO_NAME = Deno.env.get("GITHUB_REPO_NAME") ?? "noska";
const REPO = `${REPO_OWNER}/${REPO_NAME}`;
const WORKFLOW_FILE = "release-desktop.yml";
// Mobile builds (iOS/Android) run on their own workflow and mobile-v* tags.
const MOBILE_WORKFLOW_FILE = "build-mobile.yml";
const API = "https://api.github.com";

// Files that must stay version-synced for a desktop release.
const VERSION_FILES: Array<{ path: string; kind: "json" | "toml" }> = [
  { path: "package.json", kind: "json" },
  { path: "src-tauri/tauri.conf.json", kind: "json" },
  { path: "src-tauri/Cargo.toml", kind: "toml" },
];

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function ghHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
    "User-Agent": "noska-admin-release",
  };
}

async function gh<T>(
  token: string,
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<{ ok: boolean; status: number; data: T | null; raw: string }> {
  const r = await fetch(`${API}${path}`, {
    method: init?.method ?? "GET",
    headers: ghHeaders(token),
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await r.text();
  let data: T | null = null;
  try {
    data = text ? (JSON.parse(text) as T) : null;
  } catch {
    data = null;
  }
  return { ok: r.ok, status: r.status, data, raw: text.slice(0, 400) };
}

const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

// ── Minimal npm semver engine (real range verification, not string matching).
function vparts(v: string): number[] {
  return v.replace(/^[^\d]*/, "").split("-")[0].split(".").map((n) => parseInt(n, 10) || 0);
}
function cmpV(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d) return d;
  }
  return 0;
}
function satisfiesOne(v: number[], range: string): boolean | null {
  const r = range.trim();
  if (r === "" || r === "*" || r === "latest" || r === "x") return true;
  if (/^(workspace|file|link|github|git\+|https?):/.test(r) || r.startsWith("npm:")) return null;
  if (r.startsWith("^")) {
    const base = vparts(r.slice(1));
    return cmpV(v, base) >= 0 && cmpV(v, [base[0] + 1, 0, 0]) < 0;
  }
  if (r.startsWith("~")) {
    const base = vparts(r.slice(1));
    return cmpV(v, base) >= 0 && cmpV(v, [base[0], base[1] + 1, 0]) < 0;
  }
  if (r.startsWith(">=")) {
    const [lo, hi] = r.slice(2).split("<").map((x) => x.replace(/^=/, "").trim());
    if (hi !== undefined) return cmpV(v, vparts(lo)) >= 0 && cmpV(v, vparts(hi)) < 0;
    return cmpV(v, vparts(lo)) >= 0;
  }
  if (r.startsWith(">")) return cmpV(v, vparts(r.slice(1).trim())) > 0;
  const segs = r.split(".");
  if (segs.includes("x")) {
    const base = vparts(r.replace(/x/g, "0"));
    if (segs[1] === "x") return v[0] === base[0];
    return v[0] === base[0] && v[1] === base[1];
  }
  return cmpV(v, vparts(r)) === 0;
}
function semverSatisfies(version: string, range: string): boolean | null {
  const v = vparts(version);
  return range.trim().split(/\s{1,2}(?=[\^~><\d*])/).reduce<boolean | null>((acc, part) => {
    const one = satisfiesOne(v, part);
    if (acc === false || one === false) return false;
    if (one === null) return acc;
    return acc === null ? one : acc && one;
  }, null);
}

function compareVersions(a: string, b: string): number {
  const pa = a.split("-")[0].split(".").map(Number);
  const pb = b.split("-")[0].split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}

function bumpContent(content: string, kind: "json" | "toml", version: string): string {
  if (kind === "json") {
    return content.replace(/("version"\s*:\s*)"[^"]*"/, `$1"${version}"`);
  }
  // First `version = "…"` after [package] (src-tauri/Cargo.toml layout).
  return content.replace(/(version\s*=\s*)"[^"]*"/, `$1"${version}"`);
}

function extractVersion(content: string, kind: "json" | "toml"): string | null {
  const m = content.match(kind === "json" ? /"version"\s*:\s*"([^"]+)"/ : /version\s*=\s*"([^"]+)"/);
  return m?.[1] ?? null;
}

const CONVENTIONAL = /^(feat|fix|chore|docs|refactor|perf|test|build|ci|style|revert)(\([^)]*\))?(!)?:\s*/;

interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
  type: "feat" | "fix" | "other";
  rawType: string;
  breaking: boolean;
}

function analyzeCommit(sha: string, message: string, author: string, date: string): CommitInfo {
  const subject = message.split("\n")[0];
  const m = subject.match(CONVENTIONAL);
  const rawType = m?.[1] ?? "other";
  const breaking = m?.[3] === "!" || /BREAKING CHANGE:/m.test(message);
  return {
    sha,
    message: subject,
    author,
    date,
    type: rawType === "feat" ? "feat" : rawType === "fix" ? "fix" : "other",
    rawType,
    breaking,
  };
}

function bumpVersion(v: string, kind: "major" | "minor" | "patch"): string {
  const [ma, mi, pa] = v.split("-")[0].split(".").map(Number);
  if (kind === "major") return `${(ma || 0) + 1}.0.0`;
  if (kind === "minor") return `${ma || 0}.${(mi || 0) + 1}.0`;
  return `${ma || 0}.${mi || 0}.${(pa || 0) + 1}`;
}

async function readVersions(token: string, branch: string) {
  return Promise.all(
    VERSION_FILES.map(async (f) => {
      const r = await gh<{ content: string }>(token, `/repos/${REPO}/contents/${f.path}?ref=${branch}`);
      if (!r.ok) return { path: f.path, version: null, error: `HTTP ${r.status}` };
      const text = new TextDecoder().decode(
        Uint8Array.from(atob((r.data!.content ?? "").replace(/\n/g, "")), (c) => c.charCodeAt(0)),
      );
      const version = extractVersion(text, f.kind);
      return { path: f.path, version, error: version ? null : "version string not found" };
    }),
  );
}

// Newest desktop-v* tag by semver — the release-history anchor the version
// files can drift away from (e.g. releases cut from another machine).
async function latestDesktopTag(token: string): Promise<{ name: string | null; version: string | null }> {
  const tagsR = await gh<Array<{ name: string; commit: { sha: string } }>>(token, `/repos/${REPO}/tags?per_page=100`);
  if (!tagsR.ok) return { name: null, version: null };
  const desktopTags = (tagsR.data ?? [])
    .filter((t) => /^desktop-v\d/.test(t.name))
    .sort((a, b) => compareVersions(b.name.slice("desktop-v".length), a.name.slice("desktop-v".length)));
  const name = desktopTags[0]?.name ?? null;
  return { name, version: name ? name.slice("desktop-v".length) : null };
}

// Every commit between the last release tag and the branch tip — the full
// range a release covers, not just the newest commit.
async function collectCommitsSince(token: string, branch: string, baseTag: string) {
  const cmpR = await gh<{
    commits: Array<{ sha: string; commit: { message: string; author?: { name?: string }; committer?: { date?: string } } }>;
    total_commits: number;
  }>(token, `/repos/${REPO}/compare/${baseTag}...${branch}?per_page=250`);
  if (!cmpR.ok) throw new Error(`GitHub compare failed: ${cmpR.status} ${cmpR.raw}`);
  const totalCommits = Number(cmpR.data!.total_commits ?? 0);
  const commits = (cmpR.data!.commits ?? [])
    .map((c) => analyzeCommit(
      c.sha.slice(0, 7),
      c.commit.message,
      c.commit.author?.name ?? "unknown",
      c.commit.committer?.date ?? "",
    ))
    // GitHub's compare endpoint returns commits oldest-first; every consumer
    // (newest-commit indicator, notes ordering) expects newest-first.
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    // Version-bump commits made by previous releases are noise.
    .filter((c) => !/^chore\(release\):/i.test(c.message));
  return { commits, totalCommits, truncated: totalCommits > commits.length };
}

// --- Server-side release-note composition -----------------------------------
// Auto-generated notes land in the PUBLIC releases repo, so commit-derived
// text is scrubbed the same way the admin panel scrubs it: no emails, no
// token/key shapes, no env-var names, no URLs, no repo paths, no private
// identities, no internal plumbing topics.
const NOTES_REDACT: RegExp[] = [
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,
  /\b(?:ghp|gho|ghu|ghs|ghr|github_pat|sbp|sk|pk)[-_][A-Za-z0-9_]{8,}\b/g,
  /\b[A-Z][A-Z0-9_]{3,}_(?:KEY|TOKEN|SECRET|PASSWORD|DSN)\b/g,
  /\b(?:service_role|anon[\s-]?key|jwt|jwks|minisign|signing[\s-]?key)\b/gi,
  /\bhttps?:\/\/\S+/g,
  /\b[\w.-]+(?:\/[\w.-]+)+\.(?:ts|tsx|js|jsx|json|toml|sql|ya?ml|py|md)\b/g,
  /\bshrikrishna[\w-]*\b|\bnot-krrish\b|\bkrishnahandibag\w*\b/gi,
  /\b(?:edge function|gateway|admin panel|admin api|oauth config)\b/gi,
];
const NOTES_INTERNAL =
  /\b(?:secret|credential|password|api[\s-]?key|token|env var|environment variable|\.env|service role|signing|webhook secret|admin|tauri(?:-action)?|workflow|github actions?|pipeline|infra(?:structure)?|deploy(?:ment|ed|ing|s)?|edge function|gateway|backend|server-?side|monitoring|sentry|posthog|supabase|vercel|notariz\w*|draft release|staging|jwt)\b/i;
const NOTES_INTERNAL_SCOPE = /^\w+\((?:release|ci|cd|build|infra|deploy|ops|admin|internal)\)/i;

function sanitizeNotesLine(text: string): string {
  let s = text;
  for (const p of NOTES_REDACT) s = s.replace(p, "…");
  return s
    .replace(/\s*[…,;:-]\s*(?=[…,;:-])/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s(]*(?:—|,|;)?[\s)*]*$/g, "")
    .trim();
}

function humanizeNotesCommit(message: string): { group: string; text: string } {
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

// Full markdown notes from every commit since the base tag. Subjects stay
// verbatim (after redaction); nothing is invented.
function composeReleaseNotes(
  version: string,
  baseTag: string,
  totalCommits: number,
  truncated: boolean,
  commits: CommitInfo[],
): string {
  const safeCommits = commits
    .filter((c) => !NOTES_INTERNAL.test(c.message) && !NOTES_INTERNAL_SCOPE.test(c.message))
    .map((c) => ({ ...c, ...humanizeNotesCommit(c.message) }))
    .map((c) => ({ ...c, text: sanitizeNotesLine(c.text) }))
    .filter((c) => c.text.replace(/[^a-zA-Z0-9]/g, "").length >= 4);

  const feats = safeCommits.filter((c) => c.type === "feat");
  const fixes = safeCommits.filter((c) => c.type === "fix");
  const chores = safeCommits.filter((c) => c.type === "other");
  const breaking = safeCommits.filter((c) => c.breaking);

  const lines: string[] = [];
  lines.push(`# Noska Desktop v${version}`);
  lines.push("");
  if (commits.length > 0) {
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
        if (seen.has(normalized)) continue;
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

  if (baseTag) {
    lines.push("---");
    const scope = truncated
      ? `${totalCommits} commits since \`${baseTag}\` (highlights from the ${commits.length} most recent)`
      : `${commits.length} commit${commits.length === 1 ? "" : "s"} since \`${baseTag}\``;
    lines.push(`_Full changelog: ${scope}._`);
  }
  return lines.join("\n").trim();
}

interface GitHubRef {
  object: { sha: string };
}
interface GitHubCommit {
  tree: { sha: string };
}
interface GitHubRun {
  id: number;
  name: string | null;
  status: string | null;
  conclusion: string | null;
  head_branch: string | null;
  event: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
}
interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string | null;
  html_url: string;
  assets: Array<{ name: string; size: number; browser_download_url: string }>;
}

async function audit(admin: { id: string; name: string }, action: string, detail: Record<string, unknown>) {
  try {
    await supabase.from("admin_audit_log").insert({
      admin_id: admin.id,
      admin_name: admin.name,
      action,
      target_type: "release",
      target_name: String(detail.tag ?? ""),
      detail: JSON.stringify(detail),
    });
  } catch { /* audit is best-effort */ }
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const admin = await validateAdmin(await getAuthToken(req));
  if (!admin) return resError("Unauthorized: invalid or expired admin session", 401);

  const body: { action?: string; version?: string; notes?: string } = {};
  try { Object.assign(body, await req.json()); } catch { /* ignore */ }

  try {
    if (body.action === "status" || body.action === "runs" || body.action === "releases" || body.action === "whatsnew" || body.action === "preflight" || body.action === "mobile_status") {
      if (!requireRole(admin, "support")) return resError("Forbidden", 403);
    } else if (body.action === "delete_draft" || body.action === "delete_release" || body.action === "retry") {
      if (!requireRole(admin, "admin")) return resError("Forbidden: admin role required", 403);
    } else if (body.action === "trigger") {
      if (!requireRole(admin, "admin")) return resError("Forbidden: admin role required to ship releases", 403);
    } else if (body.action === "mobile_trigger") {
      if (!requireRole(admin, "admin")) return resError("Forbidden: admin role required to ship releases", 403);
    } else {
      return resError("Unknown action", 400);
    }

    const token = Deno.env.get("GITHUB_TOKEN");
    if (!token) return resError("GitHub not configured: set the GITHUB_TOKEN secret", 503);

    if (body.action === "preflight") {
      if (!requireRole(admin, "support")) return resError("Forbidden", 403);
      // Pre-flight intelligence: run every cheap-but-revealing check against
      // the repo BEFORE shipping, so failures surface as actionable reports
      // instead of a dead build 20 minutes later.
      type Check = { id: string; label: string; status: "pass" | "warn" | "fail" | "unknown"; detail: string };
      const checks: Check[] = [];
      const add = (id: string, label: string, status: Check["status"], detail: string) =>
        checks.push({ id, label, status, detail });

      const repoInfo = await gh<{ default_branch: string }>(token, `/repos/${REPO}`);
      if (!repoInfo.ok) return resError(`GitHub API ${repoInfo.status}: ${repoInfo.raw}`, 502);
      const branch = repoInfo.data!.default_branch;

      const raw = async (path: string): Promise<{ ok: boolean; status: number; text: string }> => {
        const r = await fetch(`https://raw.githubusercontent.com/${REPO}/${branch}/${path}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return { ok: r.ok, status: r.status, text: r.ok ? await r.text() : "" };
      };
      const fileExists = async (path: string): Promise<boolean> => {
        const r = await gh<unknown>(token, `/repos/${REPO}/contents/${path}?ref=${branch}`);
        return r.ok;
      };

      // 1. Version files: readable and in sync.
      const versions = await readVersions(token, branch);
      const versionSet = new Set(versions.map((v) => v.version));
      const versionsSynced = versions.every((v) => v.version) && versionSet.size === 1;
      const appVersion = versions.find((v) => v.path.includes("package.json"))?.version ?? null;
      const tauriVersion = versions.find((v) => v.path.includes("tauri.conf.json"))?.version ?? null;
      add(
        "versions",
        "Version files present and in sync",
        versionsSynced ? "pass" : "fail",
        versionsSynced
          ? `All three files at v${[...versionSet][0]}`
          : versions.map((v) => `${v.path}: ${v.version ?? v.error}`).join(" · "),
      );

      // 2. Tauri config: parseable + known-breaking patterns + updater wiring.
      const tauriRaw = await raw("src-tauri/tauri.conf.json");
      if (tauriRaw.ok) {
        try {
          const cfg = JSON.parse(tauriRaw.text) as {
            bundle?: { icon?: string[]; windows?: Array<{ nsis?: Record<string, unknown> }> };
            plugins?: { updater?: { endpoints?: string[]; pubkey?: string } };
          };
          const nsis = cfg.bundle?.windows?.[0]?.nsis ?? {};
          const badKeys = Object.keys(nsis).filter((k) => k === "sidebar" || k === "header");
          if (badKeys.length > 0) {
            add("tauri-config", "Tauri config (NSIS section)", "fail",
              `Invalid NSIS keys: ${badKeys.join(", ")} — Tauri 2 expects sidebarImage/headerImage. This is what failed the v1.0.12 build.`);
          } else {
            add("tauri-config", "Tauri config (NSIS section)", "pass", "No legacy NSIS keys detected");
          }
          const updaterEndpoint = cfg.plugins?.updater?.endpoints?.[0] ?? "";
          if (updaterEndpoint.includes("noska-desktop-releases")) {
            add("updater-wiring", "Auto-updater endpoint", "pass", updaterEndpoint);
          } else {
            add("updater-wiring", "Auto-updater endpoint", "warn",
              updaterEndpoint ? `Unexpected endpoint: ${updaterEndpoint}` : "No updater endpoint configured — auto-update will not work");
          }
          // 3. Icon assets referenced by the config must exist in the repo.
          const iconPaths = [
            ...(cfg.bundle?.icon ?? []),
            typeof nsis.installerIcon === "string" ? nsis.installerIcon : null,
            typeof nsis.sidebarImage === "string" ? nsis.sidebarImage : null,
            typeof nsis.headerImage === "string" ? nsis.headerImage : null,
          ].filter((p): p is string => typeof p === "string" && p.length > 0);
          const iconChecks = await Promise.all(iconPaths.map(async (p) => ({ p, ok: await fileExists(`src-tauri/${p}`) })));
          const missingIcons = iconChecks.filter((i) => !i.ok).map((i) => i.p);
          add("icons", "Icon assets referenced in config", missingIcons.length === 0 ? "pass" : "fail",
            missingIcons.length === 0 ? `${iconChecks.length} icons verified on ${branch}` : `Missing: ${missingIcons.join(", ")}`);
        } catch (e) {
          add("tauri-config", "Tauri config", "fail", `JSON parse error: ${e instanceof Error ? e.message : "invalid"}`);
        }
      } else {
        add("tauri-config", "Tauri config", "fail", `Cannot read src-tauri/tauri.conf.json (HTTP ${tauriRaw.status})`);
      }

      // 4. Dependency sync: every package.json dependency must exist in the
      //    lockfile — the classic "works locally, fails in CI" build killer.
      const pkgRaw = await raw("package.json");
      const lockRaw = await raw("package-lock.json");
      if (pkgRaw.ok && lockRaw.ok) {
        try {
          const pkg = JSON.parse(pkgRaw.text) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
          const lock = JSON.parse(lockRaw.text) as { packages?: Record<string, unknown> };
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          const missing: string[] = [];
          const unsatisfied: string[] = [];
          let verified = 0;
          for (const [d, range] of Object.entries(deps)) {
            const entry = lock.packages?.[`node_modules/${d}`] as { version?: string } | undefined;
            if (!entry?.version) { missing.push(d); continue; }
            const verdict = semverSatisfies(String(entry.version), String(range));
            if (verdict === false) unsatisfied.push(`${d}@${entry.version} (needs ${range})`);
            else verified += 1;
          }
          const problems = [
            missing.length ? `Missing from lockfile: ${missing.join(", ")}` : "",
            unsatisfied.length ? `Locked version outside declared range: ${unsatisfied.slice(0, 4).join("; ")}${unsatisfied.length > 4 ? ` +${unsatisfied.length - 4} more` : ""}` : "",
          ].filter(Boolean).join(" · ");
          add("deps", "Dependencies verified (presence + version)", problems ? "fail" : "pass",
            problems || `All ${verified} dependencies locked with versions inside their declared ranges`);
        } catch (e) {
          add("deps", "Dependency files", "fail", `Parse error: ${e instanceof Error ? e.message : "invalid"}`);
        }
      } else {
        add("deps", "Dependency files", "fail", `Cannot read package.json (${pkgRaw.status}) or package-lock.json (${lockRaw.status})`);
      }

      // 5. Cargo manifest sanity.
      const cargoRaw = await raw("src-tauri/Cargo.toml");
      const cargoVersionOk = cargoRaw.ok && /\bversion\s*=\s*"/.test(cargoRaw.text) && /\[package\]/.test(cargoRaw.text);
      add("cargo", "Cargo manifest", cargoVersionOk ? "pass" : "warn",
        cargoVersionOk ? "src-tauri/Cargo.toml parses and has a package version" : "Cargo.toml missing or malformed");

      // 6. Tag collision for the next version.
      const semverNums = (tauriVersion ?? "0.0.0").split(".").map(Number);
      const suggestedNext = `${semverNums[0]}.${semverNums[1]}.${semverNums[2] + 1}`;
      const tagTaken = await gh<unknown>(token, `/repos/${REPO}/git/ref/tags/desktop-v${suggestedNext}`);
      add("tag", "Next version tag available", tagTaken.ok ? "warn" : "pass",
        tagTaken.ok ? `desktop-v${suggestedNext} already exists — pick a higher version` : `desktop-v${suggestedNext} is free`);

      // 7. Public updater continuity + DEEP integrity: manifest version must
      //    match the published tag, every platform URL must exist as an
      //    asset WITH its .sig signature, and artifacts must download live.
      try {
        const mR = await fetch("https://github.com/shrikrishna-lab/noska-desktop-releases/releases/latest/download/latest.json");
        if (mR.ok) {
          const manifest = JSON.parse(await mR.text()) as {
            version?: string;
            platforms?: Record<string, { url?: string }>;
          };
          const publicVersion = manifest.version ?? "0.0.0";
          const behind = appVersion ? compareVersions(appVersion, publicVersion) <= 0 : false;
          add("manifest", "Public auto-update manifest", behind ? "warn" : "pass",
            `Public latest.json is at v${publicVersion}. ${behind ? "Users are already on or above the repo version — ship a higher one." : "Publishing will update everyone to the new version."}`);

          // Deep: cross-check the manifest against the release's real assets.
          const pubRel = await fetch("https://api.github.com/repos/shrikrishna-lab/noska-desktop-releases/releases/latest", {
            headers: { Accept: "application/vnd.github+json" },
          });
          if (pubRel.ok) {
            const rel = await pubRel.json() as { tag_name?: string; assets?: Array<{ name: string }> };
            const names = (rel.assets ?? []).map((a) => a.name);
            const problems: string[] = [];
            const tagVersion = (rel.tag_name ?? "").replace(/^desktop-v/, "");
            if (publicVersion !== tagVersion) problems.push(`manifest v${publicVersion} != release ${rel.tag_name}`);
            for (const [plat, p] of Object.entries(manifest.platforms ?? {})) {
              const base = (p.url ?? "").split("/").pop()?.split("?")[0] ?? "";
              if (base && !names.includes(base)) problems.push(`${plat}: ${base} not attached to the release`);
              if (base && !names.includes(`${base}.sig`)) problems.push(`${plat}: ${base}.sig signature missing`);
            }
            if (problems.length > 0) {
              add("updater-integrity", "Updater assets & signatures", "fail", problems.slice(0, 4).join(" · "));
            } else {
              // Liveness: actually download the first bytes of one artifact.
              const probeUrl = Object.values(manifest.platforms ?? {})[0]?.url;
              const probe = probeUrl ? await fetch(probeUrl, { headers: { Range: "bytes=0-64" } }) : null;
              add("updater-integrity", "Updater assets & signatures", probe && probe.ok ? "pass" : "warn",
                probe && probe.ok
                  ? `manifest v${publicVersion}: ${Object.keys(manifest.platforms ?? {}).length} platforms verified against release assets, downloads live`
                  : "manifest and assets consistent, but the artifact download probe failed");
            }
          }
        } else {
          add("manifest", "Public auto-update manifest", "warn", `latest.json returned HTTP ${mR.status} — first release or visibility issue`);
        }
      } catch {
        add("manifest", "Public auto-update manifest", "unknown", "Could not reach the public releases repo");
      }

      // 7b. Staging draft notes: tauri-action resets the draft body to its
      //     generic default when attaching artifacts. If that happened, warn —
      //     the real notes live in the release-notes.md asset.
      if (tauriVersion) {
        const draftsR = await gh<GitHubRelease[]>(token, `/repos/${REPO}/releases?per_page=10`);
        const staging = (draftsR.ok ? draftsR.data ?? [] : []).find(
          (d) => d.draft && d.tag_name === `desktop-v${tauriVersion}`,
        );
        if (staging) {
          const generic = (staging.body ?? "").startsWith("Installers for Windows");
          add("draft-notes", "Staging draft notes", generic ? "warn" : "pass",
            generic
              ? "Draft body was reset to the generic default by tauri-action — authored notes are preserved in the release-notes.md asset and restored on publish"
              : "Draft carries authored notes");
        }
      }

      // 8. Last build health (needs Actions read on GITHUB_TOKEN).
      const runsR = await gh<{ workflow_runs: GitHubRun[] }>(
        token,
        `/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=3`,
      );
      if (runsR.ok) {
        const last = (runsR.data!.workflow_runs ?? [])[0];
        if (!last) add("last-run", "Previous build", "pass", "No builds yet — this will be the first");
        else if (last.conclusion === "failure") {
          add("last-run", "Previous build", "warn", `Last build (${last.head_branch}) FAILED — fix or rebuild before shipping again`);
        } else {
          add("last-run", "Previous build", "pass", `Last build (${last.head_branch}) ${last.conclusion ?? last.status}`);
        }
      } else {
        add("last-run", "Previous build", "unknown",
          "Cannot read workflow runs — add Actions: Read to the GITHUB_TOKEN fine-grained permissions to enable build history");
      }

      // 9. Rust dependency lockfile sync — Cargo.toml deps must exist in
      //    Cargo.lock, same class of failure as npm lockfile drift.
      const cargoLockRaw = await raw("src-tauri/Cargo.lock");
      if (cargoLockRaw.ok && cargoRaw.ok) {
        const depSection = (cargoRaw.text.split("[dependencies]")[1] ?? "").split(/\n\[/)[0];
        const depNames = [...depSection.matchAll(/^([\w-]+)\s*=/gm)].map((m) => m[1]).filter((n) => n !== "name");
        const lockText = cargoLockRaw.text;
        const missingRust = depNames.filter((n) => !lockText.includes(`name = "${n}"`));
        add("cargo-lock", "Rust dependencies locked", missingRust.length === 0 ? "pass" : "fail",
          missingRust.length === 0
            ? `All ${depNames.length} Cargo dependencies present in Cargo.lock`
            : `In Cargo.toml but missing from Cargo.lock: ${missingRust.slice(0, 8).join(", ")}${missingRust.length > 8 ? ` +${missingRust.length - 8} more` : ""} — run cargo update locally and commit`);
      } else {
        add("cargo-lock", "Rust dependencies locked", cargoLockRaw.ok ? "pass" : "warn",
          cargoLockRaw.ok ? "Cargo.lock verified" : "src-tauri/Cargo.lock not found — first build will generate it");
      }

      // 10. Updater signing: without the minisign pubkey the desktop updater
      //     rejects every signed update silently.
      if (tauriRaw.ok) {
        try {
          const cfg = JSON.parse(tauriRaw.text) as { plugins?: { updater?: { pubkey?: string; endpoints?: string[] } } };
          const pubkey = cfg.plugins?.updater?.pubkey ?? "";
          add("updater-pubkey", "Updater signing pubkey", pubkey.trim() ? "pass" : "fail",
            pubkey.trim() ? `Pubkey embedded (${pubkey.trim().length} chars)` : "plugins.updater.pubkey is empty — installed apps will REJECT all updates");
        } catch { /* config parse reported above */ }
      }

      // 11. Release workflows exist on the branch.
      const [releaseWf, ciWf] = await Promise.all([fileExists(".github/workflows/release-desktop.yml"), fileExists(".github/workflows/ci.yml")]);
      add("workflows", "Workflow files on branch", releaseWf && ciWf ? "pass" : "warn",
        releaseWf && ciWf ? "release-desktop.yml and ci.yml present" : `Missing: ${[!releaseWf && "release-desktop.yml", !ciWf && "ci.yml"].filter(Boolean).join(", ")}`);

      // 12. Mobile platform (Tauri Android/iOS): scripts, init projects,
      //     mobile-safe viewport, and workspace code.
      let pkgJson: { scripts?: Record<string, string> } = {};
      let pkgParseError: string | null = null;
      try { pkgJson = JSON.parse(pkgRaw.text) as { scripts?: Record<string, string> }; } catch (e) { pkgParseError = e instanceof Error ? e.message : "invalid"; }
      const androidBuild = pkgJson.scripts?.["tauri:android:build"];
      const iosBuild = pkgJson.scripts?.["tauri:ios:build"];
      const [androidGen, mobileApp] = await Promise.all([
        fileExists("src-tauri/gen/android"),
        fileExists("src/platform/mobile/MobileWorkspaceApp.tsx"),
      ]);
      const mobileBits = [
        { ok: Boolean(androidBuild && iosBuild), label: "tauri:android/ios:build scripts" },
        { ok: androidGen, label: "src-tauri/gen/android project initialized" },
        { ok: mobileApp, label: "src/platform/mobile/MobileWorkspaceApp.tsx" },
      ];
      const missingMobile = mobileBits.filter((b) => !b.ok).map((b) => b.label);
      add("mobile", "Mobile platform (Android / iOS)", pkgParseError ? "fail" : missingMobile.length === 0 ? "pass" : "warn",
        pkgParseError
          ? `package.json parse error: ${pkgParseError}`
          : missingMobile.length === 0
          ? "Mobile build scripts, Android project, and mobile workspace all present"
          : `Not ready on ${branch}: ${missingMobile.join(" · ")} — run 'npm run tauri:android:init' to scaffold`);

      const htmlRaw = await raw("index.html");
      const viewportOk = htmlRaw.ok && /viewport-fit=cover/.test(htmlRaw.text);
      add("mobile-viewport", "Mobile viewport (notch/safe-area)", viewportOk ? "pass" : "warn",
        viewportOk ? "index.html uses viewport-fit=cover for iOS notch / Android cutouts" : "index.html missing viewport-fit=cover — mobile shells will render under system bars");

      // 13. Identifier sanity (must be a reverse-DNS bundle id for stores).
      if (tauriRaw.ok) {
        try {
          const cfg2 = JSON.parse(tauriRaw.text) as { identifier?: string };
          const id = cfg2.identifier ?? "";
          const valid = /^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/.test(id);
          add("identifier", "App identifier", valid ? "pass" : "fail",
            valid ? `Valid reverse-DNS bundle id: ${id}` : `Invalid bundle identifier "${id}" — app stores and OS registries reject it`);
        } catch { /* reported above */ }
      }

      // 14. Web deployment health (real Vercel data via VERCEL_TOKEN).
      const vercelToken = Deno.env.get("VERCEL_TOKEN");
      const vercelProject = Deno.env.get("VERCEL_PROJECT_ID");
      if (vercelToken && vercelProject) {
        try {
          const vR = await fetch(`https://api.vercel.com/v6/deployments?projectId=${vercelProject}&limit=1&target=production`, {
            headers: { Authorization: `Bearer ${vercelToken}` },
          });
          if (vR.ok) {
            const vData = await vR.json() as { deployments?: Array<{ readyState?: string; url?: string; created_at?: number }> };
            const dep = vData.deployments?.[0];
            if (!dep) add("web-deploy", "Web deployment (Vercel)", "warn", "No production deployments found");
            else if (dep.readyState === "READY") add("web-deploy", "Web deployment (Vercel)", "pass", `Latest production deployment is READY (${dep.url ?? ""})`);
            else if (dep.readyState === "ERROR" || dep.readyState === "CANCELED") add("web-deploy", "Web deployment (Vercel)", "fail", `Latest production deployment is ${dep.readyState} — the web app did not ship`);
            else add("web-deploy", "Web deployment (Vercel)", "warn", `Latest production deployment is ${dep.readyState}`);
          } else {
            add("web-deploy", "Web deployment (Vercel)", "unknown", `Vercel API ${vR.status} — check VERCEL_TOKEN scope`);
          }
        } catch {
          add("web-deploy", "Web deployment (Vercel)", "unknown", "Vercel API unreachable");
        }
      } else {
        add("web-deploy", "Web deployment (Vercel)", "unknown", "VERCEL_TOKEN / VERCEL_PROJECT_ID not set on the project");
      }

      // 15. Branch drift: how far master has moved past the last release tag.
      if (tauriVersion) {
        const lastTag = `desktop-v${tauriVersion}`;
        const cmpR = await gh<{ total_commits: number }>(
          token,
          `/repos/${REPO}/compare/${lastTag}...${branch}?per_page=1`,
        );
        if (cmpR.ok) {
          const ahead = Number(cmpR.data!.total_commits ?? 0);
          add("branch-drift", "Branch vs last release", ahead === 0 ? "warn" : "pass",
            ahead === 0
              ? `${branch} matches ${lastTag} — nothing new to release`
              : `${branch} is ${ahead} commit${ahead === 1 ? "" : "s"} ahead of ${lastTag} — notes will cover all of them`);
        } else {
          add("branch-drift", "Branch vs last release", "unknown", `Compare failed: ${cmpR.status}`);
        }
      }

      // 16. Open pull requests awareness (counts from the private repo).
      const prsR = await gh<Array<{ number: number; title: string }>>(
        token,
        `/repos/${REPO}/pulls?state=open&per_page=100`,
      );
      if (prsR.ok) {
        const prs = prsR.data ?? [];
        add("prs", "Open pull requests", prs.length === 0 ? "pass" : "warn",
          prs.length === 0
            ? "No open PRs — everything is merged"
            : `${prs.length} open: ${prs.slice(0, 3).map((p) => `#${p.number}`).join(", ")}${prs.length > 3 ? ` +${prs.length - 3} more` : ""} — unmerged work may be missing from the release`);
      } else {
        add("prs", "Open pull requests", "unknown", "Cannot read PRs with current token scope");
      }

      // 17. Public distribution integrity: the published release must carry
      //     latest.json and signed installers, or user updaters break.
      try {
        const pubR = await fetch("https://api.github.com/repos/shrikrishna-lab/noska-desktop-releases/releases/latest", {
          headers: { Accept: "application/vnd.github+json" },
        });
        if (pubR.ok) {
          const pub = await pubR.json() as { tag_name?: string; assets?: Array<{ name: string }> };
          const names = (pub.assets ?? []).map((a) => a.name);
          const hasManifest = names.includes("latest.json");
          const hasSigs = names.some((n) => n.endsWith(".sig"));
          const hasInstallers = names.some((n) => /\.(exe|msi|dmg|AppImage|deb|rpm)$/i.test(n));
          if (hasManifest && hasSigs && hasInstallers) {
            add("public-assets", "Public distribution integrity", "pass",
              `${pub.tag_name}: ${names.length} assets — latest.json, signatures and installers all present`);
          } else {
            add("public-assets", "Public distribution integrity", "fail",
              `${pub.tag_name} is missing: ${[!hasManifest && "latest.json", !hasSigs && ".sig signatures", !hasInstallers && "installers"].filter(Boolean).join(", ")} — user updates will break`);
          }
        } else {
          add("public-assets", "Public distribution integrity", "warn", `Public repo returned HTTP ${pubR.status}`);
        }
      } catch {
        add("public-assets", "Public distribution integrity", "unknown", "Public releases repo unreachable");
      }

      const summary = {
        pass: checks.filter((c) => c.status === "pass").length,
        warn: checks.filter((c) => c.status === "warn").length,
        fail: checks.filter((c) => c.status === "fail").length,
        unknown: checks.filter((c) => c.status === "unknown").length,
      };
      await audit(admin, "release.preflight", { branch, summary });
      return res({ branch, checks, summary });
    }

    if (body.action === "retry") {
      // Re-release an existing version: move its tag to the current branch
      // HEAD (picking up any post-release fixes) — the tag push re-triggers
      // the release workflow. Intended for failed builds or republishing.
      const tag = String(body.tag ?? "").trim();
      if (!/^desktop-v\d+\.\d+\.\d+/.test(tag)) return resError("Invalid tag", 400);

      const repoInfo = await gh<{ default_branch: string }>(token, `/repos/${REPO}`);
      if (!repoInfo.ok) return resError(`GitHub API ${repoInfo.status}: ${repoInfo.raw}`, 502);
      const branch = repoInfo.data!.default_branch;

      const tagRef = await gh<GitHubRef>(token, `/repos/${REPO}/git/ref/tags/${tag}`);
      if (tagRef.status === 404) return resError(`Tag ${tag} does not exist — use action "trigger" for a new version`, 404);
      if (!tagRef.ok) return resError(`GitHub API ${tagRef.status}: ${tagRef.raw}`, 502);

      const headRef = await gh<GitHubRef>(token, `/repos/${REPO}/git/ref/heads/${branch}`);
      if (!headRef.ok) return resError(`Cannot resolve branch ${branch}`, 502);
      const headSha = headRef.data!.object.sha;
      const currentTaggedSha = tagRef.data!.object.sha;

      if (currentTaggedSha === headSha && !body.force) {
        return resError(`Tag ${tag} already points at the current ${branch} HEAD. Send force:true to rebuild anyway.`, 409);
      }

      const del = await gh(token, `/repos/${REPO}/git/refs/tags/${tag}`, { method: "DELETE" });
      if (!del.ok) return resError(`Tag move failed (delete): ${del.status} ${del.raw}`, 502);
      const create = await gh(token, `/repos/${REPO}/git/refs`, {
        method: "POST",
        body: { ref: `refs/tags/${tag}`, sha: headSha },
      });
      if (!create.ok) return resError(`Tag move failed (recreate): ${create.status} ${create.raw}`, 502);

      // Keep the notes: if the staging draft was deleted, recreate it with the
      // last known body so the published release doesn't lose them.
      const relR = await gh<{ id: number; draft: boolean }>(token, `/repos/${REPO}/releases/tags/${tag}`);
      if (relR.status === 404 && typeof body.notes === "string" && body.notes.trim()) {
        const newDraft = await gh<{ id: number }>(token, `/repos/${REPO}/releases`, {
          method: "POST",
          body: { tag_name: tag, name: `Noska Desktop v${tag.slice("desktop-v".length)}`, body: body.notes, draft: true, prerelease: false },
        });
        if (newDraft.ok) {
          await fetch(`https://uploads.github.com/repos/${REPO}/releases/${newDraft.data!.id}/assets?name=release-notes.md`, {
            method: "POST",
            headers: { ...ghHeaders(token), "Content-Type": "text/markdown" },
            body: body.notes,
          });
        }
      }

      await audit(admin, "release.retry", { tag, headSha, previousSha: currentTaggedSha });
      return res({
        ok: true,
        tag,
        headSha: headSha.slice(0, 7),
        previousSha: currentTaggedSha.slice(0, 7),
        runUrl: `https://github.com/${REPO}/actions/workflows/${WORKFLOW_FILE}`,
      });
    }

    if (body.action === "delete_release" || body.action === "delete_draft") {
      // Housekeeping & Re-release support: delete a draft OR published release and its git tag.
      // This frees up the version tag so it can be re-released or rebuilt for launch.
      const tag = String(body.tag ?? "").trim();
      const deleteTag = body.delete_tag !== false; // default true
      if (!/^(desktop-v|mobile-v)/.test(tag)) return resError("Invalid tag", 400);

      // 1. Delete release from private repo (shrikrishna-lab/noska)
      const relR = await gh<{ id: number; draft: boolean; tag_name: string }>(
        token,
        `/repos/${REPO}/releases/tags/${tag}`,
      );
      if (relR.ok && relR.data?.id) {
        await gh(token, `/repos/${REPO}/releases/${relR.data.id}`, { method: "DELETE" });
      }

      // 2. Delete release from public distribution repo if exists
      const publicToken = Deno.env.get("RELEASES_REPO_TOKEN") ?? token;
      const publicRepo = `${REPO_OWNER}/noska-desktop-releases`;
      try {
        const pubRel = await gh<{ id: number }>(
          publicToken,
          `/repos/${publicRepo}/releases/tags/${tag}`,
        );
        if (pubRel.ok && pubRel.data?.id) {
          await gh(publicToken, `/repos/${publicRepo}/releases/${pubRel.data.id}`, { method: "DELETE" });
        }
      } catch {}

      // 3. Delete Git tag reference so this version can be released again
      if (deleteTag) {
        await gh(token, `/repos/${REPO}/git/refs/tags/${tag}`, { method: "DELETE" });
        try {
          await gh(publicToken, `/repos/${publicRepo}/git/refs/tags/${tag}`, { method: "DELETE" });
        } catch {}
      }

      // 4. Clean up corresponding changelog_entries from Supabase if applicable
      try {
        const cleanVer = tag.replace(/^(desktop-v|mobile-v)/, "");
        await supabase.from("changelog_entries").delete().or(`version.eq.v${cleanVer},version.eq.${cleanVer}`);
      } catch {}

      await audit(admin, "release.deleted", { tag, deleteTag });
      return res({ ok: true, tag, message: `Release ${tag} and associated tag deleted successfully` });
    }

    if (body.action === "status") {
      const repoInfo = await gh<{ default_branch: string }>(token, `/repos/${REPO}`);
      if (!repoInfo.ok) return resError(`GitHub API ${repoInfo.status}: ${repoInfo.raw}`, 502);
      const branch = repoInfo.data!.default_branch;

      const versions = await readVersions(token, branch);
      const tauri = versions.find((v) => v.path.includes("tauri.conf.json"));

      const [runsR, releasesR] = await Promise.all([
        gh<{ workflow_runs: GitHubRun[] }>(
          token,
          `/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=8`,
        ),
        gh<GitHubRelease[]>(token, `/repos/${REPO}/releases?per_page=8`),
      ]);

      return res({
        repo: REPO,
        branch,
        versions,
        currentVersion: tauri?.version ?? null,
        runs: runsR.ok ? (runsR.data!.workflow_runs ?? []) : [],
        releases: releasesR.ok ? (releasesR.data ?? []) : [],
      });
    }

    if (body.action === "whatsnew") {
      const repoInfo = await gh<{ default_branch: string }>(token, `/repos/${REPO}`);
      if (!repoInfo.ok) return resError(`GitHub API ${repoInfo.status}: ${repoInfo.raw}`, 502);
      const branch = repoInfo.data!.default_branch;

      const versions = await readVersions(token, branch);
      const tauri = versions.find((v) => v.path.includes("tauri.conf.json"));
      const currentVersion = tauri?.version ?? null;

      // Latest desktop-v* tag (draft releases carry their tag already, so this
      // includes yet-to-be-published versions — the right base for "what's new").
      const lastTag = await latestDesktopTag(token);
      const baseTag = lastTag.name;
      const baseVersion = lastTag.version;

      const suggestions: Array<{ level: "info" | "warn"; title: string; detail: string; url?: string }> = [];

      let commits: CommitInfo[] = [];
      let totalCommits = 0;
      let truncated = false;
      if (baseTag) {
        try {
          const range = await collectCommitsSince(token, branch, baseTag);
          commits = range.commits;
          totalCommits = range.totalCommits;
          truncated = range.truncated;
        } catch (err) {
          return resError(err instanceof Error ? err.message : "GitHub compare failed", 502);
        }
      }

      const counts = {
        total: commits.length,
        feat: commits.filter((c) => c.type === "feat").length,
        fix: commits.filter((c) => c.type === "fix").length,
        breaking: commits.filter((c) => c.breaking).length,
        other: commits.filter((c) => c.type === "other").length,
      };

      // Version suggestion derived purely from the actual commit types.
      let suggested: { version: string; kind: "major" | "minor" | "patch"; reason: string } | null = null;
      if (currentVersion) {
        if (counts.total === 0) {
          suggested = null;
        } else if (counts.breaking > 0) {
          suggested = { version: bumpVersion(currentVersion, "major"), kind: "major", reason: `${counts.breaking} breaking change${counts.breaking > 1 ? "s" : ""} since ${baseTag ?? "start"}` };
        } else if (counts.feat > 0) {
          suggested = { version: bumpVersion(currentVersion, "minor"), kind: "minor", reason: `${counts.feat} new feature${counts.feat > 1 ? "s" : ""} since ${baseTag ?? "start"}` };
        } else {
          suggested = { version: bumpVersion(currentVersion, "patch"), kind: "patch", reason: `${counts.fix} fix${counts.fix === 1 ? "" : "es"} and maintenance since ${baseTag ?? "start"}` };
        }
      }

      // --- Branch intelligence: what exists beyond master ---
      // Every non-default branch is compared against master so the admin sees
      // work that is NOT in this release, not just what is.
      const branchesR = await gh<Array<{ name: string; commit: { sha: string } }>>(
        token,
        `/repos/${REPO}/branches?per_page=100`,
      );
      const upcoming: Array<{
        name: string;
        ahead: number;
        tip: { sha: string; message: string; author: string; date: string };
      }> = [];
      if (branchesR.ok) {
        const otherBranches = (branchesR.data ?? []).filter((b) => b.name !== branch);
        const probes = await Promise.all(otherBranches.map(async (b) => {
          try {
            const cmp = await gh<{ total_commits: number }>(
              token,
              `/repos/${REPO}/compare/${branch}...${encodeURIComponent(b.name)}?per_page=1`,
            );
            const ahead = cmp.ok ? Number(cmp.data!.total_commits ?? 0) : 0;
            if (ahead <= 0) return null;
            // Use the git refs API — it accepts slashed branch names that the
            // /branches/{name} path endpoint 404s on.
            const tipR = await gh<{ object: { sha: string } }>(
              token,
              `/repos/${REPO}/git/ref/heads/${encodeURIComponent(b.name)}`,
            );
            const tipSha = tipR.ok ? String(tipR.data!.object?.sha ?? "").slice(0, 7) : "?";
            // One commit call for the tip message/author — cheapest detail.
            let tipMessage = "";
            let tipAuthor = "unknown";
            let tipDate = "";
            if (tipSha !== "?") {
              const cR = await gh<{ commit?: { message?: string; committer?: { date?: string }; author?: { name?: string } } }>(
                token,
                `/repos/${REPO}/commits/${encodeURIComponent(b.name)}?per_page=1`,
              );
              tipMessage = String(cR.data?.commit?.message ?? "").split("\n")[0].slice(0, 110);
              tipAuthor = String(cR.data?.commit?.author?.name ?? "unknown");
              tipDate = String(cR.data?.commit?.committer?.date ?? "");
            }
            return {
              name: b.name,
              ahead,
              tip: { sha: tipSha, message: tipMessage, author: tipAuthor, date: tipDate },
            };
          } catch {
            return null; // one weird branch never breaks the report
          }
        }));
        upcoming.push(...probes.filter((b): b is NonNullable<typeof b> => b !== null).sort((a, b) => b.ahead - a.ahead));
      }

      // Reasoning: unmerged branch work will NOT be part of this release —
      // surface it as an explicit decision for the admin.
      for (const b of upcoming) {
        suggestions.push({
          level: "warn",
          title: `Branch "${b.name}" is ${b.ahead} commit${b.ahead === 1 ? "" : "s"} ahead — NOT in this release`,
          detail: `Latest: ${b.tip.message} (${b.tip.author})${b.tip.date ? ` · ${new Date(b.tip.date).toLocaleDateString()}` : ""}. Merge it into ${branch} before shipping if it should be included.`,
        });
      }

      // --- Suggestions from real state only ---
      const uniq = new Set(versions.map((v) => v.version));
      if (uniq.size > 1) {
        suggestions.push({
          level: "warn",
          title: "Version files are out of sync",
          detail: versions.map((v) => `${v.path}: ${v.version ?? "?"}`).join(" · "),
        });
      }
      if (baseVersion && currentVersion && compareVersions(currentVersion, baseVersion) < 0) {
        suggestions.push({
          level: "warn",
          title: "Version files are older than the last tag",
          detail: `Files say ${currentVersion} but ${baseTag} already exists. Release ${bumpVersion(baseVersion, "patch")} or higher.`,
        });
      }
      if (counts.total === 0 && baseTag) {
        suggestions.push({
          level: "info",
          title: "Nothing new to release",
          detail: `No commits since ${baseTag} — the working tree matches the last tagged release.`,
        });
      }
      if (suggested) {
        suggestions.push({
          level: "info",
          title: `Release ${suggested.version}`,
          detail: `${suggested.reason} — ${counts.feat} feat · ${counts.fix} fix · ${counts.other} chore/docs/other.`,
        });
      }

      const releasesR = await gh<GitHubRelease[]>(token, `/repos/${REPO}/releases?per_page=20`);
      const drafts = (releasesR.ok ? (releasesR.data ?? []) : []).filter((r) => r.draft);
      if (drafts.length > 0) {
        // Aggregate instead of one warning per draft — 12 identical rows help
        // nobody; one row with the version list does.
        const draftTags = [...new Set(drafts.map((d) => d.tag_name))]
          .sort((a, b) => compareVersions(b.slice("desktop-v".length), a.slice("desktop-v".length)));
        const shown = draftTags.slice(0, 5).join(", ") + (draftTags.length > 5 ? ` +${draftTags.length - 5} more` : "");
        suggestions.push({
          level: "warn",
          title: `${drafts.length} desktop release${drafts.length === 1 ? " is" : "s are"} still unpublished drafts (${shown})`,
          detail: "Staged in the private repo; each needs publishing (or deletion) so users actually receive the update.",
          url: `https://github.com/${REPO}/releases`,
        });
      }

      return res({
        baseTag,
        currentVersion,
        suggested,
        counts,
        // The full analyzed range (up to the compare API's 250 per page) — the
        // note generator and the UI preview must see everything between the
        // last tag and the version being pushed, not a 30-commit window.
        commits: commits.slice(0, 250),
        totalCommits,
        truncated,
        branch,
        upcoming,
        drafts: drafts.map((d) => ({ tag: d.tag_name, url: d.html_url, created_at: d.created_at })),
        suggestions,
      });
    }

    if (body.action === "runs") {
      const runsR = await gh<{ workflow_runs: GitHubRun[] }>(
        token,
        `/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=12`,
      );
      if (!runsR.ok) return resError(`GitHub API ${runsR.status}: ${runsR.raw}`, 502);
      return res({ runs: runsR.data!.workflow_runs ?? [] });
    }

    if (body.action === "releases") {
      const releasesR = await gh<GitHubRelease[]>(token, `/repos/${REPO}/releases?per_page=12`);
      if (!releasesR.ok) return resError(`GitHub API ${releasesR.status}: ${releasesR.raw}`, 502);
      return res({ releases: releasesR.data ?? [] });
    }

    // ---- mobile: one status read covering the whole mobile pipeline ----
    if (body.action === "mobile_status") {
      const repoInfo = await gh<{ default_branch: string }>(token, `/repos/${REPO}`);
      if (!repoInfo.ok) return resError(`GitHub API ${repoInfo.status}: ${repoInfo.raw}`, 502);
      const branch = repoInfo.data!.default_branch;

      const rawFile = async (path: string): Promise<string | null> => {
        const r = await fetch(`https://raw.githubusercontent.com/${REPO}/${branch}/${path}`, {
          headers: { Authorization: `Bearer ${token}` }, // private repo needs the token
        });
        return r.ok ? await r.text() : null;
      };

      const [manifest, tauriConf, androidGradle, appleProject, workflow] = await Promise.all([
        rawFile("src-tauri/gen/android/app/src/main/AndroidManifest.xml"),
        rawFile("src-tauri/tauri.conf.json"),
        rawFile("src-tauri/gen/android/app/build.gradle.kts"),
        rawFile("src-tauri/gen/apple/noska_iOS/Info.plist"),
        rawFile(".github/workflows/build-mobile.yml"),
      ]);

      // The noska:// scheme must be registered in the manifest for auth
      // handoff + deep links; the patch script adds it after `android init`.
      const schemeRegistered = manifest
        ? /android:scheme\s*=\s*"noska"/.test(manifest)
        : null;

      const runsR = await gh<{ workflow_runs: GitHubRun[] }>(
        token,
        `/repos/${REPO}/actions/workflows/${MOBILE_WORKFLOW_FILE}/runs?per_page=8`,
      );

      const releasesR = await gh<GitHubRelease[]>(token, `/repos/${REPO}/releases?per_page=20`);
      const mobileReleases = (releasesR.ok ? releasesR.data ?? [] : [])
        .filter((r) => r.tag_name.startsWith("mobile-v"));

      // No audit here — this is a polled read (10s UI refresh), not an action.
      return res({
        branch,
        workflowOnBranch: workflow !== null,
        androidProject: androidGradle !== null ? "committed" : "missing",
        iosProject: appleProject !== null ? "committed" : "missing",
        schemeRegistered,
        currentVersion: tauriConf ? extractVersion(tauriConf, "json") : null,
        storeLinks: {
          appStore: Deno.env.get("APP_STORE_URL") ?? null,
          googlePlay: Deno.env.get("PLAY_STORE_URL") ?? null,
        },
        runs: runsR.ok ? runsR.data!.workflow_runs ?? [] : [],
        releases: mobileReleases,
        runsError: runsR.ok
          ? null
          : "Cannot read workflow runs — add Actions: Read to the GITHUB_TOKEN fine-grained permissions",
      });
    }

    // ---- mobile trigger: tag mobile-v* on the current branch HEAD ----
    if (body.action === "mobile_trigger") {
      const version = String(body.version ?? "").trim();
      if (!SEMVER.test(version)) {
        return resError("Invalid version: expected semver like 1.0.12", 400);
      }
      const tag = `mobile-v${version}`;

      const repoInfo = await gh<{ default_branch: string }>(token, `/repos/${REPO}`);
      if (!repoInfo.ok) return resError(`GitHub API ${repoInfo.status}: ${repoInfo.raw}`, 502);
      const branch = repoInfo.data!.default_branch;

      // Mobile builds ship the repo AS-IS — no version bump commit here
      // (the Desktop release flow owns version bumps). Refuse mismatches so
      // a build can never be mislabeled with the wrong app version.
      const confR = await fetch(`https://raw.githubusercontent.com/${REPO}/${branch}/src-tauri/tauri.conf.json`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!confR.ok) return resError("Cannot read src-tauri/tauri.conf.json on the default branch", 502);
      const conf = await confR.text();
      const current = extractVersion(conf, "json");
      if (current !== version) {
        return resError(
          `Mobile builds always build the current repo version${current ? ` (${current})` : ""}. Bump versions with a Desktop release first, or trigger mobile-v${current ?? "?"} instead.`,
          400,
        );
      }

      const force = Boolean(body.force || body.overwrite);
      const tagRef = await gh<GitHubRef>(token, `/repos/${REPO}/git/ref/tags/${tag}`);
      if (tagRef.ok) {
        if (!force) return resError(`Tag ${tag} already exists. Enable force re-release or delete the existing release first.`, 409);
        const oldRel = await gh<{ id: number }>(token, `/repos/${REPO}/releases/tags/${tag}`);
        if (oldRel.ok && oldRel.data?.id) {
          await gh(token, `/repos/${REPO}/releases/${oldRel.data.id}`, { method: "DELETE" });
        }
        await gh(token, `/repos/${REPO}/git/refs/tags/${tag}`, { method: "DELETE" });
      }

      const headRef = await gh<GitHubRef>(token, `/repos/${REPO}/git/ref/heads/${branch}`);
      if (!headRef.ok) return resError(`Cannot resolve branch ${branch}`, 502);
      const headSha = headRef.data!.object.sha;

      const tagObj = await gh<{ sha: string }>(token, `/repos/${REPO}/git/tags`, {
        method: "POST",
        body: {
          tag,
          message: String(body.notes ?? "").trim() || `Noska Mobile v${version}`,
          object: headSha,
          type: "commit",
          tagger: { name: `Noska Admin (${admin.name})`, email: admin.email },
        },
      });
      if (!tagObj.ok) return resError(`Tag object failed: ${tagObj.status} ${tagObj.raw}`, 502);

      const tagCreate = await gh(token, `/repos/${REPO}/git/refs`, {
        method: "POST",
        body: { ref: `refs/tags/${tag}`, sha: tagObj.data!.sha },
      });
      if (!tagCreate.ok) return resError(`Tag creation failed: ${tagCreate.status} ${tagCreate.raw}`, 502);

      await audit(admin, "release.mobile_trigger", { tag, version, headSha });

      return res({
        ok: true,
        tag,
        version,
        commitSha: headSha,
        runUrl: `https://github.com/${REPO}/actions/workflows/${MOBILE_WORKFLOW_FILE}`,
        warning: null,
      });
    }

    // ---- trigger ----
    const version = String(body.version ?? "").trim();
    if (!SEMVER.test(version)) {
      return resError("Invalid version: expected semver like 1.0.12", 400);
    }
    const notes = String(body.notes ?? "").trim();
    const tag = `desktop-v${version}`;

    const repoInfo = await gh<{ default_branch: string }>(token, `/repos/${REPO}`);
    if (!repoInfo.ok) return resError(`GitHub API ${repoInfo.status}: ${repoInfo.raw}`, 502);
    const branch = repoInfo.data!.default_branch;

    const force = Boolean(body.force || body.overwrite);
    const tagRef = await gh<GitHubRef>(token, `/repos/${REPO}/git/ref/tags/${tag}`);
    if (tagRef.ok) {
      if (!force) return resError(`Tag ${tag} already exists. Enable force re-release or delete the existing release first.`, 409);
      const oldRel = await gh<{ id: number }>(token, `/repos/${REPO}/releases/tags/${tag}`);
      if (oldRel.ok && oldRel.data?.id) {
        await gh(token, `/repos/${REPO}/releases/${oldRel.data.id}`, { method: "DELETE" });
      }
      await gh(token, `/repos/${REPO}/git/refs/tags/${tag}`, { method: "DELETE" });
    }

    const headRef = await gh<GitHubRef>(token, `/repos/${REPO}/git/ref/heads/${branch}`);
    if (!headRef.ok) return resError(`Cannot resolve branch ${branch}`, 502);
    const headSha = headRef.data!.object.sha;

    // The version files can drift behind the release history, so check the
    // pushed version against the LATEST TAG too — v1.0.10 must never be
    // re-tagged over v1.0.12 just because the files still say 1.0.11.
    const lastTag = await latestDesktopTag(token);
    if (lastTag.version && !force && compareVersions(version, lastTag.version) <= 0) {
      return resError(
        `Version ${version} must be greater than the latest release tag ${lastTag.name} (or enable force re-release)`,
        400,
      );
    }

    // Real release notes from the full commit range between the last release
    // tag and this one — used whenever the admin didn't author notes. Never a
    // single-commit blurb.
    let notesBody = notes;
    let notesSource: "admin" | "auto-generated" | "default" = notes ? "admin" : "default";
    if (!notesBody && lastTag.name) {
      try {
        const range = await collectCommitsSince(token, branch, lastTag.name);
        if (range.commits.length > 0) {
          notesBody = composeReleaseNotes(version, lastTag.name, range.totalCommits, range.truncated, range.commits);
          notesSource = "auto-generated";
        }
      } catch (err) {
        console.error("[admin-trigger-release] auto note generation failed:", err);
      }
    }

    // Read + patch the version files, then land everything as one commit.
    const patched: Array<{ path: string; content: string }> = [];
    for (const f of VERSION_FILES) {
      const r = await gh<{ content: string; sha: string }>(
        token,
        `/repos/${REPO}/contents/${f.path}?ref=${branch}`,
      );
      if (!r.ok) return resError(`Cannot read ${f.path}: HTTP ${r.status}`, 502);
      const text = new TextDecoder().decode(
        Uint8Array.from(atob((r.data!.content ?? "").replace(/\n/g, "")), (c) => c.charCodeAt(0)),
      );
      const m = text.match(f.kind === "json" ? /"version"\s*:\s*"([^"]+)"/ : /version\s*=\s*"([^"]+)"/);
      if (!m) return resError(`No version string found in ${f.path}`, 500);
      if (compareVersions(version, m[1]) < 0 || (compareVersions(version, m[1]) === 0 && !force)) {
        return resError(`Version ${version} must be greater than current ${m[1]} in ${f.path} (or enable force re-release)`, 400);
      }
      patched.push({ path: f.path, content: bumpContent(text, f.kind, version) });
    }

    const blobs = await Promise.all(patched.map((p) =>
      gh<{ sha: string }>(token, `/repos/${REPO}/git/blobs`, {
        method: "POST",
        body: { content: p.content, encoding: "utf-8" },
      })
    ));
    if (blobs.some((b) => !b.ok)) {
      const bad = blobs.find((b) => !b.ok)!;
      return resError(`Blob creation failed: ${bad.status} ${bad.raw}`, 502);
    }

    const headCommit = await gh<GitHubCommit>(token, `/repos/${REPO}/git/commits/${headSha}`);
    if (!headCommit.ok) return resError("Cannot resolve head commit tree", 502);

    const tree = await gh<{ sha: string }>(token, `/repos/${REPO}/git/trees`, {
      method: "POST",
      body: {
        base_tree: headCommit.data!.tree.sha,
        tree: patched.map((p, i) => ({
          path: p.path,
          mode: "100644",
          type: "blob",
          sha: blobs[i].data!.sha,
        })),
      },
    });
    if (!tree.ok) return resError(`Tree creation failed: ${tree.status} ${tree.raw}`, 502);

    const commit = await gh<{ sha: string }>(token, `/repos/${REPO}/git/commits`, {
      method: "POST",
      body: {
        message: `chore(release): v${version}`,
        tree: tree.data!.sha,
        parents: [headSha],
      },
    });
    if (!commit.ok) return resError(`Commit failed: ${commit.status} ${commit.raw}`, 502);
    const commitSha = commit.data!.sha;

    const push = await gh(token, `/repos/${REPO}/git/refs/heads/${branch}`, {
      method: "PATCH",
      body: { sha: commitSha },
    });
    if (!push.ok) return resError(`Branch update failed: ${push.status} ${push.raw}`, 502);

    const tagObj = await gh<{ sha: string }>(token, `/repos/${REPO}/git/tags`, {
      method: "POST",
      body: {
        tag,
        // Keep the tag message a one-liner; the full notes belong to the
        // release, not the tag object.
        message: notesSource === "auto-generated"
          ? `Noska Desktop v${version} — auto-generated notes from all commits since ${lastTag.name}`
          : notes || `Noska Desktop v${version}`,
        object: commitSha,
        type: "commit",
        tagger: { name: `Noska Admin (${admin.name})`, email: admin.email },
      },
    });
    if (!tagObj.ok) return resError(`Tag object failed: ${tagObj.status} ${tagObj.raw}`, 502);

    const tagCreate = await gh(token, `/repos/${REPO}/git/refs`, {
      method: "POST",
      body: { ref: `refs/tags/${tag}`, sha: tagObj.data!.sha },
    });
    if (!tagCreate.ok) return resError(`Tag creation failed: ${tagCreate.status} ${tagCreate.raw}`, 502);

    // Pre-create the draft release so the notes (admin-authored or
    // auto-generated from the commit range) survive — tauri-action attaches
    // build artifacts to this release.
    let releaseUrl: string | null = null;
    const draftBodyText = notesBody || "Installers for Windows (.exe/.msi), macOS (.dmg) and Linux (.AppImage/.deb/.rpm). Auto-update manifest: latest.json";
    const draft = await gh<{ html_url: string; id: number }>(token, `/repos/${REPO}/releases`, {
      method: "POST",
      body: {
        tag_name: tag,
        name: `Noska Desktop v${version}`,
        body: draftBodyText,
        draft: true,
        prerelease: false,
      },
    });
    if (draft.ok) {
      releaseUrl = draft.data!.html_url;
      // tauri-action resets the draft BODY to its generic releaseBody when it
      // attaches artifacts — so the real notes are also stored as an asset,
      // which tauri-action leaves untouched. The publish job prefers it.
      const notesAsset = await fetch(
        `https://uploads.github.com/repos/${REPO}/releases/${draft.data!.id}/assets?name=release-notes.md`,
        {
          method: "POST",
          headers: { ...ghHeaders(token), "Content-Type": "text/markdown" },
          body: draftBodyText,
        },
      );
      if (!notesAsset.ok) {
        console.error("[admin-trigger-release] notes asset upload failed:", notesAsset.status, (await notesAsset.text()).slice(0, 200));
      }
    }

    await audit(admin, "release.trigger", { tag, version, commitSha, releaseUrl });

    return res({
      ok: true,
      tag,
      version,
      commitSha,
      releaseUrl,
      notesSource,
      runUrl: `https://github.com/${REPO}/actions/workflows/${WORKFLOW_FILE}`,
      warning: draft.ok ? null : "Tag created, but draft release pre-creation failed — tauri-action will create one with default notes.",
    });
  } catch (err) {
    return resError(err instanceof Error ? err.message : "Unknown error");
  }
});
