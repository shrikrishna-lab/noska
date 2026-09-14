import { useCallback, useEffect, useState } from "react";
import { APP_CURRENT_VERSION } from "@/lib/versionService";
import { supabaseAnon } from "@/lib/supabase";
import { DEFAULT_CHANGELOG_ENTRIES } from "@/pages/marketing/Changelog";

// Per-version "What's New" release notes system:
// After the Noska desktop app updates, the release notes for the new version
// are fetched from multi-tiered sources (cached update payload, GitHub releases,
// latest.json CDN manifest, Supabase changelog, and built-in fallbacks) and
// displayed in a dedicated What's New modal.
//
// Crucial Rule: Release notes stay visible until the user explicitly dismisses them.
// Upon dismissal, the seen version is saved to localStorage so the modal NEVER
// re-shows for that version until a newer app update occurs.

export const RELEASE_NOTES_SEEN_KEY = "noska_release_notes_seen_version";
export const PENDING_UPDATE_NOTES_KEY = "noska_pending_update_notes";
export const PENDING_UPDATE_VERSION_KEY = "noska_pending_update_version";

const GH_RELEASES_LIST_API =
  "https://api.github.com/repos/shrikrishna-lab/noska-desktop-releases/releases?per_page=30";
const GH_RELEASE_TAG_API =
  "https://api.github.com/repos/shrikrishna-lab/noska-desktop-releases/releases/tags/";
const GH_LATEST_MANIFEST_URL =
  "https://github.com/shrikrishna-lab/noska-desktop-releases/releases/latest/download/latest.json";

export interface ReleaseNotes {
  version: string; // normalized "vX.Y.Z"
  title: string;
  body: string; // markdown
  url: string;
  tag?: string;
  publishedAt?: string;
}

export function readSeenVersion(): string {
  try {
    return localStorage.getItem(RELEASE_NOTES_SEEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function markSeen(version: string) {
  try {
    if (version) {
      localStorage.setItem(RELEASE_NOTES_SEEN_KEY, version);
    }
  } catch {
    /* private mode — notes may re-show, acceptable */
  }
}

export function normalizeVersion(v?: string | null): string {
  if (!v) return "";
  const clean = v.replace(/^desktop-v?|^v?/, "").trim();
  return clean ? `v${clean}` : "";
}

export function parseSemver(v: string): number[] {
  const clean = v.replace(/^[^\d]*/, "").split("-")[0];
  return clean.split(".").map((n) => parseInt(n, 10) || 0);
}

export function compareVersions(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  const maxLen = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < maxLen; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Fetch notes across a version range when user skipped multiple updates
 */
async function fetchNotesBetween(
  seenVersion: string,
  currentVersion: string,
): Promise<ReleaseNotes | null> {
  try {
    const res = await fetch(GH_RELEASES_LIST_API, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const releases = (await res.json()) as Array<{
      name?: string;
      body?: string;
      html_url?: string;
      tag_name?: string;
      created_at?: string;
      draft?: boolean;
      prerelease?: boolean;
    }>;

    const inRange = releases
      .filter((r) => !r.draft && !r.prerelease && r.body && r.body.trim() && r.tag_name)
      .map((r) => ({ ...r, version: normalizeVersion(r.tag_name) }))
      .filter((r) => {
        const vDiffSeen = compareVersions(r.version, seenVersion);
        const vDiffCurrent = compareVersions(r.version, currentVersion);
        return vDiffSeen > 0 && vDiffCurrent <= 0;
      })
      .sort((a, b) => compareVersions(a.version, b.version)); // oldest first

    if (inRange.length === 0) return null;

    if (inRange.length === 1) {
      const r = inRange[0];
      return {
        version: r.version,
        title: r.name || `What's new in ${r.version}`,
        body: r.body!,
        url:
          r.html_url ??
          `https://github.com/shrikrishna-lab/noska-desktop-releases/releases/tag/${r.tag_name}`,
        publishedAt: r.created_at,
      };
    }

    // Multiple versions skipped — compose aggregated body with sections
    const sections = inRange.map((r) => {
      const date = r.created_at
        ? new Date(r.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })
        : "";
      const bodyLines = (r.body ?? "").split("\n").filter((l) => !/^#\s/.test(l));
      return [`### ${r.version}${date ? ` — ${date}` : ""}`, ...bodyLines].join("\n");
    });

    const normCurrent = normalizeVersion(currentVersion);
    return {
      version: normCurrent,
      title: `What's new in ${normCurrent}`,
      body: sections.join("\n\n---\n\n"),
      url: `https://github.com/shrikrishna-lab/noska-desktop-releases/releases/tag/desktop-${normCurrent}`,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch release notes for a single version using multi-tier fallback
 */
async function fetchNotesFor(version: string): Promise<ReleaseNotes | null> {
  const normVer = normalizeVersion(version);
  const cleanVer = normVer.replace(/^v/, "");

  // Tier 1: Try GitHub Release Tag endpoints
  const tagCandidates = [`desktop-v${cleanVer}`, `v${cleanVer}`, cleanVer];
  for (const tag of tagCandidates) {
    try {
      const res = await fetch(`${GH_RELEASE_TAG_API}${tag}`, {
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store",
      });
      if (res.ok) {
        const rel = (await res.json()) as {
          name?: string;
          body?: string;
          html_url?: string;
          tag_name?: string;
          created_at?: string;
        };
        if (rel.body && rel.body.trim()) {
          return {
            version: normVer,
            title: rel.name || `What's new in ${normVer}`,
            body: rel.body,
            url:
              rel.html_url ??
              `https://github.com/shrikrishna-lab/noska-desktop-releases/releases/tag/${tag}`,
            publishedAt: rel.created_at,
          };
        }
      }
    } catch {
      // try next candidate
    }
  }

  // Tier 2: Try GitHub static CDN latest.json manifest (Zero rate limit)
  try {
    const res = await fetch(GH_LATEST_MANIFEST_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const manifest = await res.json();
      if (manifest?.notes && manifest.notes.trim()) {
        const manifestVer = normalizeVersion(manifest.version || version);
        return {
          version: manifestVer,
          title: `What's new in ${manifestVer}`,
          body: manifest.notes,
          url: `https://github.com/shrikrishna-lab/noska-desktop-releases/releases/tag/desktop-${manifestVer}`,
          publishedAt: manifest.pub_date,
        };
      }
    }
  } catch {
    // try next tier
  }

  // Tier 3: Supabase published changelog_entries table
  try {
    const { data: entries } = await (supabaseAnon as any)
      .from("changelog_entries")
      .select("id, version, title, description, created_at, published_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(10);

    if (entries && entries.length > 0) {
      // Find matching version or fallback to latest entry
      const match =
        entries.find(
          (e: any) =>
            normalizeVersion(e.version) === normVer ||
            normalizeVersion(e.version) === normalizeVersion(version),
        ) || entries[0];

      if (match?.description) {
        const entryVer = normalizeVersion(match.version) || normVer;
        return {
          version: entryVer,
          title: match.title || `What's new in ${entryVer}`,
          body: match.description,
          url: `https://noska.me/changelog`,
          publishedAt: match.published_at || match.created_at,
        };
      }
    }
  } catch {
    // try next tier
  }

  // Tier 4: Built-in DEFAULT_CHANGELOG_ENTRIES fallback
  if (DEFAULT_CHANGELOG_ENTRIES && DEFAULT_CHANGELOG_ENTRIES.length > 0) {
    const localMatch =
      DEFAULT_CHANGELOG_ENTRIES.find(
        (e) => normalizeVersion(e.version) === normVer,
      ) || DEFAULT_CHANGELOG_ENTRIES[0];

    if (localMatch?.description) {
      const localVer = normalizeVersion(localMatch.version) || normVer;
      return {
        version: localVer,
        title: localMatch.title || `What's new in ${localVer}`,
        body: localMatch.description,
        url: `https://noska.me/changelog`,
        publishedAt: localMatch.published_at || localMatch.created_at,
      };
    }
  }

  return null;
}

/**
 * Resolves release notes for an update using cached payload or online sources
 */
export async function resolveReleaseNotes(
  seenVersion: string,
  currentVersion: string,
): Promise<ReleaseNotes | null> {
  const normCurrent = normalizeVersion(currentVersion);

  // 1. Check if installer cached update notes directly before relaunch
  try {
    const cachedNotes = localStorage.getItem(PENDING_UPDATE_NOTES_KEY);
    const cachedVer = localStorage.getItem(PENDING_UPDATE_VERSION_KEY);
    if (cachedNotes && cachedNotes.trim()) {
      return {
        version: normalizeVersion(cachedVer) || normCurrent,
        title: `What's new in ${normalizeVersion(cachedVer) || normCurrent}`,
        body: cachedNotes,
        url: `https://github.com/shrikrishna-lab/noska-desktop-releases/releases/tag/desktop-${normCurrent}`,
      };
    }
  } catch {}

  // 2. If updating across versions and we have a valid seenVersion, try range notes
  if (seenVersion && seenVersion !== currentVersion) {
    const rangeNotes = await fetchNotesBetween(seenVersion, currentVersion);
    if (rangeNotes) return rangeNotes;
  }

  // 3. Single version notes lookup
  const singleNotes = await fetchNotesFor(currentVersion);
  if (singleNotes) return singleNotes;

  // 4. Fallback: generate default structured notes
  return {
    version: normCurrent,
    title: `What's new in ${normCurrent}`,
    body: `### 🚀 Noska Desktop ${normCurrent}\n- Enhanced app performance, memory optimizations, and security updates.\n- Seamless auto-updating, offline synchronization, and workspace stability improvements.`,
    url: `https://github.com/shrikrishna-lab/noska-desktop-releases/releases/tag/desktop-${normCurrent}`,
  };
}

export function useReleaseNotes() {
  const [notes, setNotes] = useState<ReleaseNotes | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!APP_CURRENT_VERSION) return;
    const seen = readSeenVersion();
    const current = normalizeVersion(APP_CURRENT_VERSION);

    // Case 1: Already seen & dismissed by user for this version
    if (seen === current) {
      setReady(true);
      return;
    }

    // Case 2: First run on a fresh install — mark seen silently so onboarding is undisturbed
    if (seen === "") {
      markSeen(current);
      setReady(true);
      return;
    }

    // Case 3: An app update occurred (seen !== current)!
    // Fetch and display the release notes for the new version.
    let cancelled = false;
    resolveReleaseNotes(seen, current).then((resolved) => {
      if (cancelled) return;
      if (resolved) {
        setNotes(resolved);
      }
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for manual trigger events (e.g. from Help / Settings / About modal)
  useEffect(() => {
    const handleShow = (e: Event) => {
      const customEvent = e as CustomEvent<{ version?: string }>;
      const targetVer = customEvent.detail?.version || APP_CURRENT_VERSION;
      fetchNotesFor(targetVer).then((n) => {
        if (n) {
          setNotes(n);
        } else {
          setNotes({
            version: normalizeVersion(targetVer),
            title: `What's new in ${normalizeVersion(targetVer)}`,
            body: `### 🚀 Noska Desktop ${normalizeVersion(targetVer)}\n- Performance improvements and bug fixes.`,
            url: `https://noska.me/changelog`,
          });
        }
      });
    };

    window.addEventListener("noska:show-release-notes", handleShow);
    return () => window.removeEventListener("noska:show-release-notes", handleShow);
  }, []);

  const dismiss = useCallback(() => {
    const current = normalizeVersion(APP_CURRENT_VERSION);
    markSeen(current);
    try {
      localStorage.removeItem(PENDING_UPDATE_NOTES_KEY);
      localStorage.removeItem(PENDING_UPDATE_VERSION_KEY);
    } catch {}
    setNotes(null);
  }, []);

  const showReleaseNotes = useCallback(async (targetVersion?: string) => {
    const ver = targetVersion || APP_CURRENT_VERSION;
    const n = await fetchNotesFor(ver);
    if (n) {
      setNotes(n);
    }
  }, []);

  return { notes, dismiss, ready, showReleaseNotes };
}
