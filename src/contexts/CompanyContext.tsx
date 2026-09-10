import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import {
  getUserCompanies,
  getUserMemberships,
  getCompany,
  getCompanyMembers,
  getCompanyTeams,
  getCompanyInvitations,
  createCompany as createCompanyApi,
  type Company,
  type CompanyMember,
  type CompanyTeam,
  type CompanyInvitation,
} from "../lib/company"

const COMPANY_STORAGE_KEY = "noska_current_company_id"

// ─── Official Noska Learning Hub Seed ─────────────────────────────────────────

export const OFFICIAL_NOSKA_COMPANY: Company = {
  id: "noska-learning-hub-official",
  name: "Noska Learning Hub",
  slug: "noska-learning-hub",
  description: "Official enterprise academy, learning pathways, skills curriculum & knowledge library for Noska workspace",
  logo_url: "🎓",
  industry: "Education & Software",
  company_size: "50-200",
  timezone: "UTC",
  locale: "en-US",
  currency: "USD",
  branding_config: {},
  settings: {},
  status: "active",
  created_by: "noska-official-admin",
  created_at: new Date("2026-01-01").toISOString(),
  updated_at: new Date().toISOString()
}

export const OFFICIAL_NOSKA_TEAMS: CompanyTeam[] = [
  {
    id: "team-ai-engineering",
    organization_id: "noska-learning-hub-official",
    department_id: null,
    name: "AI & Prompt Systems",
    description: "Neural prompts, LLM workflow patterns & agentic automations",
    leader_id: null,
    icon: "✨",
    color: "#6366F1",
    settings: {},
    created_at: new Date("2026-01-01").toISOString(),
    updated_at: new Date().toISOString(),
    member_count: 6
  },
  {
    id: "team-design-systems",
    organization_id: "noska-learning-hub-official",
    department_id: null,
    name: "Design & Glassmorphism",
    description: "Apple-grade UI tokens, spring micro-interactions & layout design",
    leader_id: null,
    icon: "🎨",
    color: "#EC4899",
    settings: {},
    created_at: new Date("2026-01-01").toISOString(),
    updated_at: new Date().toISOString(),
    member_count: 5
  },
  {
    id: "team-architecture",
    organization_id: "noska-learning-hub-official",
    department_id: null,
    name: "Fullstack Architecture",
    description: "Realtime collaboration engines, Supabase schemas & cloud sync",
    leader_id: null,
    icon: "⚡",
    color: "#3B82F6",
    settings: {},
    created_at: new Date("2026-01-01").toISOString(),
    updated_at: new Date().toISOString(),
    member_count: 8
  },
  {
    id: "team-product-growth",
    organization_id: "noska-learning-hub-official",
    department_id: null,
    name: "Product & Growth",
    description: "Roadmaps, launch sequences, user onboarding & documentation",
    leader_id: null,
    icon: "🚀",
    color: "#10B981",
    settings: {},
    created_at: new Date("2026-01-01").toISOString(),
    updated_at: new Date().toISOString(),
    member_count: 4
  }
]

export const OFFICIAL_NOSKA_MEMBERS: CompanyMember[] = [
  {
    id: "member-noska-lead",
    organization_id: "noska-learning-hub-official",
    user_id: "user-noska-lead",
    employee_id: "NOSKA-001",
    employee_type: "full_time",
    job_title: "Head of Learning & Intelligence",
    status: "active",
    department_id: null,
    primary_team_id: "team-ai-engineering",
    manager_id: null,
    location: "San Francisco, CA",
    start_date: "2026-01-01",
    end_date: null,
    profile_visibility: "public",
    settings: {},
    role_name: "admin",
    user_name: "Noska Academy",
    email: "learning@noska.app",
    avatar_url: "🎓",
    created_at: new Date("2026-01-01").toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "member-alex-r",
    organization_id: "noska-learning-hub-official",
    user_id: "user-alex-r",
    employee_id: "NOSKA-002",
    employee_type: "full_time",
    job_title: "Lead AI Researcher",
    status: "active",
    department_id: null,
    primary_team_id: "team-ai-engineering",
    manager_id: "member-noska-lead",
    location: "New York, NY",
    start_date: "2026-01-02",
    end_date: null,
    profile_visibility: "public",
    settings: {},
    role_name: "member",
    user_name: "Alex Rivera",
    email: "alex@noska.app",
    avatar_url: "🧠",
    created_at: new Date("2026-01-02").toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "member-elena-v",
    organization_id: "noska-learning-hub-official",
    user_id: "user-elena-v",
    employee_id: "NOSKA-003",
    employee_type: "full_time",
    job_title: "Principal UI Architect",
    status: "active",
    department_id: null,
    primary_team_id: "team-design-systems",
    manager_id: "member-noska-lead",
    location: "Stockholm, Sweden",
    start_date: "2026-01-03",
    end_date: null,
    profile_visibility: "public",
    settings: {},
    role_name: "member",
    user_name: "Elena Vance",
    email: "elena@noska.app",
    avatar_url: "✨",
    created_at: new Date("2026-01-03").toISOString(),
    updated_at: new Date().toISOString()
  }
]

interface CompanyContextValue {
  companies: Company[]
  currentCompany: Company | null
  currentMember: CompanyMember | null
  companyMembers: CompanyMember[]
  companyTeams: CompanyTeam[]
  companyInvitations: CompanyInvitation[]
  loading: boolean
  switching: boolean
  switchCompany: (companyId: string | null) => void
  createCompany: (name: string, slug: string, description?: string) => Promise<string>
  resignFromCompany: (companyId?: string) => Promise<void>
  refreshCompanies: () => Promise<void>
  refreshCompany: () => Promise<void>
  refreshMembers: () => Promise<void>
  refreshTeams: () => Promise<void>
  refreshInvitations: () => Promise<void>
}

const CompanyContext = createContext<CompanyContextValue | null>(null)

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([OFFICIAL_NOSKA_COMPANY])
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null)
  const [currentMember, setCurrentMember] = useState<CompanyMember | null>(null)
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([])
  const [companyTeams, setCompanyTeams] = useState<CompanyTeam[]>([])
  const [companyInvitations, setCompanyInvitations] = useState<CompanyInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)

  const refreshCompanies = useCallback(async () => {
    try {
      const data = await getUserCompanies()
      const allCompanies = data.some((c) => c.id === OFFICIAL_NOSKA_COMPANY.id || c.slug === OFFICIAL_NOSKA_COMPANY.slug)
        ? data
        : [OFFICIAL_NOSKA_COMPANY, ...data]
      setCompanies(allCompanies)
    } catch (e) {
      console.warn("Failed to fetch companies:", e)
      setCompanies([OFFICIAL_NOSKA_COMPANY])
    }
  }, [])

  const refreshCompany = useCallback(async () => {
    const companyId = localStorage.getItem(COMPANY_STORAGE_KEY)

    if (!companyId) {
      setCurrentCompany(null)
      setCurrentMember(null)
      setCompanyMembers([])
      setCompanyTeams([])
      return
    }

    if (companyId === OFFICIAL_NOSKA_COMPANY.id) {
      setCurrentCompany(OFFICIAL_NOSKA_COMPANY)
      setCurrentMember(OFFICIAL_NOSKA_MEMBERS[0])
      setCompanyMembers(OFFICIAL_NOSKA_MEMBERS)
      setCompanyTeams(OFFICIAL_NOSKA_TEAMS)
      return
    }

    try {
      const [company, memberships] = await Promise.all([
        getCompany(companyId),
        getUserMemberships(),
      ])
      if (company) {
        setCurrentCompany(company)
        setCurrentMember(memberships.find((m) => m.organization_id === companyId) || null)
      } else {
        localStorage.removeItem(COMPANY_STORAGE_KEY)
        setCurrentCompany(null)
        setCurrentMember(null)
        setCompanyMembers([])
        setCompanyTeams([])
      }
    } catch (e) {
      console.warn("Failed to fetch company:", e)
      localStorage.removeItem(COMPANY_STORAGE_KEY)
      setCurrentCompany(null)
      setCurrentMember(null)
      setCompanyMembers([])
      setCompanyTeams([])
    }
  }, [])

  const refreshMembers = useCallback(async () => {
    if (!currentCompany) { setCompanyMembers([]); return }
    if (currentCompany.id === OFFICIAL_NOSKA_COMPANY.id) {
      setCompanyMembers(OFFICIAL_NOSKA_MEMBERS)
      return
    }
    try {
      const data = await getCompanyMembers(currentCompany.id)
      setCompanyMembers(data)
    } catch (e) {
      console.warn("Failed to fetch company members:", e)
      setCompanyMembers([])
    }
  }, [currentCompany])

  const refreshTeams = useCallback(async () => {
    if (!currentCompany) { setCompanyTeams([]); return }
    if (currentCompany.id === OFFICIAL_NOSKA_COMPANY.id) {
      setCompanyTeams(OFFICIAL_NOSKA_TEAMS)
      return
    }
    try {
      const data = await getCompanyTeams(currentCompany.id)
      setCompanyTeams(data)
    } catch (e) {
      console.warn("Failed to fetch company teams:", e)
      setCompanyTeams([])
    }
  }, [currentCompany])

  const refreshInvitations = useCallback(async () => {
    if (!currentCompany || currentCompany.id === OFFICIAL_NOSKA_COMPANY.id) {
      setCompanyInvitations([])
      return
    }
    try {
      const data = await getCompanyInvitations(currentCompany.id)
      setCompanyInvitations(data)
    } catch (e) {
      console.warn("Failed to fetch company invitations:", e)
      setCompanyInvitations([])
    }
  }, [currentCompany])

  const switchCompany = useCallback(async (companyId: string | null) => {
    setSwitching(true)
    try {
      if (companyId) {
        localStorage.setItem(COMPANY_STORAGE_KEY, companyId)
      } else {
        localStorage.removeItem(COMPANY_STORAGE_KEY)
      }
      await refreshCompany()
    } finally {
      setSwitching(false)
    }
  }, [refreshCompany])

  const resignFromCompany = useCallback(async (companyId?: string) => {
    setSwitching(true)
    try {
      localStorage.removeItem(COMPANY_STORAGE_KEY)
      setCurrentCompany(null)
      setCurrentMember(null)
      setCompanyMembers([])
      setCompanyTeams([])
      await refreshCompanies()
    } finally {
      setSwitching(false)
    }
  }, [refreshCompanies])

  const createCompany = useCallback(async (
    name: string,
    slug: string,
    description?: string
  ): Promise<string> => {
    const companyId = await createCompanyApi(name, slug, description)
    localStorage.setItem(COMPANY_STORAGE_KEY, companyId)
    await refreshCompanies()
    await refreshCompany()
    return companyId
  }, [refreshCompanies, refreshCompany])

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await refreshCompanies()
      await refreshCompany()
      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh sub-data when company changes
  useEffect(() => {
    if (currentCompany) {
      refreshMembers()
      refreshTeams()
      refreshInvitations()
    }
  }, [currentCompany, refreshMembers, refreshTeams, refreshInvitations])

  return (
    <CompanyContext.Provider
      value={{
        companies,
        currentCompany,
        currentMember,
        companyMembers,
        companyTeams,
        companyInvitations,
        loading,
        switching,
        switchCompany,
        createCompany,
        resignFromCompany,
        refreshCompanies,
        refreshCompany,
        refreshMembers,
        refreshTeams,
        refreshInvitations,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany(): CompanyContextValue {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider")
  return ctx
}
