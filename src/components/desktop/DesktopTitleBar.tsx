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
      className="sticky top-0 z-[99999] flex h-8 w-full select-none items-center justify-between border-b border-border/40 bg-background/85 px-3 backdrop-blur-xl transition-colors dark:bg-[#12141A]/90 dark:border-white/[0.06]"
    >
      {/* Left: Brand logo & name */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 pointer-events-none"
      >
        <div className="flex size-4.5 items-center justify-center rounded-md bg-neutral-900 dark:bg-neutral-800 p-0.5 shadow-xs ring-1 ring-white/10">
          <img
            src="/logo.png"
            alt="Noska"
            className="size-3.5 object-contain"
            onError={(e) => {
              // Fallback if logo fails
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        </div>
        <span className="text-[12px] font-medium tracking-tight text-neutral-600 dark:text-neutral-400">
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
            className="flex h-full w-11 items-center justify-center text-neutral-500 transition-colors hover:bg-neutral-200/60 hover:text-neutral-900 active:bg-neutral-300/60 dark:text-neutral-400 dark:hover:bg-neutral-800/70 dark:hover:text-white"
          >
            <Minus className="size-3.5 stroke-[1.75]" />
          </button>

          <button
            type="button"
            aria-label={isMaximized ? "Restore" : "Maximize"}
            onClick={handleToggleMaximize}
            className="flex h-full w-11 items-center justify-center text-neutral-500 transition-colors hover:bg-neutral-200/60 hover:text-neutral-900 active:bg-neutral-300/60 dark:text-neutral-400 dark:hover:bg-neutral-800/70 dark:hover:text-white"
          >
            {isMaximized ? (
              <Copy className="size-3 stroke-[1.75]" />
            ) : (
              <Square className="size-3 stroke-[1.75]" />
            )}
          </button>

          <button
            type="button"
            aria-label="Close"
            onClick={handleClose}
            className="flex h-full w-11 items-center justify-center text-neutral-500 transition-colors hover:bg-red-500 hover:text-white active:bg-red-600 dark:text-neutral-400 dark:hover:bg-red-600 dark:hover:text-white"
          >
            <X className="size-3.5 stroke-[1.75]" />
          </button>
        </div>
      )}
    </header>
  );
}

export default DesktopTitleBar;
