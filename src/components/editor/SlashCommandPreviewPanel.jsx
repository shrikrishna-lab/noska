import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "lucide-react";
import BlockPreviewIllustration from "./BlockPreviewIllustration";

function RenderIcon({ iconName, size = 14, className = "" }) {
  const IconComponent = Icons[iconName];
  if (!IconComponent) return null;
  return <IconComponent size={size} className={`shrink-0 ${className}`} />;
}

/**
 * SlashCommandPreviewPanel — Side panel that shows a preview card
 * beside the slash command menu for the currently highlighted command.
 *
 * Props:
 *   command   — The normalized command object (with preview: { description, image? })
 *   side      — "right" | "left" — which side of the menu to render on
 *   visible   — Whether the panel should be shown (controls AnimatePresence)
 *   menuWidth — Width of the main menu (default 352)
 */
export default function SlashCommandPreviewPanel({ command, side = "right", visible, menuWidth = 352 }) {
  const [imgFailed, setImgFailed] = useState(false);

  // Reset imgFailed when command changes
  const commandId = command?.id;
  const [lastCommandId, setLastCommandId] = useState(null);
  if (commandId !== lastCommandId) {
    setLastCommandId(commandId);
    setImgFailed(false);
  }

  const PANEL_WIDTH = 260;
  const GAP = 8;

  const positionStyle = {
    position: "absolute",
    top: 0,
    width: PANEL_WIDTH,
    ...(side === "right"
      ? { left: menuWidth + GAP }
      : { right: menuWidth + GAP }
    ),
  };

  const slideDirection = side === "right" ? -8 : 8;

  return (
    <AnimatePresence>
      {visible && command && (
        <motion.aside
          key="preview-panel"
          role="complementary"
          aria-label="Command preview"
          initial={{ opacity: 0, x: slideDirection, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: slideDirection, scale: 0.97, transition: { duration: 0.1 } }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          style={positionStyle}
          className="rounded-xl border border-[var(--border)] bg-[var(--elevated)]/95 backdrop-blur-md shadow-[var(--shadow-floating)] overflow-hidden"
        >
          {/* Preview visual: static SVG if available, else generated illustration */}
          {command.preview?.image && !imgFailed ? (
            <div className="border-b border-[var(--border)] bg-[var(--surface)] p-3">
              <img
                src={command.preview.image}
                alt={`${command.title} preview`}
                onError={() => setImgFailed(true)}
                className="w-full h-auto rounded-lg object-cover"
                style={{ maxHeight: 140 }}
              />
            </div>
          ) : (
            <div className="border-b border-[var(--border)] bg-[var(--surface)] p-3">
              <BlockPreviewIllustration command={command} />
            </div>
          )}

          {/* Content */}
          <div className="p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-[var(--accent)]/10 text-[var(--accent)]">
                <RenderIcon iconName={command.icon} size={13} />
              </div>
              <span className="text-[13px] font-semibold text-[var(--text)]">
                {command.title}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-[var(--muted)]">
              {command.preview?.description || command.description || ""}
            </p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
