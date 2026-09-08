import { checkForUpdate, type AppUpdate } from "@/lib/desktop/updater"
import { isDesktop } from "@/lib/desktop/platform"
import { supabaseAnon } from "@/lib/supabase"
import packageJson from "../../package.json"

export interface RealVersionInfo {
  version: string
  title: string
  description: string
  isUpdateAvailable: boolean
  installUpdate?: () => Promise<void>
}

// Current app version read dynamically from package.json (no hardcoded versions)
export const APP_CURRENT_VERSION = packageJson.version ? `v${packageJson.version}` : ""
export const LATEST_CHANGELOG_VERSION = APP_CURRENT_VERSION
export const REAL_RELEASE_TITLE = "Update available"
export const REAL_RELEASE_DESCRIPTION =
  "Restart the app to install the latest improvements and fixes."

const LATEST_MANIFEST_URL =
  "https://github.com/shrikrishna-lab/noska-desktop-releases/releases/latest/download/latest.json"
const GH_RELEASE_API =
  "https://api.github.com/repos/shrikrishna-lab/noska-desktop-releases/releases/latest"

/**
 * Compares two semantic version strings to determine if remote is newer than current
 */
export function isNewerVersion(remoteVer: string, currentVer: string): boolean {
  const cleanRemote = remoteVer.replace(/^desktop-v?|^v?/, "").trim()
  const cleanCurrent = currentVer.replace(/^desktop-v?|^v?/, "").trim()
  if (!cleanRemote || !cleanCurrent) return false
  if (cleanRemote === cleanCurrent) return false

  const rParts = cleanRemote.split(".").map((n) => parseInt(n, 10) || 0)
  const cParts = cleanCurrent.split(".").map((n) => parseInt(n, 10) || 0)
  const maxLen = Math.max(rParts.length, cParts.length)
  for (let i = 0; i < maxLen; i++) {
    const r = rParts[i] || 0
    const c = cParts[i] || 0
    if (r > c) return true
    if (r < c) return false
  }
  return false
}

/**
 * Normalizes any version string to standard "vX.Y.Z" format.
 * Returns empty string if no version is provided (never returns hardcoded strings).
 */
export function formatVersionTag(v?: string | null): string {
  if (!v) return ""
  const clean = v.replace(/^desktop-v?|^v?/, "").trim()
  return clean ? `v${clean}` : ""
}

/**
 * Strips raw markdown headers, packaging/installer lines, and bullets to produce a clean release summary
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

    const lower = cleaned.toLowerCase()
    // Skip installer boilerplate, packaging lines, and download links
    if (
      cleaned.length > 10 &&
      !lower.includes("windows users on") &&
      !lower.startsWith("installers for") &&
      !lower.includes(".exe") &&
      !lower.includes(".msi") &&
      !lower.includes(".dmg") &&
      !lower.includes(".appimage") &&
      !lower.startsWith("assets") &&
      !lower.startsWith("automated release")
    ) {
      return cleaned
    }
  }

  return REAL_RELEASE_DESCRIPTION
}

/**
 * Dynamically resolves the real, live version published on GitHub / Tauri in real-time.
 * Every check bypasses browser caches with `cache: "no-store"` so that when you push
 * a new release, the app immediately picks up the new version.
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
          title: "Update available",
          description: cleanReleaseNotes(update.notes),
          isUpdateAvailable: true,
          installUpdate: update.install,
        }
      }
    } catch {
      // Continue to online checks
    }
  }

  // 2. Direct GitHub latest.json manifest check (instant live release manifest, zero cache)
  if (typeof window !== "undefined" && window.fetch) {
    try {
      const res = await fetch(LATEST_MANIFEST_URL, {
        headers: { accept: "application/json" },
        cache: "no-store",
      })
      if (res.ok) {
        const manifest = await res.json()
        if (manifest?.version) {
          const formattedVer = formatVersionTag(manifest.version)
          const isNewer = isNewerVersion(formattedVer, APP_CURRENT_VERSION)
          return {
            version: formattedVer,
            title: "Update available",
            description: cleanReleaseNotes(manifest.notes),
            isUpdateAvailable: isNewer,
          }
        }
      }
    } catch {
      // Continue to next source
    }
  }

  // 3. GitHub Releases REST API check (live GitHub API, zero cache)
  if (typeof window !== "undefined" && window.fetch) {
    try {
      const res = await fetch(GH_RELEASE_API, {
        headers: { accept: "application/vnd.github+json" },
        cache: "no-store",
      })
      if (res.ok) {
        const data = await res.json()
        const tag = data?.tag_name || data?.name
        if (tag) {
          const formattedTag = formatVersionTag(tag)
          const isNewer = isNewerVersion(formattedTag, APP_CURRENT_VERSION)
          return {
            version: formattedTag,
            title: "Update available",
            description: cleanReleaseNotes(data.body),
            isUpdateAvailable: isNewer,
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
      const isNewer = isNewerVersion(formattedVer, APP_CURRENT_VERSION)
      return {
        version: formattedVer,
        title: "Update available",
        description: cleanReleaseNotes(entry.description),
        isUpdateAvailable: isNewer,
      }
    }
  } catch {
    // Continue to fallback
  }

  // 5. If no remote update is found, report current app version with isUpdateAvailable: false
  return {
    version: APP_CURRENT_VERSION,
    title: "Update available",
    description: REAL_RELEASE_DESCRIPTION,
    isUpdateAvailable: false,
  }
}
