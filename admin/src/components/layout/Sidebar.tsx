import { useState, type ComponentType } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, PanelRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, NAV_GROUPS, type NavItem } from "@/lib/navigation";
import { useAuth } from "@/lib/auth";
import { hasRole, type AdminRole } from "@/lib/rbac";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function SidebarNavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const location = useLocation();
  const { user } = useAuth();
  const active = location.pathname === item.to;

  if (item.requiresRole && !hasRole(user, item.requiresRole as AdminRole)) return null;

  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
              {item.badge}
            </span>
          )}
        </>
      )}
      {active && (
        <motion.div layoutId="sidebar-active" className="absolute inset-0 -z-10 rounded-lg bg-accent" transition={{ type: "spring", stiffness: 380, damping: 30 }} />
      )}
    </Link>
  );
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const currentGroup = NAV_ITEMS.find((i) => i.to === location.pathname)?.group;

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden" onClick={onMobileClose} />}
      <AnimatePresence mode="wait">
        {(mobileOpen || true) && (
          <motion.aside
            initial={false}
            animate={{ width: collapsed ? 64 : 256 }}
            className={cn(
              "fixed left-0 top-0 z-50 flex h-full flex-col border-r bg-background md:static",
              mobileOpen ? "block" : "hidden md:flex"
            )}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <div className="flex h-14 items-center gap-2 border-b px-4">
              {!collapsed && (
                <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
                  <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Noska" className="h-7 w-7 rounded-lg" />
                  <span>Noska Admin</span>
                </Link>
              )}
              {collapsed && (
                <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Noska" className="mx-auto h-7 w-7 rounded-lg" />
              )}
              <Button variant="ghost" size="icon" className="ml-auto hidden md:flex" onClick={onToggle}>
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="ml-auto md:hidden" onClick={onMobileClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {NAV_GROUPS.map((group) => {
                const items = NAV_ITEMS.filter((i) => i.group === group.id);
                if (!items.length) return null;
                return (
                  <div key={group.id} className="mb-4">
                    {!collapsed && (
                      <p className={cn("mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", currentGroup !== group.id && "opacity-50")}>
                        {group.label}
                      </p>
                    )}
                    <nav className="space-y-0.5">
                      {items.map((item) => (
                        <SidebarNavItem key={item.to} item={item} collapsed={collapsed} />
                      ))}
                    </nav>
                  </div>
                );
              })}
            </div>
            {!collapsed && (
              <div className="border-t p-4 text-center text-[11px] text-muted-foreground">
                Noska Admin v1.0
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
