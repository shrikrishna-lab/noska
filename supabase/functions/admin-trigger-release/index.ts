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
    if (body.action === "status" || body.action === "runs" || body.action === "releases") {
      if (!requireRole(admin, "support")) return resError("Forbidden", 403);
    } else if (body.action === "trigger") {
      if (!requireRole(admin, "admin")) return resError("Forbidden: admin role required to ship releases", 403);
    } else {
      return resError("Unknown action", 400);
    }

    const token = Deno.env.get("GITHUB_TOKEN");
    if (!token) return resError("GitHub not configured: set the GITHUB_TOKEN secret", 503);

    if (body.action === "status") {
      const repoInfo = await gh<{ default_branch: string }>(token, `/repos/${REPO}`);
      if (!repoInfo.ok) return resError(`GitHub API ${repoInfo.status}: ${repoInfo.raw}`, 502);
      const branch = repoInfo.data!.default_branch;

      const versions = await Promise.all(
        VERSION_FILES.map(async (f) => {
          const r = await gh<{ content: string }>(
            token,
            `/repos/${REPO}/contents/${f.path}?ref=${branch}`,
          );
          if (!r.ok) return { path: f.path, version: null, error: `HTTP ${r.status}` };
          const text = new TextDecoder().decode(
            Uint8Array.from(atob((r.data!.content ?? "").replace(/\n/g, "")), (c) => c.charCodeAt(0)),
          );
          const m = text.match(f.kind === "json"
            ? /"version"\s*:\s*"([^"]+)"/
            : /version\s*=\s*"([^"]+)"/);
          return { path: f.path, version: m?.[1] ?? null, error: m ? null : "version string not found" };
        }),
      );
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
