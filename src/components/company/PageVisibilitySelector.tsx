import React from "react"
import { Lock, Users, Building2, Globe } from "lucide-react"
import { useCompany } from "../../contexts/CompanyContext"
import {
  VISIBILITY_OPTIONS,
  type PageVisibility,
} from "../../lib/companyAuth"
import { OptionPicker, type Option } from "../ui/quick-option-picker"

interface PageVisibilitySelectorProps {
  value: PageVisibility
  onChange: (visibility: PageVisibility) => void
  companyId?: string | null
  disabled?: boolean
}

const ICONS: Record<PageVisibility, React.FC<{ size?: number; className?: string }>> = {
  private: Lock,
  team: Users,
  company: Building2,
  public: Globe,
}

export function PageVisibilitySelector({ value, onChange, companyId, disabled }: PageVisibilitySelectorProps) {
  const { currentCompany } = useCompany()

  const options: Option[] = VISIBILITY_OPTIONS.filter((opt) => {
    if (opt.value === "team" && !companyId && !currentCompany) return false
    if (opt.value === "company" && !companyId && !currentCompany) return false
    return true
  }).map((opt) => ({
    id: opt.value,
    label: opt.label,
    icon: ICONS[opt.value] || Lock,
  }))

  return (
    <OptionPicker
      options={options}
      value={value}
      onChange={(id) => onChange(id as PageVisibility)}
      disabled={disabled}
      size="xs"
      dropdownPlacement="bottom"
    />
  )
}
