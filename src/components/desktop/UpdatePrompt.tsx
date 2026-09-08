// Floating "update available" banner for the desktop app.
// Checks the signed update manifest shortly after launch, on navigation, and every 6h.
// Renders across the entire app including the login screen whenever a newer version exists.

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { checkForUpdate, type AppUpdate } from "../../lib/desktop/updater";
import { Banner04 } from "@/components/ui/banner-04";
import {
  cleanReleaseNotes,
  formatVersionTag,
  getRealVersionInfo,
} from "@/lib/versionService";

export default function UpdatePrompt() {
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;

    const run = async () => {
      try {
        // 1. Check native Tauri updater first
        const u = await checkForUpdate();
        if (alive && u) {
          setUpdate(u);
          return;
        }

        // 2. Check live GitHub manifest if native updater did not return
        const info = await getRealVersionInfo();
        if (alive && info?.isUpdateAvailable && info.version) {
          setUpdate({
            version: info.version,
            notes: info.description,
            install: info.installUpdate || (async () => {
              if (typeof window !== "undefined") {
                window.open("https://noska.me/download", "_blank");
              }
            }),
          });
        }
      } catch {
        // quiet fail on background update check
      }
    };

    // Quick initial check (500ms) so it shows promptly on launch & login screen
    const first = setTimeout(run, 500);
    timer = window.setInterval(run, 6 * 60 * 60 * 1000);

    return () => {
      alive = false;
      clearTimeout(first);
      if (timer) clearInterval(timer);
    };
  }, [location.pathname]);

  if (!update) return null;

  const formattedVer = formatVersionTag(update.version);

  return (
    <div
      data-testid="update-prompt"
      className="fixed bottom-5 right-5 z-[99999] max-w-lg w-[calc(100vw-40px)] sm:w-auto pointer-events-auto"
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
