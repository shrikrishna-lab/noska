import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus, X, GripVertical, Type, Hash, Calendar, CheckSquare,
  Link as LinkIcon, Trash2, Edit2, Loader2
} from "lucide-react"
import { supabase } from "../../lib/supabase"

interface CustomFieldData {
  id: string
  key: string
  label: string
  type: "text" | "number" | "select" | "date" | "checkbox" | "url"
  value: any
  options?: string[]
}

interface CustomFieldsProps {
  entityType: "page" | "project"
  entityId: string
  fields: CustomFieldData[]
  onUpdate?: (fields: CustomFieldData[]) => void
}

const FIELD_TYPES = [
  { type: "text", label: "Text", icon: Type },
  { type: "number", label: "Number", icon: Hash },
  { type: "select", label: "Select", icon: Hash },
  { type: "date", label: "Date", icon: Calendar },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare },
  { type: "url", label: "URL", icon: LinkIcon },
] as const

export function CustomFields({ entityType, entityId, fields, onUpdate }: CustomFieldsProps) {
  const [editing, setEditing] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [newType, setNewType] = useState<CustomFieldData["type"]>("text")
  const [saving, setSaving] = useState(false)

  const handleValueChange = async (fieldId: string, value: any) => {
    const updated = fields.map(f => f.id === fieldId ? { ...f, value } : f)
    onUpdate?.(updated)

    try {
      await supabase
        .from("custom_fields" as any)
        .update({ value } as any)
        .eq("id", fieldId)
    } catch {}
  }

  const handleAddField = async () => {
    if (!newLabel.trim()) return
    setSaving(true)
    try {
      const { data } = await supabase
        .from("custom_fields" as any)
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          field_key: newLabel.toLowerCase().replace(/\s+/g, "_"),
          field_label: newLabel.trim(),
          field_type: newType,
          value: newType === "checkbox" ? false : null,
        } as any)
        .select()
        .single()

      if (data) {
        const newField: CustomFieldData = {
          id: (data as any).id,
          key: (data as any).field_key,
          label: (data as any).field_label,
          type: (data as any).field_type,
          value: (data as any).value,
        }
        onUpdate?.([...fields, newField])
      }

      setNewLabel("")
      setShowAdd(false)
    } catch {}
    finally { setSaving(false) }
  }

  const handleDeleteField = async (fieldId: string) => {
    try {
      await supabase.from("custom_fields" as any).delete().eq("id", fieldId)
      onUpdate?.(fields.filter(f => f.id !== fieldId))
    } catch {}
  }

  const renderFieldInput = (field: CustomFieldData) => {
    switch (field.type) {
      case "text":
        return (
          <input
            value={field.value || ""}
            onChange={e => handleValueChange(field.id, e.target.value)}
            className="flex-1 px-2 py-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
          />
        )
      case "number":
        return (
          <input
            type="number"
            value={field.value || ""}
            onChange={e => handleValueChange(field.id, parseFloat(e.target.value) || null)}
            className="flex-1 px-2 py-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
          />
        )
      case "date":
        return (
          <input
            type="date"
            value={field.value || ""}
            onChange={e => handleValueChange(field.id, e.target.value)}
            className="flex-1 px-2 py-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
          />
        )
      case "checkbox":
        return (
          <button
            onClick={() => handleValueChange(field.id, !field.value)}
            className={`w-5 h-5 rounded border flex items-center justify-center transition cursor-pointer ${
              field.value ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "bg-[var(--surface-2)] border-[var(--border)]"
            }`}
          >
            {field.value && <CheckSquare size={12} />}
          </button>
        )
      case "url":
        return (
          <input
            type="url"
            value={field.value || ""}
            onChange={e => handleValueChange(field.id, e.target.value)}
            placeholder="https://..."
            className="flex-1 px-2 py-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
          />
        )
      case "select":
        return (
          <select
            value={field.value || ""}
            onChange={e => handleValueChange(field.id, e.target.value)}
            className="flex-1 px-2 py-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)] cursor-pointer"
          >
            <option value="">Select...</option>
            {(field.options || []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Custom Fields</h4>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-[10px] text-[var(--accent)] hover:underline cursor-pointer"
        >
          <Plus size={10} /> Add field
        </button>
      </div>

      {/* Existing fields */}
      <div className="space-y-1.5">
        {fields.map(field => (
          <div key={field.id} className="group flex items-center gap-2 py-1">
            <span className="text-[11px] text-[var(--muted)] w-24 truncate">{field.label}</span>
            {renderFieldInput(field)}
            <button
              onClick={() => handleDeleteField(field.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition cursor-pointer"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>

      {/* Add new field */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
              <input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Field name..."
                className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
              />
              <div className="flex flex-wrap gap-1">
                {FIELD_TYPES.map(ft => (
                  <button
                    key={ft.type}
                    onClick={() => setNewType(ft.type)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold transition cursor-pointer ${
                      newType === ft.type ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-3)]"
                    }`}
                  >
                    <ft.icon size={9} /> {ft.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddField}
                  disabled={!newLabel.trim() || saving}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-[10px] font-semibold hover:bg-[var(--accent-deep)] transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                  Add
                </button>
                <button
                  onClick={() => { setShowAdd(false); setNewLabel("") }}
                  className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--muted)] text-[10px] font-semibold hover:bg-[var(--surface-3)] transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
