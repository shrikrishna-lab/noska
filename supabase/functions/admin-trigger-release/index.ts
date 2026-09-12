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
    if (body.action === "status" || body.action === "runs" || body.action === "releases" || body.action === "whatsnew") {
      if (!requireRole(admin, "support")) return resError("Forbidden", 403);
    } else if (body.action === "delete_draft" || body.action === "retry") {
      if (!requireRole(admin, "admin")) return resError("Forbidden: admin role required", 403);
    } else if (body.action === "trigger") {
      if (!requireRole(admin, "admin")) return resError("Forbidden: admin role required to ship releases", 403);
    } else {
      return resError("Unknown action", 400);
    }

    const token = Deno.env.get("GITHUB_TOKEN");
    if (!token) return resError("GitHub not configured: set the GITHUB_TOKEN secret", 503);

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
        await gh(token, `/repos/${REPO}/releases`, {
          method: "POST",
          body: { tag_name: tag, name: `Noska Desktop v${tag.slice("desktop-v".length)}`, body: body.notes, draft: true, prerelease: false },
        });
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

    if (body.action === "delete_draft") {
      // Housekeeping: delete a DRAFT release (staged build leftovers).
      // Published releases are refused — deleting those is a job for GitHub.
      const tag = String(body.tag ?? "").trim();
      if (!/^desktop-v/.test(tag)) return resError("Invalid tag", 400);
      const relR = await gh<{ id: number; draft: boolean; tag_name: string }>(
        token,
        `/repos/${REPO}/releases/tags/${tag}`,
      );
      if (relR.status === 404) return resError(`No release found for ${tag}`, 404);
      if (!relR.ok) return resError(`GitHub API ${relR.status}: ${relR.raw}`, 502);
      if (!relR.data!.draft) {
        return resError(`${tag} is published — refusing to delete. Delete it on GitHub if really needed.`, 409);
      }
      const del = await gh(token, `/repos/${REPO}/releases/${relR.data!.id}`, { method: "DELETE" });
      if (!del.ok) return resError(`Delete failed: ${del.status} ${del.raw}`, 502);
      await audit(admin, "release.draft_deleted", { tag });
      return res({ ok: true, tag });
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
      const tagsR = await gh<Array<{ name: string; commit: { sha: string } }>>(
        token,
        `/repos/${REPO}/tags?per_page=100`,
      );
      if (!tagsR.ok) return resError(`GitHub API ${tagsR.status}: ${tagsR.raw}`, 502);
      const desktopTags = (tagsR.data ?? [])
        .filter((t) => /^desktop-v\d/.test(t.name))
        .sort((a, b) => compareVersions(b.name.slice("desktop-v".length), a.name.slice("desktop-v".length)));
      const baseTag = desktopTags[0]?.name ?? null;
      const baseVersion = baseTag ? baseTag.slice("desktop-v".length) : null;

      const suggestions: Array<{ level: "info" | "warn"; title: string; detail: string; url?: string }> = [];

      let commits: CommitInfo[] = [];
      let totalCommits = 0;
      let truncated = false;
      if (baseTag) {
        const cmpR = await gh<{
          commits: Array<{ sha: string; commit: { message: string; author?: { name?: string }; committer?: { date?: string } } }>;
          status: string;
          total_commits: number;
        }>(token, `/repos/${REPO}/compare/${baseTag}...${branch}?per_page=250`);
        if (!cmpR.ok) return resError(`GitHub compare failed: ${cmpR.status} ${cmpR.raw}`, 502);
        totalCommits = Number(cmpR.data!.total_commits ?? 0);
        commits = (cmpR.data!.commits ?? [])
          .map((c) => analyzeCommit(
            c.sha.slice(0, 7),
            c.commit.message,
            c.commit.author?.name ?? "unknown",
            c.commit.committer?.date ?? "",
          ))
          // GitHub's compare endpoint returns commits oldest-first; every
          // consumer here (newest-commit indicator, notes ordering) expects
          // newest-first.
          .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
          // Version-bump commits made by previous releases are noise.
          .filter((c) => !/^chore\(release\):/i.test(c.message));
        truncated = totalCommits > commits.length;
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
        commits: commits.slice(0, 30),
        totalCommits,
        truncated,
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

    // Refuse duplicate tags before doing any writes.
    const tagRef = await gh<GitHubRef>(token, `/repos/${REPO}/git/ref/tags/${tag}`);
    if (tagRef.ok) return resError(`Tag ${tag} already exists`, 409);

    const headRef = await gh<GitHubRef>(token, `/repos/${REPO}/git/ref/heads/${branch}`);
    if (!headRef.ok) return resError(`Cannot resolve branch ${branch}`, 502);
    const headSha = headRef.data!.object.sha;

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
      if (compareVersions(version, m[1]) <= 0) {
        return resError(`Version ${version} must be greater than current ${m[1]} in ${f.path}`, 400);
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
        message: notes || `Noska Desktop v${version}`,
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

    // Pre-create the draft release so the admin's notes survive —
    // tauri-action attaches build artifacts to this release.
    let releaseUrl: string | null = null;
    const draft = await gh<{ html_url: string }>(token, `/repos/${REPO}/releases`, {
      method: "POST",
      body: {
        tag_name: tag,
        name: `Noska Desktop v${version}`,
        body: notes || "Installers for Windows (.exe/.msi), macOS (.dmg) and Linux (.AppImage/.deb/.rpm). Auto-update manifest: latest.json",
        draft: true,
        prerelease: false,
      },
    });
    if (draft.ok) releaseUrl = draft.data!.html_url;

    await audit(admin, "release.trigger", { tag, version, commitSha, releaseUrl });

    return res({
      ok: true,
      tag,
      version,
      commitSha,
      releaseUrl,
      runUrl: `https://github.com/${REPO}/actions/workflows/${WORKFLOW_FILE}`,
      warning: draft.ok ? null : "Tag created, but draft release pre-creation failed — tauri-action will create one with default notes.",
    });
  } catch (err) {
    return resError(err instanceof Error ? err.message : "Unknown error");
  }
});
