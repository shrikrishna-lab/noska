import React, { useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Palette,
  Layout,
  Sliders,
  Sparkles,
  Check,
  RotateCcw,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Layers,
  Search,
  PlusCircle,
  Folder,
  Brain,
  Calendar,
  Library,
  Bell,
  Sun,
  Moon,
  Zap,
  Download,
  Upload,
  GripVertical,
  CheckSquare,
  Square,
  Sparkle,
  Paintbrush,
  SlidersHorizontal,
  Building2,
  Users,
  Terminal,
  Bookmark,
  Trash2,
  MessageSquare,
  FileText
} from "lucide-react";
import {
  useSidebarCustomization,
  SIDEBAR_THEME_PRESETS,
  SIDEBAR_LAYOUT_TEMPLATES,
  getFullTemplateConfig,
  SOFT_ACCENT_PALETTES,
  TEXTURE_DEFINITIONS,
  ALL_SIDEBAR_SECTIONS,
  SidebarSectionKey,
  SidebarThemePreset,
  SidebarRadiusPreset,
  SidebarBlurPreset,
  SidebarDensityPreset,
  SidebarTexturePreset,
  getTextureOverlayStyle,
  SidebarItemVisibility
} from "../../features/customization/sidebarCustomization";
import { useCalendarTopbarSetting, useAutoPagesInCalendarSetting } from "../../lib/calendarSync";

interface SidebarCustomizerProps {
  onToast?: (message: string) => void;
}

export default function SidebarCustomizer({ onToast }: SidebarCustomizerProps) {
  const { config, updateConfig, resetToDefault } = useSidebarCustomization();
  const { enabled: calendarTopbarEnabled, toggle: toggleCalendarTopbar } = useCalendarTopbarSetting();
  const { enabled: autoPagesEnabled, toggle: toggleAutoPages } = useAutoPagesInCalendarSetting();
  const [activeTab, setActiveTab] = useState<"templates" | "aesthetics" | "textures" | "arrangements" | "whatsNeed" | "bottom">("templates");
  const [themeFilter, setThemeFilter] = useState<"all" | "gradient" | "cyber" | "artisan" | "solid">("all");
  const [customAccent, setCustomAccent] = useState(config.accentColor);
  const [previewThemeMode, setPreviewThemeMode] = useState<"light" | "dark">("dark");
  const [previewingTemplateId, setPreviewingTemplateId] = useState<string | null>(null);
  const [hoveredTemplateId, setHoveredTemplateId] = useState<string | null>(null);

  const activeTemplate = SIDEBAR_LAYOUT_TEMPLATES.find((t) => t.id === (hoveredTemplateId || previewingTemplateId));
  const displayConfig = activeTemplate ? getFullTemplateConfig(activeTemplate) : config;

  const filteredPresets = SIDEBAR_THEME_PRESETS.filter((p) => {
    if (themeFilter === "all") return true;
    if (themeFilter === "gradient") return p.type === "gradient";
    if (themeFilter === "solid") return p.type === "solid";
    if (themeFilter === "cyber") {
      return ["cyberpunk-neon", "tokyo-night", "matrix-terminal", "dracula-vampire", "synthwave-sunset", "oled-pure-black", "frost-titanium", "cosmic-aurora"].includes(p.id);
    }
    if (themeFilter === "artisan") {
      return ["kyoto-bamboo", "terracotta-sun", "nordic-pine", "espresso-crema", "parchment-archive", "warm-sand", "matcha-mist", "amber-honey"].includes(p.id);
    }
    return true;
  });

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const newOrder = [...config.sectionOrder];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    updateConfig({ sectionOrder: newOrder });
    onToast?.("Section order updated");
  };

  const handleToggleSection = (key: SidebarSectionKey) => {
    const current = config.sectionVisibility[key] !== false;
    updateConfig({
      sectionVisibility: {
        ...config.sectionVisibility,
        [key]: !current
      }
    });
    onToast?.(`${key} visibility updated`);
  };

  const handleToggleItem = (itemKey: keyof SidebarItemVisibility) => {
    const current = config.itemVisibility?.[itemKey] !== false;
    updateConfig({
      itemVisibility: {
        ...config.itemVisibility,
        [itemKey]: !current
      }
    });
    onToast?.(`Updated visibility for ${itemKey}`);
  };

  const handleToggleQuickTab = (tabKey: keyof typeof config.quickTabs) => {
    updateConfig({
      quickTabs: {
        ...config.quickTabs,
        [tabKey]: !config.quickTabs[tabKey]
      }
    });
    onToast?.("Quick Navigation tabs updated");
  };

  const handleExportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `noska-sidebar-theme-${Date.now()}.json`;
    a.click();
    onToast?.("Sidebar theme exported");
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        updateConfig(parsed);
        onToast?.("Sidebar theme imported successfully!");
      } catch {
        onToast?.("Failed to import: invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  // Preview styling calculations using displayConfig (supports live template preview)
  const previewBg = previewThemeMode === "dark" ? displayConfig.customBgDark : displayConfig.customBgLight;
  const previewBorder = previewThemeMode === "dark" ? displayConfig.customBorderDark : displayConfig.customBorderLight;
  const textureOverlay = getTextureOverlayStyle(displayConfig.texture);

  const previewRadiusOuter = displayConfig.radius === "sharp" ? "rounded-[8px]" : displayConfig.radius === "subtle" ? "rounded-[16px]" : displayConfig.radius === "squircle" ? "rounded-[22px]" : "rounded-[28px]";
  const previewRadiusInner = displayConfig.radius === "sharp" ? "rounded-[6px]" : displayConfig.radius === "subtle" ? "rounded-[14px]" : displayConfig.radius === "squircle" ? "rounded-[20px]" : "rounded-[26px]";

  return (
    <div className="space-y-6 text-[#1c1b18] pb-12 font-sans">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pt-1 flex-wrap gap-4">
        <div>
          <h2 className="text-[26px] font-normal tracking-tight font-serif text-[#1c1b18] flex items-center gap-2.5">
            <Palette className="text-[#a8824b]" size={24} />
            <span>Sidebar Customizer</span>
          </h2>
          <p className="text-xs text-[#706c64] mt-1">
            Personalize sidebar aesthetics, soft luxury palettes, textures, drag-to-place arrangements, and individual items.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetToDefault();
              setPreviewingTemplateId(null);
              setHoveredTemplateId(null);
              onToast?.("Sidebar reset to default layout");
            }}
            className="h-8 px-3 rounded-xl border border-[#e8e4db] bg-white hover:bg-[#ede8df] text-xs font-semibold text-[#706c64] hover:text-[#1c1b18] shadow-2xs transition cursor-pointer flex items-center gap-1.5"
            title="Reset to default layout"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>

          <button
            onClick={handleExportConfig}
            className="h-8 px-3 rounded-xl border border-[#e8e4db] bg-white hover:bg-[#ede8df] text-xs font-semibold text-[#706c64] hover:text-[#1c1b18] shadow-2xs transition cursor-pointer flex items-center gap-1.5"
            title="Export Theme JSON"
          >
            <Download size={13} />
            <span>Export</span>
          </button>

          <label className="h-8 px-3 rounded-xl border border-[#e8e4db] bg-white hover:bg-[#ede8df] text-xs font-semibold text-[#706c64] hover:text-[#1c1b18] shadow-2xs transition cursor-pointer flex items-center gap-1.5">
            <Upload size={13} />
            <span>Import</span>
            <input type="file" accept=".json" onChange={handleImportConfig} className="hidden" />
          </label>
        </div>
      </div>

      {/* Grid: Left Live Interactive Preview + Right Customization Tabs */}
      <div className="grid grid-cols-[260px_1fr] gap-6 items-start max-[820px]:grid-cols-1">
        
        {/* =========================================================================
            LEFT COLUMN: REAL-TIME ACCURATE MINIATURE SIMULATOR
           ========================================================================= */}
        <div className="rounded-3xl bg-[#f8f6f0] border border-[#e8e4db] p-4 sticky top-2 shadow-sm space-y-3 select-none">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#8c887f]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span>Live Simulator</span>
              {activeTemplate && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#1c1b18] text-white text-[8.5px] font-bold tracking-tight lowercase truncate">
                  preview: {activeTemplate.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 bg-[#ede8df] p-0.5 rounded-lg">
              <button
                onClick={() => setPreviewThemeMode("light")}
                className={`p-1 rounded-md transition cursor-pointer ${
                  previewThemeMode === "light" ? "bg-white shadow-xs text-neutral-900" : "text-neutral-500"
                }`}
                title="Light Preview"
              >
                <Sun size={11} />
              </button>
              <button
                onClick={() => setPreviewThemeMode("dark")}
                className={`p-1 rounded-md transition cursor-pointer ${
                  previewThemeMode === "dark" ? "bg-neutral-900 shadow-xs text-white" : "text-neutral-500"
                }`}
                title="Dark Preview"
              >
                <Moon size={11} />
              </button>
            </div>
          </div>

          {/* Active Template Notice Bar if previewing */}
          {activeTemplate && (
            <div className="p-2 rounded-xl bg-white border border-[#e8e4db] text-xs flex items-center justify-between gap-2 shadow-2xs">
              <div className="min-w-0">
                <div className="font-bold text-[#1c1b18] truncate text-[11px]">{activeTemplate.name}</div>
                <div className="text-[9.5px] text-[#706c64] truncate">Previewing template</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    updateConfig(getFullTemplateConfig(activeTemplate));
                    setPreviewingTemplateId(null);
                    setHoveredTemplateId(null);
                    onToast?.(`Applied "${activeTemplate.name}" template!`);
                  }}
                  className="px-2 py-1 rounded-lg bg-[#1c1b18] text-white text-[10px] font-bold hover:bg-[#333] transition cursor-pointer shadow-2xs"
                >
                  Apply
                </button>
                <button
                  onClick={() => {
                    setPreviewingTemplateId(null);
                    setHoveredTemplateId(null);
                  }}
                  className="px-1.5 py-1 rounded-lg text-[10px] font-semibold text-[#706c64] hover:bg-[#f8f6f0] transition cursor-pointer"
                  title="Exit Preview"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Outer Specular Double Bezel Simulator Wrapper */}
          <div
            className={`relative p-[1.5px] ${previewRadiusOuter} transition-all duration-300 ${
              displayConfig.specularBezel
                ? previewThemeMode === "dark"
                  ? "bg-gradient-to-br from-white/20 via-white/5 to-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                  : "bg-gradient-to-br from-white/95 via-[#E6EAF5]/80 to-white/95 shadow-[0_8px_24px_rgba(18,18,26,0.08)]"
                : "border shadow-md"
            }`}
            style={{
              borderColor: displayConfig.specularBezel ? "transparent" : previewBorder,
              boxShadow: displayConfig.glowEffect ? `0 0 24px ${displayConfig.accentColor}33` : undefined
            }}
          >
            {/* Inner Liquid Glass Body */}
            <div
              className={`relative w-full ${previewRadiusInner} p-2.5 transition-all duration-300 overflow-hidden text-left flex flex-col justify-between`}
              style={{
                background: previewBg,
                color: previewThemeMode === "dark" ? "#ffffff" : "#111827",
                backdropFilter: displayConfig.blur === "ultra" ? "blur(40px)" : displayConfig.blur === "deep" ? "blur(24px)" : displayConfig.blur === "soft" ? "blur(12px)" : "none",
                minHeight: "370px"
              }}
            >
              {/* Texture Overlay Layer */}
              <div
                className="absolute inset-0 pointer-events-none rounded-[inherit]"
                style={textureOverlay}
              />

              {/* Top: Header + Quick Capsule + Search */}
              <div className="relative z-10 space-y-2">
                {/* Header Simulator */}
                <div className="flex items-center justify-between pb-1.5 border-b border-black/5 dark:border-white/10">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className="h-5 w-5 rounded-lg flex items-center justify-center text-[10px] text-white font-bold shrink-0 shadow-2xs"
                      style={{ backgroundColor: displayConfig.accentColor }}
                    >
                      N
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold truncate leading-tight">Noska Workspace</div>
                      <div className="text-[8.5px] opacity-60 truncate leading-none mt-0.5">Admin Account</div>
                    </div>
                  </div>
                </div>

                {/* Quick Capsule Nav Simulator */}
                {displayConfig.showQuickNav && (
                  <div className="p-0.5 rounded-full bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10 flex items-center justify-between px-1.5 py-0.5">
                    {displayConfig.quickTabs?.home && (
                      <div className="p-1 rounded-full bg-white dark:bg-neutral-800 shadow-2xs">
                        <Folder size={10} style={{ color: displayConfig.accentColor }} />
                      </div>
                    )}
                    {displayConfig.quickTabs?.aiSpace && <Brain size={10} className="opacity-60" />}
                    {displayConfig.quickTabs?.meetings && <Calendar size={10} className="opacity-60" />}
                    {displayConfig.quickTabs?.library && <Library size={10} className="opacity-60" />}
                    {displayConfig.quickTabs?.inbox && <Bell size={10} className="opacity-60" />}
                  </div>
                )}

                {/* Search Bar Simulator */}
                {displayConfig.showSearch && (
                  <div className="h-5 rounded-md bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10 flex items-center justify-between px-1.5 text-[8.5px] opacity-70">
                    <div className="flex items-center gap-1">
                      <Search size={8.5} />
                      <span className="truncate">Search...</span>
                    </div>
                    <span className="text-[7.5px] opacity-60 font-mono">⌘K</span>
                  </div>
                )}
              </div>

              {/* Center: Scrollable Rendered Section Items */}
              <div
                className="relative z-10 py-1.5 max-h-[170px] overflow-hidden transition-all duration-200"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: displayConfig.density === "ultra-compact" ? "4px" : displayConfig.density === "compact" ? "6px" : displayConfig.density === "spacious" ? "12px" : "8px"
                }}
              >
                {displayConfig.sectionOrder.map((secKey) => {
                  if (displayConfig.sectionVisibility[secKey] === false) return null;
                  const sec = ALL_SIDEBAR_SECTIONS.find((s) => s.key === secKey);
                  if (!sec) return null;

                  const rowHeight = displayConfig.density === "ultra-compact" ? "13px" : displayConfig.density === "compact" ? "16px" : displayConfig.density === "spacious" ? "24px" : "20px";
                  const fontSize = displayConfig.density === "ultra-compact" ? "7px" : displayConfig.density === "compact" ? "8px" : displayConfig.density === "spacious" ? "9.5px" : "8.5px";

                  return (
                    <div key={secKey} className="space-y-0.5">
                      <div className="text-[7.5px] font-bold uppercase tracking-wider opacity-50 px-1">
                        {sec.label}
                      </div>
                      <div
                        className="rounded-md bg-black/5 dark:bg-white/5 flex items-center justify-between px-1.5 truncate transition-all duration-200"
                        style={{ height: rowHeight, minHeight: rowHeight, fontSize }}
                      >
                        <span className="truncate">• {sec.label} items</span>
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: displayConfig.accentColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom: Dynamic Info Card & New Creation Button */}
              <div className="relative z-10 pt-1 border-t border-black/5 dark:border-white/10 space-y-1.5">
                {displayConfig.showUserInfoCard && (
                  <div className="p-1 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-[8px] flex items-center gap-1 opacity-80">
                    <Sparkle size={8} style={{ color: displayConfig.accentColor }} />
                    <span className="truncate">Noska Pro Active</span>
                  </div>
                )}

                {displayConfig.showNewCreationButton && (
                  <div
                    className="h-5.5 rounded-lg flex items-center justify-between px-2 text-[9px] font-semibold text-white shadow-xs"
                    style={{
                      background: displayConfig.newCreationColor === "amber-gold"
                        ? "linear-gradient(135deg, #E6CA9E 0%, #D5B584 100%)"
                        : displayConfig.newCreationColor === "rose-clay"
                        ? "linear-gradient(135deg, #dfa0a7 0%, #ba7e84 100%)"
                        : displayConfig.newCreationColor === "sage-olive"
                        ? "linear-gradient(135deg, #9bb8a0 0%, #7a9a80 100%)"
                        : displayConfig.newCreationColor === "nordic-slate"
                        ? "linear-gradient(135deg, #8ba8be 0%, #6b8ba4 100%)"
                        : displayConfig.newCreationColor === "cyber-cyan"
                        ? "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)"
                        : displayConfig.newCreationColor === "purple-radiant"
                        ? "linear-gradient(135deg, #c084fc 0%, #8b5cf6 100%)"
                        : "linear-gradient(135deg, #262626 0%, #171717 100%)",
                      color: ["amber-gold", "rose-clay", "sage-olive"].includes(displayConfig.newCreationColor) ? "#1c1b18" : "#ffffff"
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <PlusCircle size={9} />
                      <span>New Creation</span>
                    </div>
                    <span className="text-[7.5px] opacity-75 font-mono">⌘P</span>
                  </div>
                )}

                {displayConfig.showMoreButton && (
                  <div className="flex items-center justify-between px-1 text-[8px] opacity-60">
                    <span>⋮ More Options</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#706c64] text-center italic">
            Theme: <span className="font-semibold text-[#1c1b18]">{displayConfig.themePreset}</span> · Texture: <span className="font-semibold text-[#1c1b18]">{displayConfig.texture}</span>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: CUSTOMIZATION TABS & CONTROLS
           ========================================================================= */}
        <div className="space-y-5">
          {/* Main Top Navigation Sub-Tabs */}
          <div className="grid grid-cols-6 gap-1 p-1 rounded-2xl bg-[#f8f6f0] border border-[#e8e4db] w-full">
            {[
              { id: "templates", label: "Templates", icon: Layout },
              { id: "aesthetics", label: "Aesthetics", icon: Palette },
              { id: "textures", label: "Textures", icon: Layers },
              { id: "arrangements", label: "Arrangements", icon: SlidersHorizontal },
              { id: "whatsNeed", label: "Whats Need", icon: CheckSquare },
              { id: "bottom", label: "Buttons & Actions", icon: Sparkles }
            ].map((tabItem) => {
              const isSelected = activeTab === tabItem.id;
              const Icon = tabItem.icon;
              return (
                <button
                  key={tabItem.id}
                  onClick={() => setActiveTab(tabItem.id as typeof activeTab)}
                  className={`relative py-2 px-1 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer select-none text-center min-w-0 ${
                    isSelected ? "text-[#1c1b18]" : "text-[#706c64] hover:text-[#1c1b18]"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="sidebarCustomizerTabActive"
                      className="absolute inset-0 rounded-xl bg-white shadow-xs border border-[#e8e4db]"
                      transition={{ type: "spring", stiffness: 440, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-1 truncate">
                    <Icon size={12.5} className="shrink-0" />
                    <span className="truncate">{tabItem.label}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB 0: COMPLETE SIDEBAR LAYOUT TEMPLATES
             ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === "templates" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-[#f8f6f0] p-5 shadow-sm border border-[#e8e4db] space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="text-sm font-semibold text-[#1c1b18]">Complete Sidebar Layout Templates</div>
                    <div className="text-xs text-[#706c64] mt-0.5">
                      Hover over any template to preview it live in the simulator, or click to apply.
                    </div>
                  </div>
                  {previewingTemplateId && (
                    <button
                      onClick={() => setPreviewingTemplateId(null)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-[#e8e4db] bg-white text-[#706c64] hover:text-[#1c1b18] transition cursor-pointer"
                    >
                      Clear Preview
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3.5 max-[900px]:grid-cols-1 pt-1">
                  {SIDEBAR_LAYOUT_TEMPLATES.map((tpl) => {
                    const isCurrent = config.themePreset === tpl.config.themePreset && config.density === tpl.config.density && config.texture === tpl.config.texture;
                    const isPreviewing = (previewingTemplateId === tpl.id) || (hoveredTemplateId === tpl.id);
                    const tplFull = getFullTemplateConfig(tpl);
                    const tplTexOverlay = getTextureOverlayStyle(tpl.config.texture || "clean");

                    return (
                      <div
                        key={tpl.id}
                        onMouseEnter={() => setHoveredTemplateId(tpl.id)}
                        onMouseLeave={() => setHoveredTemplateId(null)}
                        onClick={() => setPreviewingTemplateId(tpl.id)}
                        className={`rounded-2xl border p-4 transition-all flex flex-col justify-between gap-3 bg-white cursor-pointer ${
                          isCurrent
                            ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30 shadow-md"
                            : isPreviewing
                            ? "border-[#1c1b18] ring-2 ring-[#1c1b18]/15 shadow-sm"
                            : "border-[#e8e4db] hover:border-[#1c1b18]/40 hover:shadow-xs"
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Rich Mini-Sidebar Visual Mockup Header */}
                          <div
                            className="h-24 w-full rounded-xl relative overflow-hidden shadow-inner border border-black/10 p-2 flex flex-col justify-between"
                            style={{
                              background: previewThemeMode === "dark" ? tplFull.customBgDark : tplFull.customBgLight,
                              color: previewThemeMode === "dark" ? "#ffffff" : "#1c1b18"
                            }}
                          >
                            {/* Texture overlay in mockup */}
                            <div className="absolute inset-0 pointer-events-none rounded-[inherit]" style={tplTexOverlay} />

                            {/* Mini Mockup Top Header */}
                            <div className="relative z-10 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="h-4.5 w-4.5 rounded-md flex items-center justify-center text-white font-bold text-[9px] shadow-2xs"
                                  style={{ backgroundColor: tpl.accent }}
                                >
                                  N
                                </span>
                                <span className="text-[10px] font-bold truncate max-w-[120px]">
                                  {tpl.name}
                                </span>
                              </div>
                              <span
                                className="px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider bg-black/10 dark:bg-white/15 backdrop-blur-xs border border-white/20 shadow-2xs"
                              >
                                {tpl.config.density}
                              </span>
                            </div>

                            {/* Mini Mockup Section Rows */}
                            <div className="relative z-10 space-y-1">
                              <div className="h-2 rounded-xs bg-black/10 dark:bg-white/10 w-3/4 flex items-center px-1">
                                <div className="h-1 w-1 rounded-full" style={{ backgroundColor: tpl.accent }} />
                              </div>
                              <div className="h-2 rounded-xs bg-black/10 dark:bg-white/10 w-1/2 flex items-center px-1">
                                <div className="h-1 w-1 rounded-full" style={{ backgroundColor: tpl.accent }} />
                              </div>
                              <div className="h-2 rounded-xs bg-black/10 dark:bg-white/10 w-2/3 flex items-center px-1">
                                <div className="h-1 w-1 rounded-full" style={{ backgroundColor: tpl.accent }} />
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-bold text-[#1c1b18]">{tpl.name}</div>
                              {isPreviewing && !isCurrent && (
                                <span className="text-[9.5px] font-bold text-[#a8824b] uppercase tracking-wide">
                                  Live in Simulator
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-medium text-[#a8824b] mt-0.5">{tpl.tagline}</div>
                            <p className="text-[11px] text-[#706c64] mt-1 leading-relaxed">{tpl.description}</p>
                          </div>

                          {/* Quick spec badges */}
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            <span className="px-1.5 py-0.5 rounded-md bg-[#f8f6f0] text-[9.5px] font-mono text-[#706c64] border border-[#e8e4db]">
                              {tpl.config.radius}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md bg-[#f8f6f0] text-[9.5px] font-mono text-[#706c64] border border-[#e8e4db]">
                              {tpl.config.texture}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md bg-[#f8f6f0] text-[9.5px] font-mono text-[#706c64] border border-[#e8e4db]">
                              blur: {tpl.config.blur}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateConfig(getFullTemplateConfig(tpl));
                            setPreviewingTemplateId(null);
                            setHoveredTemplateId(null);
                            onToast?.(`Applied "${tpl.name}" sidebar template`);
                          }}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            isCurrent
                              ? "bg-[#1c1b18] text-white shadow-xs"
                              : "bg-[#f8f6f0] hover:bg-[#ede8df] text-[#1c1b18] border border-[#e8e4db]"
                          }`}
                        >
                          {isCurrent ? (
                            <>
                              <Check size={13} />
                              <span>Active Template</span>
                            </>
                          ) : (
                            <span>Apply Template</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB 1: AESTHETICS & COLORS (Soft Luxury Gradients & Soft Solids)
             ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === "aesthetics" && (
            <div className="space-y-6">
              {/* Theme Palettes (Soft Gradients & Soft Solids) */}
              <div className="rounded-2xl bg-[#f8f6f0] p-5 shadow-sm border border-[#e8e4db] space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="text-sm font-semibold text-[#1c1b18]">Soft Aesthetic Color Palettes</div>
                    <div className="text-xs text-[#706c64] mt-0.5">
                      Curated smooth, calming luxury tones with zero harsh or punchy colors.
                    </div>
                  </div>

                  {/* Filter switcher */}
                  <div className="flex items-center gap-1 bg-[#ede8df] p-0.5 rounded-xl text-xs flex-wrap">
                    {([
                      { id: "all", label: "All Palettes" },
                      { id: "gradient", label: "Luxury Gradients" },
                      { id: "cyber", label: "Cyber & OLED" },
                      { id: "artisan", label: "Nature & Artisan" },
                      { id: "solid", label: "Smooth Solids" }
                    ] as const).map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setThemeFilter(filter.id)}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                          themeFilter === filter.id
                            ? "bg-white shadow-xs text-[#1c1b18]"
                            : "text-[#706c64] hover:text-[#1c1b18]"
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 max-[620px]:grid-cols-1">
                  {filteredPresets.map((preset) => {
                    const isSelected = config.themePreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          updateConfig({
                            themePreset: preset.id,
                            customBgLight: preset.bgLight,
                            customBgDark: preset.bgDark,
                            customBorderLight: preset.borderLight,
                            customBorderDark: preset.borderDark,
                            accentColor: preset.accent
                          });
                          onToast?.(`Applied ${preset.name} theme`);
                        }}
                        className={`relative p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5 ${
                          isSelected
                            ? "border-[#1c1b18] bg-white ring-2 ring-[#1c1b18]/15 shadow-sm"
                            : "border-[#e8e4db] bg-white hover:border-[#1c1b18]/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="h-5 w-5 rounded-full shrink-0 border border-black/10 shadow-2xs"
                              style={{ background: preset.previewGradient }}
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-[#1c1b18] truncate block">{preset.name}</span>
                              <span className="text-[10px] text-[#8c887f] font-medium uppercase tracking-wider">
                                {preset.type === "gradient" ? "Soft Gradient" : "Smooth Solid"}
                              </span>
                            </div>
                          </div>
                          {isSelected && <Check size={14} className="text-[#1c1b18] shrink-0" />}
                        </div>
                        <p className="text-[11px] text-[#706c64] leading-relaxed line-clamp-2">
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Soft Muted Accent Colors */}
              <div className="rounded-2xl bg-[#f8f6f0] p-5 shadow-sm border border-[#e8e4db] space-y-3">
                <div>
                  <div className="text-sm font-semibold text-[#1c1b18]">Soft Accent & Highlight Colors</div>
                  <div className="text-xs text-[#706c64] mt-0.5">
                    Muted, calming accent highlights for active badges, pills, and indicators.
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 max-[700px]:grid-cols-2 pt-1">
                  {SOFT_ACCENT_PALETTES.map((pal) => {
                    const isSelected = config.accentColor === pal.value;
                    return (
                      <button
                        key={pal.value}
                        onClick={() => {
                          setCustomAccent(pal.value);
                          updateConfig({ accentColor: pal.value });
                          onToast?.(`Accent color changed to ${pal.label}`);
                        }}
                        className={`flex items-center gap-2 p-2 rounded-xl border transition cursor-pointer text-xs font-semibold ${
                          isSelected
                            ? "border-[#1c1b18] bg-white shadow-xs text-[#1c1b18] ring-1 ring-[#1c1b18]/20"
                            : "border-[#e8e4db] bg-white text-[#706c64] hover:text-[#1c1b18]"
                        }`}
                      >
                        <span className="h-3.5 w-3.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: pal.value }} />
                        <span className="truncate">{pal.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Hex Color Picker */}
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#706c64]">Custom Accent:</span>
                  <input
                    type="color"
                    value={customAccent}
                    onChange={(e) => {
                      setCustomAccent(e.target.value);
                      updateConfig({ accentColor: e.target.value });
                    }}
                    className="h-8 w-8 rounded-xl border border-[#e8e4db] bg-white cursor-pointer p-0.5"
                    title="Pick custom color"
                  />
                  <span className="text-xs font-mono text-[#706c64]">{customAccent}</span>
                </div>
              </div>

              {/* Density & Curvature Settings */}
              <div className="rounded-2xl bg-[#f8f6f0] p-5 shadow-sm border border-[#e8e4db] space-y-4">
                <div>
                  <div className="text-sm font-semibold text-[#1c1b18]">Curvature, Density & Glass Physics</div>
                  <div className="text-xs text-[#706c64] mt-0.5">Fine-tune corner rounding, item compactness, and glass effects.</div>
                </div>

                <div className="space-y-4 pt-1">
                  {/* Curvature */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-[#1c1b18]">Border Curvature</label>
                      <span className="text-[11px] font-mono font-medium text-[#8c887f]">
                        {config.radius === "apple-curved" ? "Apple (30px)" : config.radius === "squircle" ? "Squircle (20px)" : config.radius === "subtle" ? "Subtle (12px)" : "Sharp (4px)"}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-white border border-[#e8e4db] shadow-2xs">
                      {[
                        { id: "apple-curved", label: "Apple" },
                        { id: "squircle", label: "Squircle" },
                        { id: "subtle", label: "Subtle" },
                        { id: "sharp", label: "Sharp" }
                      ].map((r) => {
                        const isSelected = config.radius === r.id;
                        return (
                          <button
                            key={r.id}
                            onClick={() => updateConfig({ radius: r.id as SidebarRadiusPreset })}
                            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer select-none text-center ${
                              isSelected
                                ? "bg-[#1c1b18] text-white shadow-xs font-bold"
                                : "text-[#706c64] hover:text-[#1c1b18] hover:bg-[#f8f6f0]"
                            }`}
                          >
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Density */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-[#1c1b18]">Row Density</label>
                      <span className="text-[11px] font-mono font-medium text-[#8c887f]">
                        {config.density === "ultra-compact" ? "Ultra (24px)" : config.density === "compact" ? "Compact (26px)" : config.density === "standard" ? "Standard (32px)" : "Spacious (38px)"}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-white border border-[#e8e4db] shadow-2xs">
                      {[
                        { id: "ultra-compact", label: "Ultra" },
                        { id: "compact", label: "Compact" },
                        { id: "standard", label: "Standard" },
                        { id: "spacious", label: "Spacious" }
                      ].map((d) => {
                        const isSelected = config.density === d.id;
                        return (
                          <button
                            key={d.id}
                            onClick={() => updateConfig({ density: d.id as SidebarDensityPreset })}
                            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer select-none text-center ${
                              isSelected
                                ? "bg-[#1c1b18] text-white shadow-xs font-bold"
                                : "text-[#706c64] hover:text-[#1c1b18] hover:bg-[#f8f6f0]"
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Surface Texture & Specular Bezel Toggles */}
                <div className="pt-3 border-t border-[#e8e4db] flex items-center justify-between flex-wrap gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={config.specularBezel}
                      onChange={(e) => updateConfig({ specularBezel: e.target.checked })}
                      className="h-4 w-4 rounded accent-[#1c1b18]"
                    />
                    <span className="text-xs font-semibold text-[#1c1b18]">Specular Double Bezel Shell</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={config.glowEffect}
                      onChange={(e) => updateConfig({ glowEffect: e.target.checked })}
                      className="h-4 w-4 rounded accent-[#1c1b18]"
                    />
                    <span className="text-xs font-semibold text-[#1c1b18]">Ambient Luminosity Glow</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB 2: TEXTURES & MATERIALS (Physical tactile micro textures)
             ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === "textures" && (
            <div className="rounded-2xl bg-[#f8f6f0] p-5 shadow-sm border border-[#e8e4db] space-y-4">
              <div>
                <div className="text-sm font-semibold text-[#1c1b18]">Tactile Textures & Glass Finishes</div>
                <div className="text-xs text-[#706c64] mt-0.5">
                  Apply genuine microscopic physical texture overlays to add depth and luxury feel.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 max-[620px]:grid-cols-1 pt-1">
                {TEXTURE_DEFINITIONS.map((tex) => {
                  const isSelected = config.texture === tex.id;
                  return (
                    <button
                      key={tex.id}
                      type="button"
                      onClick={() => {
                        updateConfig({ texture: tex.id });
                        onToast?.(`Texture changed to ${tex.name}`);
                      }}
                      className={`relative p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5 ${
                        isSelected
                          ? "border-[#1c1b18] bg-white ring-2 ring-[#1c1b18]/15 shadow-sm"
                          : "border-[#e8e4db] bg-white hover:border-[#1c1b18]/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="h-6 w-6 rounded-lg shrink-0 border border-black/10 shadow-2xs relative overflow-hidden bg-neutral-100"
                            style={{ background: tex.preview }}
                          />
                          <span className="text-xs font-bold text-[#1c1b18] truncate">{tex.name}</span>
                        </div>
                        {isSelected && <Check size={14} className="text-[#1c1b18] shrink-0" />}
                      </div>
                      <p className="text-[11px] text-[#706c64] leading-relaxed">
                        {tex.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB 3: ARRANGEMENTS (Drag to Place Reordering)
             ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === "arrangements" && (
            <div className="rounded-2xl bg-[#f8f6f0] p-5 shadow-sm border border-[#e8e4db] space-y-4">
              <div>
                <div className="text-sm font-semibold text-[#1c1b18]">Drag to Place Section Arrangement</div>
                <div className="text-xs text-[#706c64] mt-0.5">
                  Click and drag the handle <span className="font-semibold text-[#1c1b18]">⋮⋮</span> to reorder sections anywhere in the sidebar, or use the Up/Down buttons.
                </div>
              </div>

              <Reorder.Group
                axis="y"
                values={config.sectionOrder}
                onReorder={(newOrder) => {
                  updateConfig({ sectionOrder: newOrder });
                  onToast?.("Section order updated");
                }}
                className="space-y-2 pt-1"
              >
                {config.sectionOrder.map((secKey, index) => {
                  const meta = ALL_SIDEBAR_SECTIONS.find((s) => s.key === secKey);
                  if (!meta) return null;
                  const isVisible = config.sectionVisibility[secKey] !== false;

                  return (
                    <Reorder.Item
                      key={secKey}
                      value={secKey}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-grab active:cursor-grabbing ${
                        isVisible
                          ? "bg-white border-[#e8e4db] shadow-2xs hover:shadow-md"
                          : "bg-[#ede8df]/50 border-transparent opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="text-[#a09c94] hover:text-[#1c1b18] cursor-grab active:cursor-grabbing p-1">
                          <GripVertical size={16} />
                        </div>
                        <span className="w-5 text-center text-xs font-mono font-bold text-[#8c887f]">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#1c1b18] flex items-center gap-2">
                            <span>{meta.label}</span>
                            <span className="text-[10px] font-medium text-[#8c887f] bg-[#ede8df] px-1.5 py-0.2 rounded">
                              {meta.category}
                            </span>
                            {!isVisible && (
                              <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded">
                                Hidden
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#706c64] truncate mt-0.5">
                            {meta.description}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-3">
                        {/* Quick Move Up */}
                        <button
                          onClick={() => handleMoveSection(index, "up")}
                          disabled={index === 0}
                          className="h-7 w-7 rounded-lg border border-[#e8e4db] bg-white hover:bg-[#ede8df] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-[#706c64] hover:text-[#1c1b18] transition cursor-pointer"
                          title="Move up"
                        >
                          <ArrowUp size={13} />
                        </button>

                        {/* Quick Move Down */}
                        <button
                          onClick={() => handleMoveSection(index, "down")}
                          disabled={index === config.sectionOrder.length - 1}
                          className="h-7 w-7 rounded-lg border border-[#e8e4db] bg-white hover:bg-[#ede8df] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-[#706c64] hover:text-[#1c1b18] transition cursor-pointer"
                          title="Move down"
                        >
                          <ArrowDown size={13} />
                        </button>

                        {/* Toggle Visibility */}
                        <button
                          onClick={() => handleToggleSection(secKey)}
                          className={`h-7 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                            isVisible
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "border-[#e8e4db] bg-white text-[#706c64] hover:bg-[#ede8df]"
                          }`}
                        >
                          {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                          <span>{isVisible ? "Visible" : "Hidden"}</span>
                        </button>
                      </div>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB 4: WHATS NEED (Granular checklist of what to show in Sidebar)
             ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === "whatsNeed" && (
            <div className="rounded-2xl bg-[#f8f6f0] p-5 shadow-sm border border-[#e8e4db] space-y-5">
              <div>
                <div className="text-sm font-semibold text-[#1c1b18]">Whats Need · Sidebar Feature Checklist</div>
                <div className="text-xs text-[#706c64] mt-0.5">
                  Pick and customize exact components, pages, widgets, and tools you want visible in your sidebar.
                </div>
              </div>

              {/* Group 1: Core Navigation & Hubs */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#8c887f]">1. Workspace Hub Items</div>
                <div className="grid grid-cols-3 gap-2 max-[640px]:grid-cols-1">
                  {[
                    { key: "dailyJournal", label: "Daily Journal", desc: "Notes & day logs" },
                    { key: "myTasks", label: "My Tasks", desc: "Task tracking matrix" },
                    { key: "calendar", label: "Calendar Schedule", desc: "Events & timelines" }
                  ].map((item) => {
                    const isChecked = config.itemVisibility?.[item.key as keyof SidebarItemVisibility] !== false;
                    return (
                      <button
                        key={item.key}
                        onClick={() => handleToggleItem(item.key as keyof SidebarItemVisibility)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                          isChecked
                            ? "bg-white border-[#e8e4db] shadow-2xs"
                            : "bg-[#ede8df]/50 border-transparent opacity-60"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#1c1b18] truncate">{item.label}</div>
                          <div className="text-[10px] text-[#706c64] truncate">{item.desc}</div>
                        </div>
                        {isChecked ? <CheckSquare size={16} className="text-emerald-600 shrink-0" /> : <Square size={16} className="text-neutral-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Add to Calendar in Topbar setting */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-[#e8e4db] bg-white shadow-2xs mt-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Calendar size={14} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1c1b18]">Add to Calendar in Topbar</div>
                      <div className="text-[10px] text-[#706c64]">Show quick calendar sync icon in workspace page topbar</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = toggleCalendarTopbar();
                      onToast?.(next ? "Calendar icon enabled in topbar" : "Calendar icon hidden from topbar");
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      calendarTopbarEnabled ? "bg-[#1c1b18]" : "bg-[#e8e4db]"
                    }`}
                  >
                    <span
                      className={`inline-block size-4 rounded-full bg-white shadow-xs transition-transform ${
                        calendarTopbarEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#e8e4db] shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <FileText size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1c1b18]">Auto-Show Created Pages in Calendar</div>
                      <div className="text-[10px] text-[#706c64]">Automatically include newly created workspace pages in timetable (Default: Off)</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = toggleAutoPages();
                      onToast?.(next ? "Auto-show created pages enabled" : "Auto-show created pages disabled");
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      autoPagesEnabled ? "bg-emerald-600" : "bg-[#e8e4db]"
                    }`}
                  >
                    <span
                      className={`inline-block size-4 rounded-full bg-white shadow-xs transition-transform ${
                        autoPagesEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Group 2: Organization & Teams */}
              <div className="space-y-2 pt-2 border-t border-[#e8e4db]">
                <div className="text-xs font-bold uppercase tracking-wider text-[#8c887f]">2. Organization & Teams</div>
                <div className="grid grid-cols-3 gap-2 max-[640px]:grid-cols-1">
                  {[
                    { key: "companySwitcher", label: "Company Switcher", desc: "Workspace organization dropdown" },
                    { key: "companyHome", label: "Company Home", desc: "Organization main dashboard" },
                    { key: "teamSwitcher", label: "Team Switcher", desc: "Team channels & switcher" },
                    { key: "collabHub", label: "Collaboration Hub", desc: "Shared live workspaces" }
                  ].map((item) => {
                    const isChecked = config.itemVisibility?.[item.key as keyof SidebarItemVisibility] !== false;
                    return (
                      <button
                        key={item.key}
                        onClick={() => handleToggleItem(item.key as keyof SidebarItemVisibility)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                          isChecked
                            ? "bg-white border-[#e8e4db] shadow-2xs"
                            : "bg-[#ede8df]/50 border-transparent opacity-60"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#1c1b18] truncate">{item.label}</div>
                          <div className="text-[10px] text-[#706c64] truncate">{item.desc}</div>
                        </div>
                        {isChecked ? <CheckSquare size={16} className="text-emerald-600 shrink-0" /> : <Square size={16} className="text-neutral-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Group 3: AI Intelligence & Automation */}
              <div className="space-y-2 pt-2 border-t border-[#e8e4db]">
                <div className="text-xs font-bold uppercase tracking-wider text-[#8c887f]">3. AI Intelligence & Agents</div>
                <div className="grid grid-cols-3 gap-2 max-[640px]:grid-cols-1">
                  {[
                    { key: "commandCenter", label: "Command Center", desc: "AI operations hub" },
                    { key: "agents", label: "AI Agents", desc: "Autonomous agent workers" },
                    { key: "automations", label: "Automations", desc: "Workflow triggers & sync" },
                    { key: "aiMeetingCapture", label: "AI Meeting Capture", desc: "Live speech transcribe" }
                  ].map((item) => {
                    const isChecked = config.itemVisibility?.[item.key as keyof SidebarItemVisibility] !== false;
                    return (
                      <button
                        key={item.key}
                        onClick={() => handleToggleItem(item.key as keyof SidebarItemVisibility)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                          isChecked
                            ? "bg-white border-[#e8e4db] shadow-2xs"
                            : "bg-[#ede8df]/50 border-transparent opacity-60"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#1c1b18] truncate">{item.label}</div>
                          <div className="text-[10px] text-[#706c64] truncate">{item.desc}</div>
                        </div>
                        {isChecked ? <CheckSquare size={16} className="text-emerald-600 shrink-0" /> : <Square size={16} className="text-neutral-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Group 4: Developer Tools & System */}
              <div className="space-y-2 pt-2 border-t border-[#e8e4db]">
                <div className="text-xs font-bold uppercase tracking-wider text-[#8c887f]">4. Marketplace & Power Tools</div>
                <div className="grid grid-cols-3 gap-2 max-[640px]:grid-cols-1">
                  {[
                    { key: "templates", label: "Templates Library", desc: "Community template gallery" },
                    { key: "creatorStudio", label: "Creator Studio", desc: "Build & publish templates" },
                    { key: "spacedRepetition", label: "Spaced Repetition", desc: "Brain memory flashcards" },
                    { key: "apiConsole", label: "API Console", desc: "Developer API token hub" },
                    { key: "helpCenter", label: "Help Center", desc: "Documentation & tutorials" },
                    { key: "trash", label: "Trash Recycle Bin", desc: "Archived deleted documents" }
                  ].map((item) => {
                    const isChecked = config.itemVisibility?.[item.key as keyof SidebarItemVisibility] !== false;
                    return (
                      <button
                        key={item.key}
                        onClick={() => handleToggleItem(item.key as keyof SidebarItemVisibility)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                          isChecked
                            ? "bg-white border-[#e8e4db] shadow-2xs"
                            : "bg-[#ede8df]/50 border-transparent opacity-60"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#1c1b18] truncate">{item.label}</div>
                          <div className="text-[10px] text-[#706c64] truncate">{item.desc}</div>
                        </div>
                        {isChecked ? <CheckSquare size={16} className="text-emerald-600 shrink-0" /> : <Square size={16} className="text-neutral-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB 5: BOTTOM & ACTIONS
             ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === "bottom" && (
            <div className="space-y-6">
              {/* Workspace Topbar "Add to Calendar" Button */}
              <div className="rounded-2xl bg-[#f8f6f0] p-5 shadow-sm border border-[#e8e4db] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9 rounded-xl bg-white border border-[#e8e4db] shadow-2xs flex items-center justify-center shrink-0">
                      <div className="relative w-[18px] h-[18px] rounded-[5px] overflow-hidden border border-black/10 shadow-xs">
                        <div className="h-[6px] w-full bg-gradient-to-r from-[#f59e0b] via-[#fb923c] to-[#38bdf8]" />
                        <div className="h-[12px] w-full bg-gradient-to-b from-white to-white/70 backdrop-blur-md flex items-center justify-center">
                          <div className="w-[8px] h-[1.5px] rounded-full bg-blue-500/80" />
                        </div>
                      </div>
                      <div className="absolute top-[7px] left-[11.5px] w-[2px] h-[3.5px] rounded-full bg-neutral-700/80 border border-black/10 shadow-2xs" />
                      <div className="absolute top-[7px] right-[11.5px] w-[2px] h-[3.5px] rounded-full bg-neutral-700/80 border border-black/10 shadow-2xs" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#1c1b18]">Add to Calendar Topbar Icon</div>
                      <div className="text-xs text-[#706c64] mt-0.5">
                        Shows the quick frosted calendar icon in the workspace page topbar. Click it to add pages to My Calendar.
                      </div>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={calendarTopbarEnabled}
                      onChange={() => {
                        const next = toggleCalendarTopbar();
                        onToast?.(next ? "Calendar icon enabled in topbar" : "Calendar icon hidden from topbar");
                      }}
                      className="h-4 w-4 rounded accent-[#1c1b18] cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-[#1c1b18]">
                      {calendarTopbarEnabled ? "Visible" : "Hidden"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Quick Navigation Capsule Bar */}
              <div className="rounded-2xl bg-[#f8f6f0] p-5 shadow-sm border border-[#e8e4db] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[#1c1b18]">Quick Navigation Capsule Bar</div>
                    <div className="text-xs text-[#706c64] mt-0.5">
                      Apple-styled fluid sliding capsule above the search bar.
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showQuickNav}
                      onChange={(e) => updateConfig({ showQuickNav: e.target.checked })}
                      className="h-4 w-4 rounded accent-[#1c1b18]"
                    />
                    <span className="text-xs font-semibold text-[#1c1b18]">Enable Bar</span>
                  </label>
                </div>

                {config.showQuickNav && (
                  <div className="pt-2 border-t border-[#e8e4db] space-y-2">
                    <div className="text-xs font-semibold text-[#706c64] mb-2">Individual Capsule Tabs</div>
                    {[
                      { key: "home", label: "Home", icon: Folder },
                      { key: "aiSpace", label: "AI Space", icon: Brain },
                      { key: "meetings", label: "Meetings", icon: Calendar },
                      { key: "library", label: "Library", icon: Library },
                      { key: "inbox", label: "Inbox", icon: Bell }
                    ].map((t) => {
                      const isEnabled = config.quickTabs[t.key as keyof typeof config.quickTabs];
                      const Icon = t.icon;
                      return (
                        <div
                          key={t.key}
                          className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#e8e4db]"
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon size={15} style={{ color: config.accentColor }} />
                            <span className="text-xs font-semibold text-[#1c1b18]">{t.label}</span>
                          </div>
                          <button
                            onClick={() => handleToggleQuickTab(t.key as keyof typeof config.quickTabs)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                              isEnabled
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-[#f8f6f0] border-[#e8e4db] text-[#706c64]"
                            }`}
                          >
                            {isEnabled ? "Shown" : "Hidden"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Search Workspace Bar */}
              <div className="rounded-2xl bg-[#f8f6f0] p-5 shadow-sm border border-[#e8e4db] flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-[#1c1b18]">Search Workspace Bar</div>
                  <div className="text-xs text-[#706c64] mt-0.5">Quick search shortcut capsule (`CTRL+K`)</div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showSearch}
                    onChange={(e) => updateConfig({ showSearch: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#1c1b18]"
                  />
                  <span className="text-xs font-semibold text-[#1c1b18]">
                    {config.showSearch ? "Visible" : "Hidden"}
                  </span>
                </label>
              </div>

              {/* New Creation Button */}
              <div className="rounded-2xl bg-[#f8f6f0] p-5 shadow-sm border border-[#e8e4db] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[#1c1b18]">New Creation Button (`CTRL+P`)</div>
                    <div className="text-xs text-[#706c64] mt-0.5">High-visibility action trigger at bottom of sidebar.</div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showNewCreationButton}
                      onChange={(e) => updateConfig({ showNewCreationButton: e.target.checked })}
                      className="h-4 w-4 rounded accent-[#1c1b18]"
                    />
                    <span className="text-xs font-semibold text-[#1c1b18]">
                      {config.showNewCreationButton ? "Visible" : "Hidden"}
                    </span>
                  </label>
                </div>

                {config.showNewCreationButton && (
                  <div className="pt-2 border-t border-[#e8e4db]">
                    <label className="text-xs font-semibold text-[#706c64] block mb-2">Button Color Style</label>
                    <div className="grid grid-cols-3 gap-2 max-[640px]:grid-cols-2">
                      {[
                        { id: "amber-gold", label: "Amber Gold", bg: "bg-gradient-to-r from-[#E6CA9E] to-[#D5B584]" },
                        { id: "rose-clay", label: "Rose Clay", bg: "bg-gradient-to-r from-[#dfa0a7] to-[#ba7e84]" },
                        { id: "sage-olive", label: "Sage Olive", bg: "bg-gradient-to-r from-[#9bb8a0] to-[#7a9a80]" },
                        { id: "nordic-slate", label: "Nordic Slate", bg: "bg-gradient-to-r from-[#8ba8be] to-[#6b8ba4]" },
                        { id: "cyber-cyan", label: "Cyber Mist", bg: "bg-gradient-to-r from-sky-400 to-cyan-500" },
                        { id: "purple-radiant", label: "Dusty Lavender", bg: "bg-gradient-to-r from-violet-400 to-fuchsia-400" },
                        { id: "monochrome", label: "Velvet Charcoal", bg: "bg-gradient-to-r from-neutral-800 to-neutral-900" }
                      ].map((btnStyle) => (
                        <button
                          key={btnStyle.id}
                          onClick={() => updateConfig({ newCreationColor: btnStyle.id as typeof config.newCreationColor })}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                            config.newCreationColor === btnStyle.id
                              ? "border-[#1c1b18] bg-white ring-1 ring-[#1c1b18]/20 shadow-xs"
                              : "border-[#e8e4db] bg-white text-[#706c64]"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`h-3.5 w-3.5 rounded-full ${btnStyle.bg} shrink-0 shadow-2xs`} />
                            <span className="truncate">{btnStyle.label}</span>
                          </div>
                          {config.newCreationColor === btnStyle.id && <Check size={13} className="text-[#1c1b18]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic User Sidebar Info Card */}
              <div className="rounded-2xl bg-[#f8f6f0] p-5 shadow-sm border border-[#e8e4db] flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-[#1c1b18]">User Promotional Info Card</div>
                  <div className="text-xs text-[#706c64] mt-0.5">Dynamic promotional on-boarding & announcements card on sidebar.</div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showUserInfoCard}
                    onChange={(e) => updateConfig({ showUserInfoCard: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#1c1b18]"
                  />
                  <span className="text-xs font-semibold text-[#1c1b18]">
                    {config.showUserInfoCard ? "Visible" : "Hidden"}
                  </span>
                </label>
              </div>

              {/* More Button */}
              <div className="rounded-2xl bg-[#f8f6f0] p-5 shadow-sm border border-[#e8e4db] flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-[#1c1b18]">Bottom `⋮ More` Options Menu</div>
                  <div className="text-xs text-[#706c64] mt-0.5">Quick account, switch workspace, and modal actions button.</div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showMoreButton}
                    onChange={(e) => updateConfig({ showMoreButton: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#1c1b18]"
                  />
                  <span className="text-xs font-semibold text-[#1c1b18]">
                    {config.showMoreButton ? "Visible" : "Hidden"}
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
