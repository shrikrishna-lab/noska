/**
 * WidgetConfigSheet — per-widget user preferences rendered from the
 * widget's declared configSchema. Only product-meaningful options are
 * exposed (no technical settings).
 */
import React, { useState } from "react";
import { Settings2 } from "lucide-react";
import { Modal, ModalHeader } from "../../../components/ui";
import type { WidgetConfigField, WidgetDefinition } from "../types";

export function WidgetConfigSheet({
  definition,
  initialConfig,
  onSave,
  onClose,
}: {
  definition: WidgetDefinition;
  initialConfig: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>({ ...definition.defaultConfig, ...initialConfig });
  const schema: WidgetConfigField[] = definition.configSchema ?? [];

  const set = (key: string, value: unknown) => setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <Modal onClose={onClose}>
      <div className="w-[400px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl">
        <ModalHeader icon={Settings2} title={`${definition.name} settings`} onClose={onClose} />
        <div className="space-y-3 px-5 pb-4">
          <p className="text-[11px] leading-4 text-[var(--muted)]">{definition.description}</p>
          {schema.length === 0 && (
            <p className="py-4 text-center text-xs text-[var(--muted)]">This widget has no settings yet.</p>
          )}
          {schema.map((field) => (
            <div key={field.key} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--text)]">{field.label}</p>
                {field.description && <p className="text-[10px] text-[var(--muted)]">{field.description}</p>}
              </div>
              {field.type === "toggle" ? (
                <button
                  role="switch"
                  aria-checked={Boolean(draft[field.key])}
                  onClick={() => set(field.key, !draft[field.key])}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer ${
                    draft[field.key] ? "bg-blue-600" : "bg-[var(--border)]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                      draft[field.key] ? "left-[18px]" : "left-0.5"
                    }`}
                  />
                </button>
              ) : (
                <select
                  value={String(draft[field.key] ?? field.options?.[0]?.value ?? "")}
                  onChange={(e) => set(field.key, e.target.value)}
                  className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-[11px] text-[var(--text)] outline-none cursor-pointer"
                >
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
