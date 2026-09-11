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
    // notes for the new version.
    let cancelled = false;
    fetchNotesFor(current).then((n) => {
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
