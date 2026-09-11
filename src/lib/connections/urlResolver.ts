/**
 * Deterministic External URL Resolver
 *
 * Recognizes and parses external resource URLs using provider-defined regex patterns.
 * Deterministic and fast — no LLM or network round-trips required for URL recognition.
 */

import { IntegrationRegistry } from "./registry";
import type { UrlMatchResult, ResourceType } from "./types";

interface UrlPattern {
  providerId: string;
  resourceType: ResourceType;
  regex: RegExp;
  paramNames: string[];
  formatter: (params: Record<string, string>) => { canonicalUrl: string; displayHint: string };
}

const PATTERNS: UrlPattern[] = [
  // ── GitHub Patterns ─────────────────────────────────────────
  // Pull Request: https://github.com/:owner/:repo/pull/:number
  {
    providerId: "github",
    resourceType: "pull_request",
    regex: /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)(?:[#?].*)?$/i,
    paramNames: ["owner", "repo", "number"],
    formatter: (p) => ({
      canonicalUrl: `https://github.com/${p.owner}/${p.repo}/pull/${p.number}`,
      displayHint: `${p.owner}/${p.repo}#${p.number} (PR)`,
    }),
  },
  // Issue: https://github.com/:owner/:repo/issues/:number
  {
    providerId: "github",
    resourceType: "issue",
    regex: /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)(?:[#?].*)?$/i,
    paramNames: ["owner", "repo", "number"],
    formatter: (p) => ({
      canonicalUrl: `https://github.com/${p.owner}/${p.repo}/issues/${p.number}`,
      displayHint: `${p.owner}/${p.repo}#${p.number}`,
    }),
  },
  // Commit: https://github.com/:owner/:repo/commit/:sha
  {
    providerId: "github",
    resourceType: "commit",
    regex: /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/commit\/([0-9a-fA-F]{7,40})(?:[#?].*)?$/i,
    paramNames: ["owner", "repo", "sha"],
    formatter: (p) => ({
      canonicalUrl: `https://github.com/${p.owner}/${p.repo}/commit/${p.sha}`,
      displayHint: `${p.owner}/${p.repo}@${p.sha.slice(0, 7)}`,
    }),
  },
  // Release: https://github.com/:owner/:repo/releases/tag/:tag
  {
    providerId: "github",
    resourceType: "release",
    regex: /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/releases\/tag\/([^\/?#]+)(?:[#?].*)?$/i,
    paramNames: ["owner", "repo", "tag"],
    formatter: (p) => ({
      canonicalUrl: `https://github.com/${p.owner}/${p.repo}/releases/tag/${p.tag}`,
      displayHint: `${p.owner}/${p.repo} ${p.tag}`,
    }),
  },
  // Blob/File: https://github.com/:owner/:repo/blob/:ref/:path
  {
    providerId: "github",
    resourceType: "file",
    regex: /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+?)(?:#L\d+(?:-L\d+)?)?(?:[?].*)?$/i,
    paramNames: ["owner", "repo", "ref", "path"],
    formatter: (p) => ({
      canonicalUrl: `https://github.com/${p.owner}/${p.repo}/blob/${p.ref}/${p.path}`,
      displayHint: `${p.owner}/${p.repo}/${p.path}`,
    }),
  },
  // Repository: https://github.com/:owner/:repo
  {
    providerId: "github",
    resourceType: "repository",
    regex: /^https?:\/\/github\.com\/([^\/]+)\/([^\/?#]+)\/?(?:[?#].*)?$/i,
    paramNames: ["owner", "repo"],
    formatter: (p) => ({
      canonicalUrl: `https://github.com/${p.owner}/${p.repo}`,
      displayHint: `${p.owner}/${p.repo}`,
    }),
  },

  // ── Jira Patterns ───────────────────────────────────────────
  // Jira Issue: https://*.atlassian.net/browse/:key
  {
    providerId: "jira",
    resourceType: "issue",
    regex: /^https?:\/\/([a-zA-Z0-9-]+)\.atlassian\.net\/browse\/([A-Z0-9]+-\d+)(?:[?#].*)?$/i,
    paramNames: ["domain", "key"],
    formatter: (p) => ({
      canonicalUrl: `https://${p.domain}.atlassian.net/browse/${p.key.toUpperCase()}`,
      displayHint: p.key.toUpperCase(),
    }),
  },

  // ── Linear Patterns ─────────────────────────────────────────
  // Linear Issue: https://linear.app/:org/issue/:key
  {
    providerId: "linear",
    resourceType: "issue",
    regex: /^https?:\/\/linear\.app\/([^\/]+)\/issue\/([A-Z0-9]+-\d+)(?:\/[^\/?#]*)?(?:[?#].*)?$/i,
    paramNames: ["org", "key"],
    formatter: (p) => ({
      canonicalUrl: `https://linear.app/${p.org}/issue/${p.key.toUpperCase()}`,
      displayHint: p.key.toUpperCase(),
    }),
  },

  // ── Figma Patterns ──────────────────────────────────────────
  // Figma File: https://www.figma.com/file/:fileId/:title
  // or https://www.figma.com/design/:fileId/:title
  {
    providerId: "figma",
    resourceType: "document",
    regex: /^https?:\/\/(?:www\.)?figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)(?:\/([^\/?#]+))?(?:[?#].*)?$/i,
    paramNames: ["fileId", "title"],
    formatter: (p) => ({
      canonicalUrl: `https://www.figma.com/design/${p.fileId}/${p.title || "untitled"}`,
      displayHint: p.title ? decodeURIComponent(p.title) : `Figma File (${p.fileId})`,
    }),
  },

  // ── Slack Patterns ──────────────────────────────────────────
  // Slack Message: https://*.slack.com/archives/:channel/p:timestamp
  {
    providerId: "slack",
    resourceType: "message",
    regex: /^https?:\/\/([a-zA-Z0-9-]+)\.slack\.com\/archives\/([a-zA-Z0-9]+)\/p(\d+)(?:[?#].*)?$/i,
    paramNames: ["team", "channel", "ts"],
    formatter: (p) => ({
      canonicalUrl: `https://${p.team}.slack.com/archives/${p.channel}/p${p.ts}`,
      displayHint: `Slack #${p.channel}`,
    }),
  },
];

export class ExternalUrlResolver {
  /**
   * Deterministically detect if a URL belongs to a supported connection provider.
   */
  static detectUrl(rawUrl: string): UrlMatchResult | null {
    if (!rawUrl || typeof rawUrl !== "string") return null;
    const trimmed = rawUrl.trim();

    // Must be a valid HTTP(S) URL
    if (!/^https?:\/\//i.test(trimmed)) return null;

    for (const pattern of PATTERNS) {
      const match = trimmed.match(pattern.regex);
      if (match) {
        const provider = IntegrationRegistry.get(pattern.providerId);
        if (!provider) continue;

        const params: Record<string, string> = {};
        pattern.paramNames.forEach((name, idx) => {
          params[name] = match[idx + 1] ?? "";
        });

        // Filter out non-repo paths on github (e.g. settings, notifications, explore, pricing)
        if (pattern.providerId === "github" && pattern.resourceType === "repository") {
          const reserved = ["settings", "notifications", "explore", "pricing", "marketplace", "features", "topics", "collections", "trending", "login", "signup", "about", "contact"];
          if (reserved.includes(params.owner?.toLowerCase()) || !params.repo) {
            continue;
          }
        }

        const { canonicalUrl, displayHint } = pattern.formatter(params);

        return {
          matched: true,
          provider,
          resourceType: pattern.resourceType,
          params,
          canonicalUrl,
          displayHint,
        };
      }
    }

    return null;
  }

  /**
   * Normalizes a URL to its standard canonical representation.
   */
  static normalizeUrl(url: string): string {
    const match = this.detectUrl(url);
    if (match) return match.canonicalUrl;
    try {
      const u = new URL(url.trim());
      // Strip common tracking queries (utm_*, ref, etc.)
      const cleanParams = new URLSearchParams();
      for (const [k, v] of u.searchParams.entries()) {
        if (!k.startsWith("utm_") && k !== "fbclid" && k !== "gclid" && k !== "ref") {
          cleanParams.set(k, v);
        }
      }
      u.search = cleanParams.toString() ? `?${cleanParams.toString()}` : "";
      return u.toString();
    } catch {
      return url.trim();
    }
  }
}
