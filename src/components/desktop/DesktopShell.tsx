import type { ReactNode } from "react";
import { isDesktop, isMobile } from "../../platform";
import { DesktopTitleBar } from "./DesktopTitleBar";

export default function DesktopShell({ children }: { children: ReactNode }) {
  if (!isDesktop() || isMobile()) return <>{children}</>;
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <DesktopTitleBar />
      <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  );
}

