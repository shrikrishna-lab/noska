// Bridge that lets the react-hot-toast shim mirror every toast onto the
// Dynamic Island without creating a circular import between the shim and
// the provider. The provider registers a handler on mount; the shim emits.

export type IslandToastType = "success" | "error" | "warning" | "info";

type IslandToastHandler = (type: IslandToastType, title: string, description?: string) => void;

let handler: IslandToastHandler | null = null;
let lastEmit = { type: "", title: "", at: 0 };

export function registerIslandToastBridge(h: IslandToastHandler | null): void {
  handler = h;
}

export function emitToIsland(type: IslandToastType, title: string, description?: string): void {
  if (!handler || !title) return;
  // Dedupe: pages that intentionally fire BOTH an island notification and a
  // toast with the same text would otherwise render twice back-to-back.
  const now = Date.now();
  if (lastEmit.type === type && lastEmit.title === title && now - lastEmit.at < 1200) return;
  lastEmit = { type, title, at: now };
  try {
    handler(type, title, description);
  } catch {
    // Never let island failures break toasts.
  }
}
