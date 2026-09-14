/**
 * WidgetEditorBlock — Allows embedding any Noska platform widget directly inside a page document.
 * Provides size switcher, widget selector, and live interactive rendering.
 */
import React, { useState } from "react";
import { LayoutGrid, Trash2, Settings2, ChevronDown, Sparkles } from "lucide-react";
import { getWidgetDefinition, getAllWidgetDefinitions } from "../../platform/widgets/registry";
import { WidgetFrame } from "../../platform/widgets/components/WidgetFrame";
import type { WidgetInstance, WidgetRuntimeContext, WidgetSize } from "../../platform/widgets/types";

interface WidgetEditorBlockProps {
  block: {
    id: string;
    type: string;
    text?: string;
    properties?: {
      widgetId?: string;
      size?: WidgetSize;
      config?: Record<string, unknown>;
    };
  };
  onPatch: (patch: Record<string, unknown>) => void;
  onDelete?: () => void;
  pages?: any[];
  onNavigate?: (pageId: string) => void;
  onToast?: (message: string) => void;
}

export function WidgetEditorBlock({
  block,
  onPatch,
  onDelete,
  pages = [],
  onNavigate,
  onToast,
}: WidgetEditorBlockProps) {
  const widgetId = block.properties?.widgetId || block.text || "my-tasks";
  const size: WidgetSize = block.properties?.size || "medium";
  const config = block.properties?.config || {};
  const [pickerOpen, setPickerOpen] = useState(false);

  const definition = getWidgetDefinition(widgetId) || getWidgetDefinition("my-tasks");
  const allDefinitions = getAllWidgetDefinitions();

  const ctx: WidgetRuntimeContext = {
    pages,
    sharedPages: [],
    pendingInvites: [],
    actions: {
      onSelect: (pId) => onNavigate?.(pId),
      onNew: (template) => onToast?.(`Creating ${template}`),
      onAI: () => onToast?.("AI Assistant Triggered"),
      onToast: (msg) => onToast?.(msg),
    },
  };

  const instance: WidgetInstance = {
    id: block.id,
    widgetId: definition?.id || "my-tasks",
    size,
    config,
  };

  if (!definition) return null;

  return (
    <div className="my-3 group/widgetblock relative max-w-full font-sans">
      {/* Block controls bar on hover */}
      <div className="flex items-center justify-between pb-1 text-[11px] font-semibold text-neutral-400 opacity-0 group-hover/widgetblock:opacity-100 transition">
        <div className="flex items-center gap-1.5 relative">
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] text-neutral-700 dark:text-neutral-300 cursor-pointer"
          >
            <LayoutGrid size={11} />
            <span>{definition.name}</span>
            <ChevronDown size={10} />
          </button>

          {pickerOpen && (
            <div className="absolute left-0 top-6 z-50 w-56 max-h-64 overflow-y-auto rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#181b24] p-1.5 shadow-xl scrollbar-thin">
              {allDefinitions.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    onPatch({ text: d.id, properties: { ...block.properties, widgetId: d.id } });
                    setPickerOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer ${
                    d.id === widgetId ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-neutral-800 dark:text-neutral-200"
                  }`}
                >
                  <span className="truncate">{d.name}</span>
                  <span className="text-[9px] text-neutral-400 uppercase">{d.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {onDelete && (
          <button
            onClick={onDelete}
            className="p-1 rounded text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Render the actual widget inside standard chrome */}
      <div className="w-full max-w-2xl">
        <WidgetFrame
          definition={definition}
          instance={instance}
          ctx={ctx}
          onRemove={onDelete || (() => {})}
          onResize={(newSize) => onPatch({ properties: { ...block.properties, size: newSize } })}
          onConfigure={(newCfg) => onPatch({ properties: { ...block.properties, config: newCfg } })}
        />
      </div>
    </div>
  );
}

export default WidgetEditorBlock;
