import { useCallback, useEffect, useState } from "react";
import { APP_CURRENT_VERSION } from "@/lib/versionService";

// Per-version "What's New" flow: after the desktop app updates, the release
// notes for the new version are fetched from the public releases repo and
// shown once. Dismissing stores the version — the notes never appear again
// until the next update ships a new version. First-ever runs are marked seen
// silently (there was no update to explain).

const SEEN_KEY = "noska_release_notes_seen_version";
const GH_RELEASE_API =
  "https://api.github.com/repos/shrikrishna-lab/noska-desktop-releases/releases/tags/desktop-v";

export interface ReleaseNotes {
  version: string; // normalized "vX.Y.Z"
  title: string;
  body: string; // markdown
  url: string;
}

function readSeenVersion(): string {
  try {
    return localStorage.getItem(SEEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function markSeen(version: string) {
  try {
    localStorage.setItem(SEEN_KEY, version);
  } catch { /* private mode — notes may re-show, acceptable */ }
}

async function fetchNotesFor(version: string): Promise<ReleaseNotes | null> {
  const tag = version.startsWith("desktop-v")
    ? version
    : `desktop-v${version.replace(/^v/, "")}`;
  try {
    const res = await fetch(`${GH_RELEASE_API}${tag}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return null; // 404 = notes not published yet for this version
    const rel = (await res.json()) as {
      name?: string;
      body?: string;
      html_url?: string;
      tag_name?: string;
    };
    if (!rel.body || !rel.body.trim()) return null;
    return {
      version: version.startsWith("v") ? version : `v${version.replace(/^desktop-v/, "")}`,
      title: rel.name || `What's new in ${version}`,
      body: rel.body,
      url: rel.html_url ?? `https://github.com/shrikrishna-lab/noska-desktop-releases/releases/tag/${tag}`,
    };
  } catch {
    return null;
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^[^\d]*/, "").split("-")[0].split(".").map(Number);
  const pb = b.replace(/^[^\d]*/, "").split("-")[0].split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

// Users can skip versions (the updater always jumps to latest), so the
// What's New covers EVERY published release between the last-seen version
// and the current one — not just the current version's notes.
async function fetchNotesBetween(
  seenVersion: string,
  currentVersion: string,
): Promise<ReleaseNotes | null> {
  try {
    const res = await fetch(
      "https://api.github.com/repos/shrikrishna-lab/noska-desktop-releases/releases?per_page=30",
      { headers: { Accept: "application/vnd.github+json" } },
    );
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
      .map((r) => ({ ...r, version: (r.tag_name ?? "").replace(/^desktop-v/, "v") }))
      .filter((r) => {
        const v = compareVersions(r.version, seenVersion);
        return v > 0 && compareVersions(r.version, currentVersion) <= 0;
      })
      .sort((a, b) => compareVersions(a.version, b.version)); // oldest first

    if (inRange.length === 0) return null;

    if (inRange.length === 1) {
      const r = inRange[0];
      return {
        version: r.version,
        title: r.name || `What's new in ${r.version}`,
        body: r.body!,
        url: r.html_url ?? `https://github.com/shrikrishna-lab/noska-desktop-releases/releases/tag/${r.tag_name}`,
      };
    }

    // Multiple versions skipped — compose one body with a section per release
    // (oldest first, each entry's own "# title" line dropped to avoid
    // duplicate titles; the modal chrome shows the current version).
    const sections = inRange.map((r) => {
      const date = r.created_at ? new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
      const bodyLines = (r.body ?? "").split("\n").filter((l) => !/^#\s/.test(l));
      return [`### ${r.version}${date ? ` — ${date}` : ""}`, ...bodyLines].join("\n");
    });
    return {
      version: currentVersion.startsWith("v") ? currentVersion : `v${currentVersion.replace(/^desktop-v/, "")}`,
      title: `What's new in ${currentVersion.startsWith("v") ? currentVersion : `v${currentVersion.replace(/^desktop-v/, "")}`}`,
      body: sections.join("\n\n"),
      url: `https://github.com/shrikrishna-lab/noska-desktop-releases/releases/tag/desktop-v${currentVersion.replace(/^v/, "")}`,
    };
  } catch {
    return null;
  }
}

export function useReleaseNotes() {
  const [notes, setNotes] = useState<ReleaseNotes | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!APP_CURRENT_VERSION) return;
    const seen = readSeenVersion();
    const current = APP_CURRENT_VERSION;

    if (seen === current) {
      // Already shown/handled for this version — cycle complete.
      setReady(true);
      return;
    }

    if (seen === "") {
      // First run on this device: no update happened, don't interrupt.
      markSeen(current);
      setReady(true);
      return;
    }

    // Version changed since we last saw notes → this is an update. Show the
    // notes for every version between the last-seen one and now.
    let cancelled = false;
    fetchNotesBetween(seen, current).then((n) => {
      if (cancelled) return;
      if (n) {
        setNotes(n);
        markSeen(current);
        setReady(true);
        return;
      }
      // Range unavailable — fall back to the current version's notes alone.
      return fetchNotesFor(current);
    }).then((n) => {
      if (cancelled) return;
      if (n) setNotes(n);
      // No notes published for this version — mark seen so we don't retry
      // every launch; the next update will trigger again.
      markSeen(current);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    setNotes(null);
    markSeen(APP_CURRENT_VERSION);
  }, []);

  return { notes, dismiss, ready };
}
