import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Search, Home, Sparkles, Bell, Plus, FileText } from "lucide-react";
import { useOnboarding } from "../hooks/useOnboarding";
import { previewPagesFor } from "../services/onboardingService";

/**
 * A faithful, live-updating recreation of the real app's Sidebar
 * (src/components/Sidebar.jsx) shown alongside the onboarding steps. As the
 * user picks a use case or template, the "Private Documents" list updates
 * with the exact pages App.jsx's handleFinalize will actually create —
 * so onboarding shows the truth, not a static mockup.
 */
export default function LivePreviewSidebar() {
  const { form } = useOnboarding();
  const pages = previewPagesFor(form);
  const workspaceName = form.workspaceName?.trim() || "My Workspace";

  return (
    <aside
      style={{ width: 240, background: "var(--sidebar)", borderColor: "var(--border)" }}
      className="hidden lg:flex h-full shrink-0 flex-col border-r text-[var(--text)]"
    >
      <div style={{ borderColor: "var(--border)" }} className="flex h-14 items-center gap-2.5 border-b px-3">
        <div
          style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
        >
          <Sparkles size={15} className="text-[var(--noska-blue)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-bold leading-tight tracking-wide">{workspaceName}</div>
          <div className="mt-0.5 text-[10px] font-medium leading-none text-[var(--text-secondary)]">
            Noska Workspace
          </div>
        </div>
        <ChevronDown size={11} className="shrink-0 text-[var(--muted)]" />
      </div>

      <div className="px-3 pt-3 pb-2">
        <div
          style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
          className="flex h-[34px] w-full items-center gap-2 rounded-lg border px-3"
        >
          <Search size={13} className="text-[var(--text-secondary)]" />
          <span className="flex-1 text-[12.5px] font-medium leading-none text-[var(--text-secondary)]">
            Search workspace...
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-2 scrollbar-thin fade-edges-y">
        <div className="mt-1 select-none">
          <div className="px-3.5 py-1.5 text-[11px] font-bold tracking-wide text-[var(--muted)]">Workspace</div>
          <div className="space-y-0.5 px-1.5">
            <NavItem icon={Home} label="Home" />
            <NavItem icon={Sparkles} label="AI Workspace" />
            <NavItem icon={Bell} label="Inbox" />
          </div>
        </div>

        <div className="mt-4.5 select-none">
          <div className="px-3.5 py-1.5 text-[11px] font-bold tracking-wide text-[var(--muted)]">
            Private Documents
          </div>
          <div className="space-y-0.5 px-1.5">
            <AnimatePresence initial={false}>
              {pages.map((page, i) => (
                <motion.div
                  key={page.title}
                  layout
                  initial={{ opacity: 0, x: -8, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, x: -8, height: 0 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1], delay: i * 0.03 }}
                  className="overflow-hidden"
                >
                  <div className="flex min-h-[26px] w-full items-center gap-2 rounded-lg px-2.5 py-1 text-left text-[12px] text-[var(--text-secondary)]">
                    <span className="shrink-0 text-[13px] leading-none">{page.icon}</span>
                    <span className="min-w-0 flex-1 truncate">{page.title}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <NavItem icon={Plus} label="Add new document" muted compact />
          </div>
        </div>
      </div>

      <div style={{ borderColor: "var(--border)" }} className="shrink-0 border-t px-2 py-2">
        <div className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5">
          <div
            style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs"
          >
            <FileText size={13} className="text-[var(--text-secondary)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-semibold leading-none">You</div>
            <div className="mt-0.5 truncate text-[9px] leading-none text-[var(--muted)]">
              {pages.length} page{pages.length === 1 ? "" : "s"} ready
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon: Icon, label, muted, compact }) {
  return (
    <div
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 text-left ${
        compact ? "min-h-[22px] py-0.5 text-[11px]" : "min-h-[26px] py-1 text-[12px]"
      } ${muted ? "text-[var(--muted)]" : "text-[var(--text-secondary)]"}`}
    >
      <Icon size={compact ? 11 : 13} className="shrink-0 text-[var(--text-secondary)]" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </div>
  );
}
