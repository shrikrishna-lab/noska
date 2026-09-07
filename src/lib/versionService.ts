import { checkForUpdate, type AppUpdate } from "@/lib/desktop/updater"
import { isDesktop } from "@/lib/desktop/platform"
import { supabaseAnon } from "@/lib/supabase"

export interface RealVersionInfo {
  version: string
  title: string
  description: string
  isUpdateAvailable: boolean
  installUpdate?: () => Promise<void>
}

// Real fallback values from codebase metadata
export const APP_CURRENT_VERSION = "v1.0.9"
export const LATEST_CHANGELOG_VERSION = "v1.2.0"
export const REAL_RELEASE_TITLE = "Dynamic Island Voice, Visual Settings & Developer API"
export const REAL_RELEASE_DESCRIPTION =
  "Dynamic Island fluid voice capsule, real-time visual customization studio, and developer API keys suite."

const LATEST_MANIFEST_URL =
  "https://github.com/shrikrishna-lab/noska-desktop-releases/releases/latest/download/latest.json"
const GH_RELEASE_API =
  "https://api.github.com/repos/shrikrishna-lab/noska-desktop-releases/releases/latest"

/**
 * Normalizes any version string to standard "vX.Y.Z" format
 */
export function formatVersionTag(v?: string | null): string {
  if (!v) return LATEST_CHANGELOG_VERSION
  const clean = v.replace(/^desktop-v?|^v?/, "").trim()
  return `v${clean}`
}

/**
 * Strips raw markdown headers, links, and bullets to produce a clean single-line release summary
 */
export function cleanReleaseNotes(rawNotes?: string | null): string {
  if (!rawNotes) return REAL_RELEASE_DESCRIPTION

  const lines = rawNotes
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("---"))

  for (const line of lines) {
    const cleaned = line
      .replace(/^[-*•]\s*/, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // strip markdown links
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\`([^`]+)\`/g, "$1")
      .trim()
    if (cleaned.length > 15 && !cleaned.toLowerCase().includes("windows users on")) {
      return cleaned
    }
  }

  return REAL_RELEASE_DESCRIPTION
}

/**
 * Dynamically resolves the latest release information whenever a new release is published:
 * 1. Desktop Tauri Updater (checks signed latest.json when running on desktop)
 * 2. GitHub Releases direct manifest (latest.json) — instant, no rate limits
 * 3. GitHub API latest release
 * 4. Supabase `changelog_entries` table (if team publishes a release note in DB)
 * 5. Codebase changelog fallback
 */
export async function getRealVersionInfo(): Promise<RealVersionInfo> {
  // 1. Desktop Tauri updater check (real-time for installed desktop app)
  if (isDesktop()) {
    try {
      const update: AppUpdate | null = await checkForUpdate()
      if (update && update.version) {
        const formattedVer = formatVersionTag(update.version)
        return {
          version: formattedVer,
          title: `Noska ${formattedVer} Update Available`,
          description: cleanReleaseNotes(update.notes),
          isUpdateAvailable: true,
          installUpdate: update.install,
        }
      }
    } catch {
      // Continue to online checks
    }
  }

  // 2. Direct GitHub latest.json manifest check (works on web & desktop with zero rate limits)
  if (typeof window !== "undefined" && window.fetch) {
    try {
      const res = await fetch(LATEST_MANIFEST_URL, {
        headers: { accept: "application/json" },
      })
      if (res.ok) {
        const manifest = await res.json()
        if (manifest?.version) {
          const formattedVer = formatVersionTag(manifest.version)
          return {
            version: formattedVer,
            title: `Noska ${formattedVer} Available`,
            description: cleanReleaseNotes(manifest.notes),
            isUpdateAvailable: true,
          }
        }
      }
    } catch {
      // Continue to next source
    }
  }

  // 3. GitHub Releases REST API check
  if (typeof window !== "undefined" && window.fetch) {
    try {
      const res = await fetch(GH_RELEASE_API, {
        headers: { accept: "application/vnd.github+json" },
      })
      if (res.ok) {
        const data = await res.json()
        const tag = data?.tag_name || data?.name
        if (tag) {
          const formattedTag = formatVersionTag(tag)
          return {
            version: formattedTag,
            title: `Noska ${formattedTag} Available`,
            description: cleanReleaseNotes(data.body),
            isUpdateAvailable: true,
          }
        }
      }
    } catch {
      // Continue to Supabase check
    }
  }

  // 4. Supabase published changelog entries check
  try {
    const { data: entries } = await (supabaseAnon as any)
      .from("changelog_entries")
      .select("version, title, description")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(1)

    if (entries && entries.length > 0 && entries[0]?.version) {
      const entry = entries[0]
      const formattedVer = formatVersionTag(entry.version)
      return {
        version: formattedVer,
        title: entry.title ? `Noska ${formattedVer} Available` : `Noska ${formattedVer} Update`,
        description: cleanReleaseNotes(entry.description),
        isUpdateAvailable: true,
      }
    }
  } catch {
    // Continue to fallback
  }

  // 5. Codebase active release fallback
  return {
    version: LATEST_CHANGELOG_VERSION,
    title: `Noska ${LATEST_CHANGELOG_VERSION} Available`,
    description: REAL_RELEASE_DESCRIPTION,
    isUpdateAvailable: true,
  }
}
