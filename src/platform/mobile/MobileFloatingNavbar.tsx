/**
 * MobileFloatingNavbar — Minimal Hover & Floating Pill Navbar for Noska Mobile.
 * Inspired by Framer Minimal Hover Navbar (https://framer.com/m/Minimal-Hover-Navbar-98UQqN.js).
 * Features:
 * - Floating glassmorphic capsule dock with Noska warm editorial palette & dark mode
 * - Smooth sliding active indicator pill with Framer Motion spring physics
 * - Tactile central Create action button with spring bounce
 * - Unread invite counter badge on Inbox
 * - Safe-area inset support & touch-friendly tap targets
 */
import React from "react";
import { motion, LayoutGroup, type Transition } from "framer-motion";
import {
  Home as HomeIcon,
  Search as SearchIcon,
  Plus,
  Inbox as InboxIcon,
  User as UserIcon,
} from "lucide-react";
import { hapticFeedback } from "../index";

export type MobileTab = "home" | "search" | "inbox" | "profile";

interface MobileFloatingNavbarProps {
  activeTab: MobileTab;
  isPageRoute?: boolean;
  pendingInvitesCount?: number;
  onSelectTab: (tab: MobileTab) => void;
  onCreate: () => void;
}

interface NavItemConfig {
  id: MobileTab;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  hasBadge?: boolean;
}

const SPRING_TRANSITION: Transition = {
  type: "spring",
  bounce: 0.22,
  duration: 0.38,
};

export function MobileFloatingNavbar({
  activeTab,
  isPageRoute = false,
  pendingInvitesCount = 0,
  onSelectTab,
  onCreate,
}: MobileFloatingNavbarProps) {
  const items: NavItemConfig[] = [
    { id: "home", label: "Home", icon: HomeIcon },
    { id: "search", label: "Search", icon: SearchIcon },
    { id: "inbox", label: "Inbox", icon: InboxIcon, hasBadge: pendingInvitesCount > 0 },
    { id: "profile", label: "Profile", icon: UserIcon },
  ];

  return (
    <div className="mobile-floating-nav-wrapper" role="navigation" aria-label="Primary Mobile Navigation">
      <nav className="mobile-floating-nav">
        <LayoutGroup id="mobile-floating-navbar-group">
          {/* First 2 items (Home & Search) */}
          {items.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && !isPageRoute;

            return (
              <button
                key={item.id}
                type="button"
                className={`mobile-floating-nav-item ${isActive ? "is-active" : ""}`}
                onClick={() => {
                  hapticFeedback("light");
                  onSelectTab(item.id);
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-floating-nav-active-pill"
                    className="mobile-floating-nav-indicator"
                    transition={SPRING_TRANSITION}
                  />
                )}
                <span className="mobile-floating-nav-icon-wrap">
                  <Icon size={19} strokeWidth={isActive ? 2.4 : 1.9} />
                </span>
                <span className="mobile-floating-nav-label">{item.label}</span>
              </button>
            );
          })}

          {/* Center Create Button */}
          <div className="mobile-floating-nav-create-wrap">
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="mobile-floating-nav-create-btn"
              aria-label="Create new page or task"
              onClick={() => {
                hapticFeedback("medium");
                onCreate();
              }}
            >
              <Plus size={20} strokeWidth={2.6} />
            </motion.button>
          </div>

          {/* Last 2 items (Inbox & Profile) */}
          {items.slice(2).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && !isPageRoute;

            return (
              <button
                key={item.id}
                type="button"
                className={`mobile-floating-nav-item ${isActive ? "is-active" : ""}`}
                onClick={() => {
                  hapticFeedback("light");
                  onSelectTab(item.id);
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-floating-nav-active-pill"
                    className="mobile-floating-nav-indicator"
                    transition={SPRING_TRANSITION}
                  />
                )}
                <span className="mobile-floating-nav-icon-wrap relative">
                  <Icon size={19} strokeWidth={isActive ? 2.4 : 1.9} />
                  {item.hasBadge && (
                    <span
                      aria-label={`${pendingInvitesCount} unread invites`}
                      className="mobile-floating-nav-badge"
                    />
                  )}
                </span>
                <span className="mobile-floating-nav-label">{item.label}</span>
              </button>
            );
          })}
        </LayoutGroup>
      </nav>
    </div>
  );
}

export default MobileFloatingNavbar;
