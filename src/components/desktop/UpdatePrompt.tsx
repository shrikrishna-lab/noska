import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { checkForUpdate, type AppUpdate } from "../../lib/desktop/updater";
import { Banner04 } from "@/components/ui/banner-04";
import {
  cleanReleaseNotes,
  formatVersionTag,
  getRealVersionInfo,
} from "@/lib/versionService";
import NoskaOrbitalUpdater from "./NoskaOrbitalUpdater";
import packageJson from "../../../package.json";
import { motion, AnimatePresence } from "framer-motion";

export default function UpdatePrompt() {
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [showOrbitalModal, setShowOrbitalModal] = useState(false);
  const location = useLocation();
  const currentVersion = packageJson.version || "1.1.1";

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

  // Support manual desktop trigger
  useEffect(() => {
    const handleManualCheck = () => {
      setShowOrbitalModal(true);
    };
    window.addEventListener("noska:open-desktop-updater", handleManualCheck);
    return () => window.removeEventListener("noska:open-desktop-updater", handleManualCheck);
  }, []);

  const formattedVer = update ? formatVersionTag(update.version) : "1.2.0";

  return (
    <>
      {update && !showOrbitalModal && (
        <div
          data-testid="update-prompt"
          className="fixed bottom-5 right-5 z-[99999] max-w-lg w-[calc(100vw-40px)] sm:w-auto pointer-events-auto"
        >
          <Banner04
            version={formattedVer}
            title="Update available"
            onUpdate={() => {
              setShowOrbitalModal(true);
            }}
            onLater={() => setUpdate(null)}
          />
        </div>
      )}

      {/* Full-Screen Orbital Updater Modal Window */}
      <AnimatePresence>
        {showOrbitalModal && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-[#0B0D13]/95 text-[#EDEBE5] overflow-hidden select-none font-sans p-4 sm:p-8 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.25 } }}
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
              className="relative z-10 w-full max-w-4xl h-[660px] overflow-hidden rounded-3xl border border-white/20 shadow-[0_25px_80px_rgba(0,0,0,0.7),0_0_50px_rgba(255,140,115,0.25)]"
            >
              <NoskaOrbitalUpdater
                mode="updater"
                currentVersion={currentVersion}
                targetVersion={update?.version || formattedVer}
                onClose={() => setShowOrbitalModal(false)}
                onComplete={async () => {
                  if (update?.notes) {
                    try {
                      localStorage.setItem("noska_pending_update_notes", update.notes);
                    } catch {}
                  }
                  if (update?.version) {
                    try {
                      localStorage.setItem("noska_pending_update_version", update.version);
                    } catch {}
                  }
                  if (update?.install) {
                    await update.install();
                  }
                }}
                autoStart={true}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

