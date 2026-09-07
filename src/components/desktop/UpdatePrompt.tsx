// Floating "update available" banner for the desktop app.
// Checks the signed update manifest shortly after launch and every 6h.
// Renders ONLY when a newer version exists; installing relaunches the app.

import { useEffect, useState } from "react";
import { checkForUpdate, type AppUpdate } from "../../lib/desktop/updater";
import { Banner04 } from "@/components/ui/banner-04";
import { cleanReleaseNotes, formatVersionTag } from "@/lib/versionService";

export default function UpdatePrompt() {
  const [update, setUpdate] = useState<AppUpdate | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    const run = async () => {
      try {
        const u = await checkForUpdate();
        if (alive && u) setUpdate(u);
      } catch {
        // quiet fail on background update check
      }
    };
    const first = setTimeout(run, 4000);
    timer = window.setInterval(run, 6 * 60 * 60 * 1000);
    return () => {
      alive = false;
      clearTimeout(first);
      if (timer) clearInterval(timer);
    };
  }, []);

  if (!update) return null;

  const formattedVer = formatVersionTag(update.version);

  return (
    <div
      data-testid="update-prompt"
      className="fixed bottom-5 right-5 z-[9500] max-w-lg w-[calc(100vw-40px)] sm:w-auto pointer-events-auto"
    >
      <Banner04
        version={formattedVer}
        title="Update available"
        description={cleanReleaseNotes(update.notes)}
        onUpdate={async () => {
          await update.install(); // relaunches the app when done
        }}
        onLater={() => setUpdate(null)}
      />
    </div>
  );
}
