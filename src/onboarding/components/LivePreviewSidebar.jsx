import React from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, AlignJustify, Search, Library, LayoutGrid, Plus } from "lucide-react";
import { C } from "../theme";
import { useOnboarding } from "../hooks/useOnboarding";
import { previewPagesFor } from "../services/onboardingService";

// Served from /public — reference the same logo the real Sidebar uses
// (src/components/Sidebar.jsx), not a duplicated asset.
const NoskaLogo = "/logo.png";

const SIDEBAR_STEPS = ["Workspace", "Your role", "Invite team", "Template"];

/**
 * A faithful port of the final onboarding design's sidebar (Noska
 * Onboarding/src/app/App.tsx: NoSkaSidebar), wired to the real starter-page
 * preview logic so the "Private Documents" list always matches what
 * App.jsx's handleFinalize will actually create.
 */
export default function LivePreviewSidebar({ step }) {
  const { form } = useOnboarding();
  const pages = previewPagesFor(form);
  const wsName = form.workspaceName?.trim() || "My Workspace";
  const wsNameShort = wsName.length > 12 ? wsName.slice(0, 12) + "…" : wsName;

  return (
    <aside
      className="hidden lg:flex flex-col w-[264px] flex-shrink-0 h-full overflow-hidden relative"
      style={{ background: C.sidebarBg, borderRight: `1px solid ${C.border}` }}
    >
      {/* Workspace header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 2px 8px rgba(124,58,237,0.3)" }}
          >
            <img src={NoskaLogo} alt="Noska" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold truncate leading-tight transition-all duration-300" style={{ color: C.text }}>
              {wsNameShort}
            </p>
            <p className="text-[10px] leading-tight" style={{ color: C.muted }}>Noska Workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button className="p-1 rounded hover:bg-black/5 transition-colors">
            <ChevronDown size={13} style={{ color: C.muted }} />
          </button>
          <button className="p-1 rounded hover:bg-black/5 transition-colors">
            <AlignJustify size={13} style={{ color: C.muted }} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: C.gray }}>
          <Search size={13} style={{ color: C.muted, flexShrink: 0 }} />
          <span className="text-[12px] flex-1" style={{ color: C.muted }}>Search workspace...</span>
          <span
            className="text-[9px] font-medium px-1.5 py-0.5 rounded"
            style={{ background: "#fff", color: C.muted, border: `1px solid ${C.border}` }}
          >
            CTRL+K
          </span>
        </div>
      </div>

      {/* Nav body */}
      <div className="flex-1 overflow-y-auto px-2 pb-2" style={{ scrollbarWidth: "none" }}>
        <SideSection label="Marketplace" />
        <SideSection label="Private Documents" />
        <div className="flex flex-col gap-0.5 mb-1">
          {pages.map((page, i) => (
            <SideItem
              key={`${page.title}-${i}`}
              icon={page.icon}
              label={page.title}
              style={{ animation: `fadeSlideIn 0.3s ease ${i * 60}ms both` }}
            />
          ))}
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg w-full text-left transition-colors hover:bg-black/5"
            style={{ color: C.muted }}
          >
            <Plus size={12} />
            <span className="text-[12px]">Add new document</span>
          </button>
        </div>
        <SideSection label="Teamspaces" />
        <SideSection label="Shared Space" />
        <SideSection label="Tools" />
        <SideSection label="Support" />
      </div>

      {/* Bottom toolbar */}
      <div style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between px-4 py-2.5">
          {[LayoutGrid, ChevronLeft, ChevronRight, LayoutGrid, Plus].map((Icon, i) => (
            <button key={i} className="p-1 rounded hover:bg-black/5 transition-colors" style={{ color: C.muted }}>
              <Icon size={15} />
            </button>
          ))}
        </div>

        <div className="px-3 pb-1">
          <button className="flex items-center gap-2.5 px-3 py-1.5 w-full rounded-lg hover:bg-black/5 transition-colors">
            <Library size={13} style={{ color: C.muted }} />
            <span className="text-[12px]" style={{ color: C.text }}>Library</span>
          </button>
          <button className="flex items-center gap-2.5 px-3 py-1.5 w-full rounded-lg hover:bg-black/5 transition-colors">
            <Check size={12} style={{ color: C.muted }} />
            <span className="text-[12px]" style={{ color: C.text }}>My Tasks</span>
          </button>
        </div>

        <div className="px-3 pb-4 pt-1">
          <button
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl font-medium transition-all duration-200 hover:shadow-md active:scale-[0.98]"
            style={{ background: C.beige }}
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: "#5a3e20" }}>
              <Plus size={15} />
              New Creation
            </span>
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: "rgba(90,62,32,0.12)", color: "#5a3e20" }}
            >
              CTRL+N
            </span>
          </button>
        </div>
      </div>

      {/* Onboarding step tracker overlay */}
      {step > 0 && step < 5 && (
        <div
          className="absolute bottom-[120px] right-0 left-0 mx-3 p-3 rounded-xl"
          style={{
            background: "rgba(240,250,255,0.95)",
            border: "1px solid rgba(124,58,237,0.15)",
            backdropFilter: "blur(8px)",
            animation: "fadeSlideIn 0.4s ease",
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: C.muted }}>
            Setup progress
          </p>
          <div className="flex flex-col gap-1.5">
            {SIDEBAR_STEPS.map((label, i) => {
              const idx = i + 1;
              const done = step > idx;
              const active = step === idx;
              return (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-400"
                    style={{
                      background: done ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : active ? C.beige : C.gray,
                      border: active ? `1.5px solid ${C.beigeDark}` : "none",
                    }}
                  >
                    {done ? (
                      <Check size={8} strokeWidth={3} className="text-white" />
                    ) : (
                      <span className="text-[7px] font-bold" style={{ color: active ? "#5a3e20" : C.muted }}>{idx}</span>
                    )}
                  </div>
                  <span
                    className="text-[11px] transition-all duration-200"
                    style={{ color: active ? C.text : C.muted, fontWeight: active ? 600 : 400 }}
                  >
                    {label}
                  </span>
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: C.purple, animation: "pulse 2s infinite" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}

function SideSection({ label }) {
  return (
    <div className="px-3 pt-4 pb-1">
      <span className="text-[12px] font-normal" style={{ color: C.muted }}>{label}</span>
    </div>
  );
}

function SideItem({ icon, label, active, style }) {
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg mx-0 cursor-pointer transition-all duration-200"
      style={{ background: active ? C.sidebarActive : "transparent", ...style }}
    >
      <span className="text-sm leading-none flex-shrink-0">{icon}</span>
      <span className="text-[12px] truncate" style={{ color: C.text }}>
        {label.length > 14 ? label.slice(0, 14) + "…" : label}
      </span>
    </div>
  );
}
