// Desktop window shell: keeps the window completely borderless and
// edge-to-edge. The only chrome is an INVISIBLE 4px drag strip along the top
// edge (no visible bar, no controls — quit lives in the tray; snap/Alt+F4
// work natively). Inert on the web.

import type { ReactNode } from "react";
import { isDesktop } from "../../lib/desktop/platform";

export default function DesktopShell({ children }: { children: ReactNode }) {
  if (!isDesktop()) return <>{children}</>;
  return (
    <>
      {children}
      <div
        data-tauri-drag-region
        aria-hidden
        className="fixed top-0 left-0 right-0 z-[10000]"
        style={{ height: 4 }}
      />
    </>
  );
}
