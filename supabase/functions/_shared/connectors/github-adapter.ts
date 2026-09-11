/**
 * GitHub Resource Adapter — Fetches and normalizes live GitHub REST API data.
 *
 * Supports Pull Requests, Issues, Commits, Releases, Repositories, and Files.
 * Uses the user's encrypted OAuth or Personal Access Token (PAT).
 */

export interface NormalizedResource {
  provider: "github";
  providerName: "GitHub";
  providerIcon: "github";
  resourceType: "pull_request" | "issue" | "commit" | "release" | "repository" | "file";
  externalId: string;
  canonicalUrl: string;
  title: string;
  description?: string;
  source: { name: string; icon?: string; url?: string };
  author?: { name: string; username?: string; avatarUrl?: string; url?: string };
  status?: { key: string; label: string; color?: string; bg?: string };
  metadata: Record<string, unknown>;
  timestamps: {
    createdAt?: string;
    updatedAt?: string;
    closedAt?: string;
    mergedAt?: string;
  };
}

export async function fetchGitHubResource(
  token: string | null,
  resourceType: "pull_request" | "issue" | "commit" | "release" | "repository" | "file",
  params: Record<string, string>,
): Promise<{ resource?: NormalizedResource; errorStatus?: number; errorMessage?: string }> {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Noska-Workspace/1.0",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const { owner, repo, number, sha, tag, path, ref } = params;
  const baseUrl = "https://api.github.com";

  try {
    if (resourceType === "pull_request" && number) {
      const res = await fetch(`${baseUrl}/repos/${owner}/${repo}/pulls/${number}`, { headers });
      if (!res.ok) return { errorStatus: res.status, errorMessage: `GitHub API returned ${res.status}` };
      const pr = await res.json();

      let statusKey = "open";
      let statusLabel = "Open";
      let color = "#2da44e"; // Green
      let bg = "rgba(45, 164, 78, 0.15)";

      if (pr.merged) {
        statusKey = "merged";
        statusLabel = "Merged";
        color = "#8250df"; // Purple
        bg = "rgba(130, 80, 223, 0.15)";
      } else if (pr.state === "closed") {
        statusKey = "closed";
        statusLabel = "Closed";
        color = "#cf222e"; // Red
        bg = "rgba(207, 34, 46, 0.15)";
      } else if (pr.draft) {
        statusKey = "draft";
        statusLabel = "Draft";
        color = "#6e7781"; // Gray
        bg = "rgba(110, 119, 129, 0.15)";
      }

      return {
        resource: {
          provider: "github",
          providerName: "GitHub",
          providerIcon: "github",
          resourceType: "pull_request",
          externalId: String(pr.id ?? number),
          canonicalUrl: pr.html_url || `https://github.com/${owner}/${repo}/pull/${number}`,
          title: pr.title || `Pull Request #${number}`,
          description: pr.body ? pr.body.slice(0, 300) : undefined,
          source: {
            name: `${owner}/${repo}`,
            url: `https://github.com/${owner}/${repo}`,
          },
          author: {
            name: pr.user?.login || "Unknown",
            username: pr.user?.login,
            avatarUrl: pr.user?.avatar_url,
            url: pr.user?.html_url,
          },
          status: { key: statusKey, label: statusLabel, color, bg },
          metadata: {
            number: Number(number),
            comments: pr.comments ?? 0,
            reviewComments: pr.review_comments ?? 0,
            commits: pr.commits ?? 0,
            additions: pr.additions ?? 0,
            deletions: pr.deletions ?? 0,
            changedFiles: pr.changed_files ?? 0,
            baseBranch: pr.base?.ref,
            headBranch: pr.head?.ref,
            isDraft: pr.draft ?? false,
          },
          timestamps: {
            createdAt: pr.created_at,
            updatedAt: pr.updated_at,
            closedAt: pr.closed_at,
            mergedAt: pr.merged_at,
          },
        },
      };
    }

    if (resourceType === "issue" && number) {
      const res = await fetch(`${baseUrl}/repos/${owner}/${repo}/issues/${number}`, { headers });
      if (!res.ok) return { errorStatus: res.status, errorMessage: `GitHub API returned ${res.status}` };
      const issue = await res.json();

      const isOpen = issue.state === "open";
      return {
        resource: {
          provider: "github",
          providerName: "GitHub",
          providerIcon: "github",
          resourceType: "issue",
          externalId: String(issue.id ?? number),
          canonicalUrl: issue.html_url || `https://github.com/${owner}/${repo}/issues/${number}`,
          title: issue.title || `Issue #${number}`,
          description: issue.body ? issue.body.slice(0, 300) : undefined,
          source: {
            name: `${owner}/${repo}`,
            url: `https://github.com/${owner}/${repo}`,
          },
          author: {
            name: issue.user?.login || "Unknown",
            username: issue.user?.login,
            avatarUrl: issue.user?.avatar_url,
            url: issue.user?.html_url,
          },
          status: {
            key: isOpen ? "open" : "closed",
            label: isOpen ? "Open" : "Closed",
            color: isOpen ? "#2da44e" : "#cf222e",
            bg: isOpen ? "rgba(45, 164, 78, 0.15)" : "rgba(207, 34, 46, 0.15)",
          },
          metadata: {
            number: Number(number),
            comments: issue.comments ?? 0,
            labels: (issue.labels ?? []).map((l: any) => (typeof l === "object" ? l.name : l)),
            stateReason: issue.state_reason,
          },
          timestamps: {
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            closedAt: issue.closed_at,
          },
        },
      };
    }

    if (resourceType === "commit" && sha) {
      const res = await fetch(`${baseUrl}/repos/${owner}/${repo}/commits/${sha}`, { headers });
      if (!res.ok) return { errorStatus: res.status, errorMessage: `GitHub API returned ${res.status}` };
      const c = await res.json();

      const firstLine = (c.commit?.message || "Commit").split("\n")[0];
      return {
        resource: {
          provider: "github",
          providerName: "GitHub",
          providerIcon: "github",
          resourceType: "commit",
          externalId: c.sha || sha,
          canonicalUrl: c.html_url || `https://github.com/${owner}/${repo}/commit/${sha}`,
          title: firstLine,
          description: c.commit?.message?.length > firstLine.length ? c.commit.message.slice(firstLine.length).trim() : undefined,
          source: {
            name: `${owner}/${repo}`,
            url: `https://github.com/${owner}/${repo}`,
          },
          author: {
            name: c.author?.login || c.commit?.author?.name || "Author",
            username: c.author?.login,
            avatarUrl: c.author?.avatar_url,
            url: c.author?.html_url,
          },
          status: { key: "committed", label: "Committed", color: "#6e7781", bg: "rgba(110, 119, 129, 0.15)" },
          metadata: {
            sha: (c.sha || sha).slice(0, 7),
            fullSha: c.sha || sha,
            additions: c.stats?.additions ?? 0,
            deletions: c.stats?.deletions ?? 0,
            totalFiles: c.files?.length ?? 0,
          },
          timestamps: {
            createdAt: c.commit?.author?.date,
          },
        },
      };
    }

    if (resourceType === "release" && tag) {
      const res = await fetch(`${baseUrl}/repos/${owner}/${repo}/releases/tags/${tag}`, { headers });
      if (!res.ok) return { errorStatus: res.status, errorMessage: `GitHub API returned ${res.status}` };
      const rel = await res.json();

      return {
        resource: {
          provider: "github",
          providerName: "GitHub",
          providerIcon: "github",
          resourceType: "release",
          externalId: String(rel.id || tag),
          canonicalUrl: rel.html_url || `https://github.com/${owner}/${repo}/releases/tag/${tag}`,
          title: rel.name || rel.tag_name || tag,
          description: rel.body ? rel.body.slice(0, 300) : undefined,
          source: {
            name: `${owner}/${repo}`,
            url: `https://github.com/${owner}/${repo}`,
          },
          author: {
            name: rel.author?.login || "Author",
            username: rel.author?.login,
            avatarUrl: rel.author?.avatar_url,
          },
          status: { key: "released", label: rel.prerelease ? "Pre-release" : "Release", color: "#1f883d", bg: "rgba(31, 136, 61, 0.15)" },
          metadata: {
            tagName: rel.tag_name || tag,
            isDraft: rel.draft ?? false,
            isPrerelease: rel.prerelease ?? false,
          },
          timestamps: {
            createdAt: rel.created_at,
            updatedAt: rel.published_at,
          },
        },
      };
    }

    if (resourceType === "repository") {
      const res = await fetch(`${baseUrl}/repos/${owner}/${repo}`, { headers });
      if (!res.ok) return { errorStatus: res.status, errorMessage: `GitHub API returned ${res.status}` };
      const r = await res.json();

      return {
        resource: {
          provider: "github",
          providerName: "GitHub",
          providerIcon: "github",
          resourceType: "repository",
          externalId: String(r.id),
          canonicalUrl: r.html_url || `https://github.com/${owner}/${repo}`,
          title: r.full_name || `${owner}/${repo}`,
          description: r.description || undefined,
          source: {
            name: `${owner}/${repo}`,
            url: r.html_url,
          },
          author: {
            name: r.owner?.login || owner,
            username: r.owner?.login,
            avatarUrl: r.owner?.avatar_url,
          },
          status: { key: r.private ? "private" : "public", label: r.private ? "Private" : "Public", color: "#6e7781", bg: "rgba(110, 119, 129, 0.15)" },
          metadata: {
            stars: r.stargazers_count ?? 0,
            forks: r.forks_count ?? 0,
            openIssues: r.open_issues_count ?? 0,
            language: r.language,
            defaultBranch: r.default_branch,
          },
          timestamps: {
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          },
        },
      };
    }

    if (resourceType === "file" && path) {
      const branchRef = ref || "main";
      return {
        resource: {
          provider: "github",
          providerName: "GitHub",
          providerIcon: "github",
          resourceType: "file",
          externalId: `${owner}/${repo}/${branchRef}/${path}`,
          canonicalUrl: `https://github.com/${owner}/${repo}/blob/${branchRef}/${path}`,
          title: path.split("/").pop() || path,
          description: `File in ${owner}/${repo} (${branchRef})`,
          source: {
            name: `${owner}/${repo}`,
            url: `https://github.com/${owner}/${repo}`,
          },
          status: { key: "file", label: "File", color: "#6e7781", bg: "rgba(110, 119, 129, 0.15)" },
          metadata: {
            path,
            branch: branchRef,
          },
          timestamps: {},
        },
      };
    }

    return { errorStatus: 400, errorMessage: `Unsupported resource type "${resourceType}"` };
  } catch (err) {
    return { errorStatus: 500, errorMessage: err instanceof Error ? err.message : "Fetch failed" };
  }
}
