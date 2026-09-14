/**
 * Noska Widget Platform — Reusable List & Table Primitive.
 * Renders interactive task lists, document recents, issue trackers, and pull requests.
 */
import React from "react";
import { Check, Clock, ChevronRight, ExternalLink } from "lucide-react";
import type { WidgetSize } from "../types";

export interface ListItemData {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string | React.ComponentType<{ size?: number; className?: string }>;
  status?: {
    label: string;
    color?: string;
  };
  isChecked?: boolean;
  dueDate?: string;
  url?: string;
  badge?: string;
}

export interface ListPrimitiveProps {
  title?: string;
  items: ListItemData[];
  emptyMessage?: string;
  size?: WidgetSize;
  onItemClick?: (item: ListItemData) => void;
  onToggleCheck?: (itemId: string, current: boolean) => void;
  maxItems?: number;
  viewAllUrl?: string;
}

export function ListPrimitive({
  title,
  items = [],
  emptyMessage = "No items found",
  size = "medium",
  onItemClick,
  onToggleCheck,
  maxItems,
}: ListPrimitiveProps) {
  const limit = maxItems || (size === "small" ? 3 : size === "medium" ? 5 : 8);
  const displayItems = items.slice(0, limit);

  return (
    <div className="flex h-full w-full flex-col justify-between p-3 select-none font-sans">
      {title && (
        <div className="flex items-center justify-between pb-1 mb-1 border-b border-black/[0.04] dark:border-white/[0.06]">
          <h4 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 truncate">{title}</h4>
          <span className="text-[10px] font-bold text-neutral-400 font-mono">{items.length}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-1 my-auto scrollbar-none">
        {displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-center text-neutral-400">
            <span className="text-xs">{emptyMessage}</span>
          </div>
        ) : (
          displayItems.map((item) => {
            const IconComp = typeof item.icon === "function" ? item.icon : null;

            return (
              <div
                key={item.id}
                onClick={() => onItemClick?.(item)}
                className={`group flex items-center justify-between gap-2 p-1.5 rounded-xl transition cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 ${
                  item.isChecked ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {onToggleCheck !== undefined ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCheck(item.id, Boolean(item.isChecked));
                      }}
                      className={`size-4 rounded-md border flex items-center justify-center transition cursor-pointer shrink-0 ${
                        item.isChecked
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-neutral-300 dark:border-neutral-600 hover:border-neutral-400"
                      }`}
                    >
                      {item.isChecked && <Check size={11} strokeWidth={3} />}
                    </button>
                  ) : IconComp ? (
                    <IconComp size={14} className="text-neutral-500 shrink-0" />
                  ) : item.icon && typeof item.icon === "string" ? (
                    <span className="text-xs shrink-0">{item.icon}</span>
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate ${item.isChecked ? "line-through text-neutral-400" : ""}`}>
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="text-[10px] text-neutral-400 truncate">{item.subtitle}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.status && (
                    <span
                      className="px-1.5 py-0.5 rounded-md text-[9.5px] font-bold"
                      style={{
                        backgroundColor: item.status.color ? `${item.status.color}20` : "rgba(0,0,0,0.05)",
                        color: item.status.color || "#706c64",
                      }}
                    >
                      {item.status.label}
                    </span>
                  )}
                  {item.badge && (
                    <span className="text-[10px] font-medium text-neutral-400">
                      {item.badge}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ListPrimitive;
