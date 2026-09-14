import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Sparkles,
  Mic,
  Database,
  CheckSquare,
  LayoutTemplate,
  Lock,
  X,
} from "lucide-react";
import { hapticFeedback } from "../index";
import { FlowWaveformIcon } from "./MobileFlowPill";

export interface MobileActionGridSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: "flow" | "page" | "ai" | "voice" | "database" | "task" | "template" | "private") => void;
}

export const MobileActionGridSheet: React.FC<MobileActionGridSheetProps> = ({
  isOpen,
  onClose,
  onAction,
}) => {
  const actions = [
    { id: "flow" as const, label: "Noska Flow", icon: FlowWaveformIcon, isFlow: true },
    { id: "page" as const, label: "New Page", icon: FileText, color: "#3b82f6" },
    { id: "ai" as const, label: "Ask AI", icon: Sparkles, color: "#8b5cf6" },
    { id: "voice" as const, label: "Voice Note", icon: Mic, color: "#ec4899" },
    { id: "database" as const, label: "Database", icon: Database, color: "#10b981" },
    { id: "task" as const, label: "To-Do Task", icon: CheckSquare, color: "#f59e0b" },
    { id: "template" as const, label: "Templates", icon: LayoutTemplate, color: "#06b6d4" },
    { id: "private" as const, label: "Private Doc", icon: Lock, color: "#64748b" },
  ];

  return (
    <AnimatePresence mode="popLayout">
      {isOpen && (
        <>
          {/* Frosted Apple Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="mobile-action-backdrop"
            onClick={onClose}
          />

          {/* Action Disclosure Container */}
          <div className="mobile-action-grid-wrapper">
            <motion.div
              initial={{ opacity: 0, scale: 0.75, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.72, y: 20, transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] } }}
              transition={{ type: "spring", stiffness: 440, damping: 28, mass: 0.65 }}
              style={{ transformOrigin: "calc(100% - 30px) calc(100% - 15px)" }}
              className="mobile-action-grid-card"
            >
              {/* Disclosure Header */}
              <div className="mobile-action-sheet-header">
                <div className="mobile-action-sheet-header__title">
                  <span className="mobile-action-sheet-header__dot" />
                  <span>Create New</span>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  whileHover={{ scale: 1.08 }}
                  onClick={() => {
                    hapticFeedback("light");
                    onClose();
                  }}
                  className="mobile-action-sheet-header__close"
                  aria-label="Close"
                >
                  <X size={15} strokeWidth={2.5} />
                </motion.button>
              </div>

              {/* Action Grid Body */}
              <div className="mobile-action-grid">
                {actions.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      initial={{ opacity: 0, scale: 0.78, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{
                        delay: index * 0.022,
                        type: "spring",
                        stiffness: 480,
                        damping: 26,
                      }}
                      whileTap={{ scale: 0.9 }}
                      whileHover={{ scale: 1.03 }}
                      className={`mobile-action-tile ${item.isFlow ? "is-flow" : ""}`}
                      onClick={() => {
                        hapticFeedback("medium");
                        onAction(item.id);
                        onClose();
                      }}
                    >
                      <div className="mobile-action-tile__icon-wrap">
                        <Icon size={22} strokeWidth={2.2} />
                      </div>
                      <span className="mobile-action-tile__label">{item.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
