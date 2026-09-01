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
  refreshCompanies: () => Promise<void>
  refreshCompany: () => Promise<void>
  refreshMembers: () => Promise<void>
  refreshTeams: () => Promise<void>
  refreshInvitations: () => Promise<void>
}

const CompanyContext = createContext<CompanyContextValue | null>(null)

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([])
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
      setCompanies(data)

      // Auto-select if only one company
      const savedId = localStorage.getItem(COMPANY_STORAGE_KEY)
      if (savedId && data.some((c) => c.id === savedId)) {
        // Saved company is valid
      } else if (data.length === 1) {
        localStorage.setItem(COMPANY_STORAGE_KEY, data[0].id)
      } else if (!data.some((c) => c.id === savedId)) {
        localStorage.removeItem(COMPANY_STORAGE_KEY)
      }
    } catch (e) {
      console.warn("Failed to fetch companies:", e)
    }
  }, [])

  const refreshCompany = useCallback(async () => {
    const companyId = localStorage.getItem(COMPANY_STORAGE_KEY)
    if (!companyId) {
      setCurrentCompany(null)
      setCurrentMember(null)
      return
    }

    try {
      const [company, memberships] = await Promise.all([
        getCompany(companyId),
        getUserMemberships(),
      ])
      setCurrentCompany(company)
      setCurrentMember(memberships.find((m) => m.organization_id === companyId) || null)
    } catch (e) {
      console.warn("Failed to fetch company:", e)
      setCurrentCompany(null)
      setCurrentMember(null)
    }
  }, [])

  const refreshMembers = useCallback(async () => {
    if (!currentCompany) { setCompanyMembers([]); return }
    try {
      const data = await getCompanyMembers(currentCompany.id)
      setCompanyMembers(data)
    } catch (e) {
      console.warn("Failed to fetch company members:", e)
    }
  }, [currentCompany])

  const refreshTeams = useCallback(async () => {
    if (!currentCompany) { setCompanyTeams([]); return }
    try {
      const data = await getCompanyTeams(currentCompany.id)
      setCompanyTeams(data)
    } catch (e) {
      console.warn("Failed to fetch company teams:", e)
    }
  }, [currentCompany])

  const refreshInvitations = useCallback(async () => {
    if (!currentCompany) { setCompanyInvitations([]); return }
    try {
      const data = await getCompanyInvitations(currentCompany.id)
      setCompanyInvitations(data)
    } catch (e) {
      console.warn("Failed to fetch company invitations:", e)
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
