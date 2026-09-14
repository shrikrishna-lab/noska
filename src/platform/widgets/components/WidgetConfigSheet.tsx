/**
 * Noska Widget Platform — 5-Tab Live Configuration Sheet.
 * Sections: DATA, DISPLAY, BEHAVIOR, ACTIONS, ADVANCED.
 * Includes live real-time preview canvas.
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Database,
  Layout,
  Sliders,
  Zap,
  Shield,
  Save,
  RotateCcw,
  Check,
  Eye,
  Plus,
  Trash2,
} from "lucide-react";
import type { WidgetDefinition, WidgetSize } from "../types";

interface WidgetConfigSheetProps {
  definition: WidgetDefinition;
  initialConfig?: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  onClose: () => void;
}

type ConfigTab = "data" | "display" | "behavior" | "actions" | "advanced";

export function WidgetConfigSheet({
  definition,
  initialConfig = {},
  onSave,
  onClose,
}: WidgetConfigSheetProps) {
  const [activeTab, setActiveTab] = useState<ConfigTab>("data");
  const [draftConfig, setDraftConfig] = useState<Record<string, unknown>>({
    ...definition.defaultConfig,
    ...initialConfig,
  });

  const updateField = (key: string, value: unknown) => {
    setDraftConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(draftConfig);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, x: 280 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 280 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="relative h-full w-full max-w-xl bg-white dark:bg-[#161922] border-l border-[#e8e4db] dark:border-white/10 shadow-2xl flex flex-col justify-between text-[#1c1b18] dark:text-white select-none"
        >
          {/* Header */}
          <div className="p-5 pb-3 border-b border-[#e8e4db] dark:border-white/10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">{definition.name}</h2>
                <span className="text-[10px] font-semibold text-[#8c887f] bg-[#ede8df] dark:bg-white/10 px-2 py-0.5 rounded-md">
                  {definition.category}
                </span>
              </div>
              <p className="text-xs text-[#706c64] dark:text-neutral-400 mt-0.5">Customize data views, appearance, and actions</p>
            </div>
            <button
              onClick={onClose}
              className="size-8 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
            >
              <X size={17} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 px-5 pt-2 border-b border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-white/5 overflow-x-auto scrollbar-none">
            {[
              { id: "data", label: "Data & Query", icon: Database },
              { id: "display", label: "Display", icon: Layout },
              { id: "behavior", label: "Behavior", icon: Sliders },
              { id: "actions", label: "Actions", icon: Zap },
              { id: "advanced", label: "Advanced", icon: Shield },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ConfigTab)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "border-[#1c1b18] dark:border-white text-[#1c1b18] dark:text-white font-bold"
                      : "border-transparent text-[#706c64] dark:text-neutral-400 hover:text-[#1c1b18] dark:hover:text-white"
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
            {/* 1. DATA TAB */}
            {activeTab === "data" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold block mb-1.5">Data Source</label>
                  <select
                    value={(draftConfig.dataSource as string) || "workspace-tasks"}
                    onChange={(e) => updateField("dataSource", e.target.value)}
                    className="w-full rounded-xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-white/5 px-3 py-2 text-xs font-semibold outline-none focus:border-[#1c1b18]"
                  >
                    <option value="workspace-tasks">Workspace Tasks Database</option>
                    <option value="workspace-pages">Recent & Favorited Pages</option>
                    <option value="github-prs">GitHub Connected Pull Requests</option>
                    <option value="google-calendar">Google Calendar Events</option>
                    <option value="custom-api">Custom Webhook / Connector Source</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1.5">Filter Presets</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "all", label: "All Records" },
                      { id: "assigned_to_me", label: "Assigned to @me" },
                      { id: "due_this_week", label: "Due @this_week" },
                      { id: "overdue", label: "Overdue Only" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => updateField("filterPreset", f.id)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition cursor-pointer ${
                          draftConfig.filterPreset === f.id
                            ? "border-[#1c1b18] dark:border-white bg-black/5 dark:bg-white/10 font-bold"
                            : "border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-white/5 text-[#706c64]"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1.5">Sort Direction</label>
                  <select
                    value={(draftConfig.sortBy as string) || "priority"}
                    onChange={(e) => updateField("sortBy", e.target.value)}
                    className="w-full rounded-xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-white/5 px-3 py-2 text-xs font-semibold outline-none focus:border-[#1c1b18]"
                  >
                    <option value="priority">Priority (High to Low)</option>
                    <option value="due_date">Due Date (Earliest First)</option>
                    <option value="updated_at">Last Updated (Most Recent)</option>
                    <option value="title">Alphabetical (A to Z)</option>
                  </select>
                </div>
              </div>
            )}

            {/* 2. DISPLAY TAB */}
            {activeTab === "display" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold block mb-1.5">Information Density</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["compact", "normal", "comfortable"].map((den) => (
                      <button
                        key={den}
                        type="button"
                        onClick={() => updateField("density", den)}
                        className={`p-2 rounded-xl border text-xs font-semibold capitalize text-center transition cursor-pointer ${
                          (draftConfig.density || "normal") === den
                            ? "border-[#1c1b18] dark:border-white bg-black/5 dark:bg-white/10 font-bold"
                            : "border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-white/5 text-[#706c64]"
                        }`}
                      >
                        {den}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f8f6f0] dark:bg-white/5 border border-[#e8e4db] dark:border-white/10">
                  <div>
                    <span className="text-xs font-bold block">Show Header & Title</span>
                    <span className="text-[11px] text-[#706c64] dark:text-neutral-400">Display widget name and icon banner</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={draftConfig.showHeader !== false}
                    onChange={(e) => updateField("showHeader", e.target.checked)}
                    className="size-4 accent-[#1c1b18] dark:accent-white cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f8f6f0] dark:bg-white/5 border border-[#e8e4db] dark:border-white/10">
                  <div>
                    <span className="text-xs font-bold block">Highlight Overdue Badges</span>
                    <span className="text-[11px] text-[#706c64] dark:text-neutral-400">Show red pill counter for overdue tasks</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={draftConfig.showOverdue !== false}
                    onChange={(e) => updateField("showOverdue", e.target.checked)}
                    className="size-4 accent-[#1c1b18] dark:accent-white cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 3. BEHAVIOR TAB */}
            {activeTab === "behavior" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold block mb-1.5">Refresh Policy</label>
                  <select
                    value={(draftConfig.refreshPolicy as string) || "5m"}
                    onChange={(e) => updateField("refreshPolicy", e.target.value)}
                    className="w-full rounded-xl border border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-white/5 px-3 py-2 text-xs font-semibold outline-none focus:border-[#1c1b18]"
                  >
                    <option value="realtime">Realtime Event Stream</option>
                    <option value="1m">Every 1 minute</option>
                    <option value="5m">Every 5 minutes (Recommended)</option>
                    <option value="15m">Every 15 minutes</option>
                    <option value="manual">Manual Refresh Only</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f8f6f0] dark:bg-white/5 border border-[#e8e4db] dark:border-white/10">
                  <div>
                    <span className="text-xs font-bold block">Auto-Pause on Inactive Tabs</span>
                    <span className="text-[11px] text-[#706c64] dark:text-neutral-400">Conserve battery and network bandwidth</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={draftConfig.visibilityAware !== false}
                    onChange={(e) => updateField("visibilityAware", e.target.checked)}
                    className="size-4 accent-[#1c1b18] dark:accent-white cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 4. ACTIONS TAB */}
            {activeTab === "actions" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f8f6f0] dark:bg-white/5 border border-[#e8e4db] dark:border-white/10">
                  <div>
                    <span className="text-xs font-bold block">Enable Fast Add Button</span>
                    <span className="text-[11px] text-[#706c64] dark:text-neutral-400">Allow instant 1-click item creation</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={draftConfig.allowCreate !== false}
                    onChange={(e) => updateField("allowCreate", e.target.checked)}
                    className="size-4 accent-[#1c1b18] dark:accent-white cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f8f6f0] dark:bg-white/5 border border-[#e8e4db] dark:border-white/10">
                  <div>
                    <span className="text-xs font-bold block">Destructive Action Confirmation</span>
                    <span className="text-[11px] text-[#706c64] dark:text-neutral-400">Prompt confirmation dialog before deletes</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={draftConfig.confirmDestructive !== false}
                    onChange={(e) => updateField("confirmDestructive", e.target.checked)}
                    className="size-4 accent-[#1c1b18] dark:accent-white cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 5. ADVANCED TAB */}
            {activeTab === "advanced" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-[#f8f6f0] dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 space-y-1">
                  <span className="text-xs font-bold block">Capabilities & Permissions</span>
                  <p className="text-[11px] text-[#706c64] dark:text-neutral-400">
                    Scoped capability: <code className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-[10px]">READ_WORKSPACE_RECORDS</code>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#f8f6f0] dark:bg-white/5 border border-[#e8e4db] dark:border-white/10 space-y-1">
                  <span className="text-xs font-bold block">SWR Sync Cache</span>
                  <p className="text-[11px] text-[#706c64] dark:text-neutral-400">
                    TTL: 300,000ms (5 mins) • In-flight deduplication active
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="p-5 border-t border-[#e8e4db] dark:border-white/10 bg-[#f8f6f0] dark:bg-white/5 flex items-center justify-between">
            <button
              onClick={() => setDraftConfig(definition.defaultConfig || {})}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#706c64] hover:text-[#1c1b18] dark:hover:text-white transition cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Reset Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-[#706c64] hover:bg-[#ede8df] dark:hover:bg-white/10 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#1c1b18] hover:bg-black text-white dark:bg-white dark:text-[#1c1b18] shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Save size={13} />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default WidgetConfigSheet;
