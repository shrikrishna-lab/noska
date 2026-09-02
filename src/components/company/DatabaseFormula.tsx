import React, { useMemo } from "react"
import { Calculator } from "lucide-react"

type FormulaType = "count" | "sum" | "avg" | "min" | "max" | "concat" | "if" | "countif"

interface FormulaField {
  key: string
  label: string
  type: "formula"
  formula: FormulaType
  sourceField: string
  condition?: string
}

interface DatabaseFormulaProps {
  fields: { key: string; label: string; type: string }[]
  formulaField: FormulaField
  data: Record<string, any>[]
}

export function DatabaseFormula({ fields, formulaField, data }: DatabaseFormulaProps) {
  const result = useMemo(() => {
    const values = data.map(row => row[formulaField.sourceField]).filter(v => v !== null && v !== undefined)

    switch (formulaField.formula) {
      case "count":
        return data.length
      case "sum":
        return values.reduce((sum, v) => sum + (Number(v) || 0), 0)
      case "avg":
        return values.length ? values.reduce((sum, v) => sum + (Number(v) || 0), 0) / values.length : 0
      case "min":
        return values.length ? Math.min(...values.map(Number).filter(n => !isNaN(n))) : 0
      case "max":
        return values.length ? Math.max(...values.map(Number).filter(n => !isNaN(n))) : 0
      case "countif":
        if (!formulaField.condition) return 0
        return data.filter(row => String(row[formulaField.sourceField]) === formulaField.condition).length
      default:
        return "—"
    }
  }, [data, formulaField])

  const formatResult = (val: number) => {
    if (typeof val !== "number") return String(val)
    if (formulaField.formula === "avg") return val.toFixed(1)
    if (formulaField.formula === "sum") return val.toLocaleString()
    return String(val)
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
      <Calculator size={10} className="text-[var(--muted)]" />
      <span className="text-[10px] text-[var(--muted)]">{formulaField.label}:</span>
      <span className="text-[11px] font-bold text-[var(--text)]">{formatResult(result as number)}</span>
    </div>
  )
}

export function FormulaEditor({ fields, value, onChange }: {
  fields: { key: string; label: string; type: string }[]
  value: FormulaField
  onChange: (v: FormulaField) => void
}) {
  return (
    <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] font-bold text-[var(--muted)] mb-1 block">Formula</label>
          <select
            value={value.formula}
            onChange={e => onChange({ ...value, formula: e.target.value as FormulaType })}
            className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[10px] text-[var(--text)] cursor-pointer"
          >
            <option value="count">Count</option>
            <option value="sum">Sum</option>
            <option value="avg">Average</option>
            <option value="min">Min</option>
            <option value="max">Max</option>
            <option value="countif">Count If</option>
          </select>
        </div>
        <div>
          <label className="text-[9px] font-bold text-[var(--muted)] mb-1 block">Source Field</label>
          <select
            value={value.sourceField}
            onChange={e => onChange({ ...value, sourceField: e.target.value })}
            className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[10px] text-[var(--text)] cursor-pointer"
          >
            {fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </div>
      </div>
      {value.formula === "countif" && (
        <div>
          <label className="text-[9px] font-bold text-[var(--muted)] mb-1 block">Condition</label>
          <input
            value={value.condition || ""}
            onChange={e => onChange({ ...value, condition: e.target.value })}
            placeholder="Equals value..."
            className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[10px] text-[var(--text)]"
          />
        </div>
      )}
    </div>
  )
}
