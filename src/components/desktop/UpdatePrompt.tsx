// Floating "update available" pill for the desktop app.
// Checks the signed update manifest shortly after launch and every 6h.
// Renders ONLY when a newer version exists; installing relaunches the app.

import { useEffect, useState } from "react";
import { checkForUpdate, type AppUpdate } from "../../lib/desktop/updater";

export default function UpdatePrompt() {
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [phase, setPhase] = useState<"idle" | "downloading" | "restarting">("idle");
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    const run = async () => {
      try {
        const u = await checkForUpdate();
        if (alive && u) setUpdate(u);
      } catch {
        if (alive) setError(true);
      }
    };
    const first = setTimeout(run, 8000);
    timer = window.setInterval(run, 6 * 60 * 60 * 1000);
    return () => {
      alive = false;
      clearTimeout(first);
      if (timer) clearInterval(timer);
    };
  }, []);

  if (!update || phase === "restarting") return null;

  return (
    <div
      data-testid="update-prompt"
      className="fixed bottom-4 right-4 z-[9500] rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 shadow-lg"
    >
      {phase === "idle" ? (
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text)]">
            Noska <b>v{update.version}</b> is available
          </span>
          <button
            type="button"
            data-testid="update-install"
            onClick={async () => {
              setPhase("downloading");
              try {
                await update.install(); // relaunches the app when done
              } catch {
                setPhase("idle");
                setError(true);
              }
            }}
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#0F1117] hover:opacity-90 transition"
          >
            Update now
          </button>
          <button
            type="button"
            aria-label="Dismiss update"
            onClick={() => setUpdate(null)}
            className="text-xs text-[var(--text-secondary)] hover:opacity-70"
          >
            ✕
          </button>
        </div>
      ) : (
        <span className="text-xs text-[var(--text-secondary)]">
          Downloading update… the app will restart.
        </span>
      )}
      {error && phase === "idle" && (
        <span className="ml-2 text-[10px] text-red-400">retry later</span>
      )}
    </div>
  );
}
