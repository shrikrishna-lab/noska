// Tracks an in-flight OAuth redirect so we can recover when Clerk's Account
// Portal drops the user on its configured Home URL (the marketing site)
// instead of /sso-callback. localStorage (not sessionStorage) because the
// portal's fallback navigation is a fresh document load.
const KEY = "noska_oauth_started_at";

export function markOAuthIntent(): void {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {}
}

export function clearOAuthIntent(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

// Returns true only if an OAuth attempt started recently (default 10 min).
// Always consumes the flag so a stale entry can never trap a signed-in
// user browsing marketing pages later.
export function consumeOAuthIntent(maxAgeMs = 10 * 60 * 1000): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    localStorage.removeItem(KEY);
    const started = Number(raw);
    return Number.isFinite(started) && Date.now() - started <= maxAgeMs;
  } catch {
    return false;
  }
}
