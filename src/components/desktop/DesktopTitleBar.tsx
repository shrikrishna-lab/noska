import { useEffect, useState, useCallback } from "react";
import { Minus, Square, Copy, X } from "lucide-react";
import { isDesktop, isMobile, getPlatform } from "@/platform";

export function DesktopTitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const platform = getPlatform();

  useEffect(() => {
    if (!isDesktop() || isMobile()) return;

    let unlistenResize: (() => void) | undefined;

    const setupWindow = async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const appWindow = getCurrentWindow();
        const max = await appWindow.isMaximized();
        setIsMaximized(max);

        unlistenResize = await appWindow.onResized(async () => {
          try {
            const isMax = await appWindow.isMaximized();
            setIsMaximized(isMax);
          } catch {
            // ignore in mock environments
          }
        });
      } catch {
        // quiet fail if window API is not available
      }
    };

    setupWindow();

    return () => {
      if (unlistenResize) unlistenResize();
    };
  }, []);

  const handleMinimize = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().minimize();
    } catch (err) {
      console.error("Failed to minimize window:", err);
    }
  }, []);

  const handleToggleMaximize = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
      setIsMaximized(await appWindow.isMaximized());
    } catch (err) {
      console.error("Failed to toggle maximize window:", err);
    }
  }, []);

  const handleClose = useCallback(async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch (err) {
      console.error("Failed to close window:", err);
    }
  }, []);

  if (!isDesktop() || isMobile()) return null;

  return (
    <header
      data-tauri-drag-region
      onDoubleClick={handleToggleMaximize}
      className="sticky top-0 z-[99999] flex h-7.5 w-full select-none items-center justify-between border-b border-black/[0.04] dark:border-white/[0.05] bg-[#F0FAFF] dark:bg-[#0F1117] px-3 transition-colors"
    >
      {/* Left: Brand logo & name */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 pointer-events-none"
      >
        <div className="flex size-4 items-center justify-center rounded-md bg-black/[0.04] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] p-0.5 shadow-2xs">
          <img
            src="/logo.png"
            alt="Noska"
            className="size-3 object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        </div>
        <span className="text-[11.5px] font-medium tracking-tight text-neutral-500 dark:text-neutral-400">
          Noska
        </span>
      </div>

      {/* Middle: Expanded Draggable Region */}
      <div
        data-tauri-drag-region
        className="flex-1 h-full cursor-default"
      />

      {/* Right: Window Controls (Windows / Linux style) */}
      {platform !== "macos" && (
        <div className="flex h-full items-center -mr-3">
          <button
            type="button"
            aria-label="Minimize"
            onClick={handleMinimize}
            className="flex h-full w-10 items-center justify-center text-neutral-400 hover:text-neutral-800 dark:text-neutral-500 dark:hover:text-neutral-200 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:bg-black/[0.08] dark:active:bg-white/[0.1]"
          >
            <Minus className="size-3 stroke-[1.75]" />
          </button>

          <button
            type="button"
            aria-label={isMaximized ? "Restore" : "Maximize"}
            onClick={handleToggleMaximize}
            className="flex h-full w-10 items-center justify-center text-neutral-400 hover:text-neutral-800 dark:text-neutral-500 dark:hover:text-neutral-200 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:bg-black/[0.08] dark:active:bg-white/[0.1]"
          >
            {isMaximized ? (
              <Copy className="size-2.5 stroke-[1.75]" />
            ) : (
              <Square className="size-2.5 stroke-[1.75]" />
            )}
          </button>

          <button
            type="button"
            aria-label="Close"
            onClick={handleClose}
            className="flex h-full w-10 items-center justify-center text-neutral-400 hover:text-white dark:text-neutral-500 dark:hover:text-white transition-colors hover:bg-[#E5484D] dark:hover:bg-[#E5484D] active:bg-[#D9383E]"
          >
            <X className="size-3 stroke-[1.75]" />
          </button>
        </div>
      )}
    </header>
  );
}

export default DesktopTitleBar;
