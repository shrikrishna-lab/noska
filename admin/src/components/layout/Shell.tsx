import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { CommandCenterProvider, AdminCommandCenter, useCommandCenter } from "@/components/ui/AdminCommandCenter";
import { DynamicIslandNotificationProvider } from "@/components/ui/DynamicIslandNotification";

function ShellInner() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const { trigger } = useCommandCenter();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((p) => !p);
      }
      // Ctrl+Space to summon Quick Actions Command Center
      if (e.ctrlKey && e.key === " ") {
        e.preventDefault();
        trigger({ type: "quick_actions" });
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [trigger]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((p) => !p)} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileOpen(true)} onSearchOpen={() => setSearchOpen(true)} />
        <main className="flex-1 overflow-y-auto isolate">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AdminCommandCenter />
    </div>
  );
}

export function Shell() {
  return (
    <DynamicIslandNotificationProvider>
      <CommandCenterProvider>
        <ShellInner />
      </CommandCenterProvider>
    </DynamicIslandNotificationProvider>
  );
}

