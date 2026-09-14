/**
 * MobileFloatingNavbar — Apple Liquid Glass Bottom Navigation Dock.
 * Features:
 * - Multi-layer frosted glass capsule with specular highlight rim and inner glow
 * - Fluid sliding active indicator pill with Framer Motion spring physics
 * - Standalone circular floating action button (+) with tactile spring bounce & rotation
 * - Unread notification badge support
 */
import React from "react";
import { motion, LayoutGroup, type Transition } from "framer-motion";
import {
  Home as HomeIcon,
  Layers as PagesIcon,
  Bell as InboxIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Plus,
} from "lucide-react";
import { hapticFeedback } from "../index";

export type MobileTab = "home" | "pages" | "inbox" | "search" | "settings";

interface MobileFloatingNavbarProps {
  activeTab: MobileTab;
  isPageRoute?: boolean;
  pendingInvitesCount?: number;
  onSelectTab: (tab: MobileTab) => void;
  onOpenActionGrid: () => void;
  isActionGridOpen?: boolean;
}

interface NavItemConfig {
  id: MobileTab;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  hasBadge?: boolean;
}

const TAB_SPRING_TRANSITION: Transition = {
  type: "spring",
  stiffness: 480,
  damping: 32,
  mass: 0.6,
};

export function MobileFloatingNavbar({
  activeTab,
  isPageRoute = false,
  pendingInvitesCount = 0,
  onSelectTab,
  onOpenActionGrid,
  isActionGridOpen = false,
}: MobileFloatingNavbarProps) {
  const items: NavItemConfig[] = [
    { id: "home", label: "Home", icon: HomeIcon },
    { id: "pages", label: "Pages", icon: PagesIcon },
    { id: "inbox", label: "Inbox", icon: InboxIcon, hasBadge: pendingInvitesCount > 0 },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="mobile-liquid-dock-wrapper" role="navigation" aria-label="Primary Mobile Navigation">
      <div className="mobile-liquid-dock-inner">
        {/* Left Liquid Glass Capsule Bar */}
        <nav className="mobile-liquid-capsule">
          <LayoutGroup id="mobile-liquid-nav-group">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id && !isPageRoute;

              return (
                <motion.button
                  key={item.id}
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  className={`mobile-liquid-tab ${isActive ? "is-active" : ""}`}
                  onClick={() => {
                    hapticFeedback("light");
                    onSelectTab(item.id);
                  }}
                  aria-label={item.label}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-liquid-active-pill"
                      className="mobile-liquid-active-pill"
                      transition={TAB_SPRING_TRANSITION}
                    />
                  )}
                  <motion.span
                    className="mobile-liquid-icon-wrap"
                    animate={{
                      scale: isActive ? 1.12 : 1,
                      y: isActive ? -1 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.9} />
                    {item.hasBadge && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        aria-label={`${pendingInvitesCount} unread invites`}
                        className="mobile-liquid-badge"
                      />
                    )}
                  </motion.span>
                </motion.button>
              );
            })}
          </LayoutGroup>
        </nav>

        {/* Right Standalone Circular Liquid Glass Create (+) Button */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          whileHover={{ scale: 1.05 }}
          animate={{
            rotate: isActionGridOpen ? 45 : 0,
            scale: isActionGridOpen ? 0.94 : 1,
          }}
          transition={{ type: "spring", stiffness: 480, damping: 26, mass: 0.7 }}
          className={`mobile-liquid-fab ${isActionGridOpen ? "is-open" : ""}`}
          aria-label={isActionGridOpen ? "Close create actions" : "Open create actions"}
          onClick={() => {
            hapticFeedback("medium");
            onOpenActionGrid();
          }}
        >
          <Plus size={22} strokeWidth={2.6} />
        </motion.button>
      </div>
    </div>
  );
}
