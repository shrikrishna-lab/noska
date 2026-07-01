import React from "react";
import { motion } from "framer-motion";
import {
  Users, MessageSquare, Share2, Globe, Bell, Lock
} from "lucide-react";
import { useOnboarding } from "../../hooks/useOnboarding";
import { stepVariants, fadeUp } from "../../animations/variants";

const items = [
  { icon: Users, label: "Real-time Collaboration", desc: "Edit together with live cursors" },
  { icon: MessageSquare, label: "Inline Comments", desc: "Discuss right in the document" },
  { icon: Share2, label: "Share & Publish", desc: "Share pages with your team or the world" },
  { icon: Bell, label: "Notifications", desc: "Stay updated on changes and @mentions" },
  { icon: Lock, label: "Permissions", desc: "Control who can view or edit" },
  { icon: Globe, label: "Web Publishing", desc: "Publish pages as public websites" }
];

export default function CollaborationIntro() {
  const { next, back } = useOnboarding();

  return (
    <motion.div
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-lg mx-auto w-full"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white">Work together</h2>
        <p className="text-[var(--text-secondary)] mt-2 text-sm">
          Noska is built for teams. Collaborate in real-time, share knowledge, and stay aligned.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ delay: i * 0.06 }}
            className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
              <item.icon className="w-4 h-4 text-noska-blue" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white">{item.label}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-3 mt-8 justify-center">
        <button
          onClick={back}
          className="px-5 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          Back
        </button>
        <button
          onClick={next}
          className="px-6 py-2.5 rounded-lg bg-noska-blue text-white font-medium text-sm hover:bg-noska-blue/90 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-noska-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#030307]"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}
