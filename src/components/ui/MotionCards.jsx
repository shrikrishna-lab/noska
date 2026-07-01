import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Compass, Star, ChevronDown, CheckCircle2 } from "lucide-react";
import { SPRING_PRESETS } from "../../features/motion/MotionSystem";

const mockCardsData = [
  {
    id: "top-picks",
    title: "Top Picks",
    subtitle: "Highly popular note setups",
    icon: Star,
    color: "rgba(35, 131, 226, 0.15)",
    borderColor: "rgba(35, 131, 226, 0.4)",
    description: "Our most loved choices, selected for their balance of quality, performance, and everyday usefulness. These are the reliable standouts people keep coming back to.",
    items: ["Meeting Notes with Auto-Summary", "Product Roadmap Planner", "Daily Standup Dashboard"]
  },
  {
    id: "new-arrivals",
    title: "New Arrivals",
    subtitle: "Recently added AI workflows",
    icon: Sparkles,
    color: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.4)",
    description: "Fresh additions that bring something different to the table. Recently added, thoughtfully designed, and ready to be explored.",
    items: ["AI Copywriting Assistant", "Internet Search Reference Builder", "NVIDIA NIM Integration Shell"]
  },
  {
    id: "recommended",
    title: "Recommended",
    subtitle: "Curated productivity blueprints",
    icon: Compass,
    color: "rgba(245, 158, 11, 0.15)",
    borderColor: "rgba(245, 158, 11, 0.4)",
    description: "Carefully curated options based on what works best for most people. Trusted, refined, and easy to choose with confidence.",
    items: ["Weekly Goal Tracker", "Simple Database CRM", "Workspace File Hub"]
  }
];

export default function MotionCards({ onCreateTemplate }) {
  const [activeCardId, setActiveCardId] = useState(null);

  const toggleExpand = (id) => {
    setActiveCardId(activeCardId === id ? null : id);
  };

  return (
    <div className="w-full grid gap-4 md:grid-cols-3 max-w-5xl mb-8">
      {mockCardsData.map((card) => {
        const Icon = card.icon;
        const isOpen = activeCardId === card.id;

        return (
          <motion.div
            key={card.id}
            layout
            initial={false}
            onClick={() => toggleExpand(card.id)}
            whileHover={{ scale: 1.015, y: -2 }}
            whileTap={{ scale: 0.995 }}
            transition={SPRING_PRESETS.soft}
            style={{
              backgroundColor: card.color,
              borderColor: card.borderColor
            }}
            className={`rounded-xl border p-5 text-left cursor-pointer transition-colors duration-200 select-none overflow-hidden relative flex flex-col justify-between ${
              isOpen ? "md:col-span-1 shadow-lg ring-1 ring-[var(--accent)]" : ""
            }`}
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--surface)] text-[var(--text)] border border-[var(--border-strong)]">
                    <Icon size={14} className="text-[var(--accent)]" />
                  </span>
                  <div className="font-semibold text-sm text-[var(--text)] leading-none">
                    {card.title}
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={SPRING_PRESETS.stiff}
                  className="text-[var(--secondary)]"
                >
                  <ChevronDown size={14} />
                </motion.div>
              </div>

              {/* Subtitle / Description preview */}
              <div className="text-xs text-[var(--secondary)] font-medium mb-3">
                {card.subtitle}
              </div>

              {/* Collapsible Content */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={SPRING_PRESETS.soft}
                    className="overflow-hidden mt-3"
                  >
                    <p className="text-xs text-[var(--secondary)] leading-relaxed mb-4">
                      {card.description}
                    </p>
                    <div className="space-y-2 mb-2">
                      <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                        Includes templates:
                      </div>
                      {card.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-[var(--text)]">
                          <CheckCircle2 size={12} className="text-[var(--success)] shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {isOpen && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateTemplate?.("blank");
                }}
                className="mt-5 w-full rounded-md bg-[var(--accent)] hover:opacity-90 py-2 text-center text-xs font-semibold text-white transition-colors"
              >
                Create with {card.title}
              </motion.button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
