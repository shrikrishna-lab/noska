import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { supabase } from "./supabase"
import {
  fetchTeams,
  fetchTeamMembers,
  fetchPendingInvites,
  createTeam,
  updateTeam,
  deleteTeam,
  inviteMember,
  acceptInvite,
  declineInvite,
  removeMember as removeMemberApi,
} from "./teams"
import type { Team, TeamMember, TeamInvite } from "./teams"

interface TeamContextValue {
  teams: Team[]
  currentTeam: Team | null
  members: TeamMember[]
  pendingInvites: TeamInvite[]
  loading: boolean
  setCurrentTeam: (team: Team | null) => void
  createTeam: (name: string, description?: string, icon?: string) => Promise<Team>
  updateTeam: (teamId: string, patch: Partial<Team>) => Promise<Team>
  deleteTeam: (teamId: string) => Promise<void>
  inviteMember: (teamId: string, email: string, role?: "admin" | "member") => Promise<void>
  acceptInvite: (inviteId: string) => Promise<void>
  declineInvite: (inviteId: string) => Promise<void>
  removeMember: (teamId: string, userId: string) => Promise<void>
  refreshTeams: () => Promise<void>
  refreshMembers: () => Promise<void>
  refreshInvites: () => Promise<void>
}

const TeamContext = createContext<TeamContextValue | null>(null)

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([])
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [pendingInvites, setPendingInvites] = useState<TeamInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const id = localStorage.getItem("noska_user_id")
    if (id) setUserId(id)
    const onStorage = () => {
      setUserId(localStorage.getItem("noska_user_id"))
    }
    window.addEventListener("storage", onStorage)
    const check = setInterval(() => {
      const uid = localStorage.getItem("noska_user_id")
      if (uid !== userId) setUserId(uid)
    }, 2000)
    return () => {
      window.removeEventListener("storage", onStorage)
      clearInterval(check)
    }
  }, [])

  const refreshTeams = useCallback(async () => {
    try {
      const data = await fetchTeams()
      setTeams(data)
      setCurrentTeam((prev) => {
        if (!prev) return null
        const updated = data.find((t) => t.id === prev.id)
        return updated ?? null
      })
    } catch (e) {
      console.warn("Failed to fetch teams:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshMembers = useCallback(async () => {
    if (!currentTeam) { setMembers([]); return }
    try {
      const data = await fetchTeamMembers(currentTeam.id)
      setMembers(data)
    } catch (e) {
      console.warn("Failed to fetch members:", e)
    }
  }, [currentTeam])

  const refreshInvites = useCallback(async () => {
    try {
      const data = await fetchPendingInvites()
      setPendingInvites(data)
    } catch (e) {
      console.warn("Failed to fetch invites:", e)
    }
  }, [])

  useEffect(() => {
    if (userId) {
      refreshTeams()
      refreshInvites()
    } else {
      setTeams([])
      setCurrentTeam(null)
      setMembers([])
      setPendingInvites([])
      setLoading(false)
    }
  }, [userId, refreshTeams, refreshInvites])

  useEffect(() => {
    refreshMembers()
  }, [currentTeam, refreshMembers])

  const handleCreateTeam = useCallback(async (name: string, description?: string, icon?: string) => {
    const team = await createTeam(name, description, icon)
    setTeams((prev) => [...prev, team])
    setCurrentTeam(team)
    return team
  }, [])

  const handleUpdateTeam = useCallback(async (teamId: string, patch: Partial<Team>) => {
    const team = await updateTeam(teamId, patch)
    setTeams((prev) => prev.map((t) => (t.id === team.id ? team : t)))
    setCurrentTeam((prev) => (prev?.id === team.id ? team : prev))
    return team
  }, [])

  const handleDeleteTeam = useCallback(async (teamId: string) => {
    await deleteTeam(teamId)
    setTeams((prev) => prev.filter((t) => t.id !== teamId))
    setCurrentTeam((prev) => (prev?.id === teamId ? null : prev))
  }, [])

  const handleInviteMember = useCallback(async (teamId: string, email: string, role?: "admin" | "member") => {
    await inviteMember(teamId, email, role)
  }, [])

  const handleAcceptInvite = useCallback(async (inviteId: string) => {
    await acceptInvite(inviteId)
    setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId))
    await refreshTeams()
  }, [refreshTeams])

  const handleDeclineInvite = useCallback(async (inviteId: string) => {
    await declineInvite(inviteId)
    setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId))
  }, [])

  const handleRemoveMember = useCallback(async (teamId: string, userId: string) => {
    await removeMemberApi(teamId, userId)
    setMembers((prev) => prev.filter((m) => m.user_id !== userId))
  }, [])

  useEffect(() => {
    if (!currentTeam) return

    const channel = supabase
      .channel(`team:${currentTeam.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "team_members", filter: `team_id=eq.${currentTeam.id}` },
        () => { refreshMembers() }
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "team_invites", filter: `team_id=eq.${currentTeam.id}` },
        () => { refreshInvites() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentTeam, refreshMembers, refreshInvites])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel("team_invites_global")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "team_invites" },
        () => { refreshInvites() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, refreshInvites])

  return (
    <TeamContext.Provider value={{
      teams,
      currentTeam,
      members,
      pendingInvites,
      loading,
      setCurrentTeam,
      createTeam: handleCreateTeam,
      updateTeam: handleUpdateTeam,
      deleteTeam: handleDeleteTeam,
      inviteMember: handleInviteMember,
      acceptInvite: handleAcceptInvite,
      declineInvite: handleDeclineInvite,
      removeMember: handleRemoveMember,
      refreshTeams,
      refreshMembers,
      refreshInvites,
    }}>
      {children}
    </TeamContext.Provider>
  )
}

export function useTeams() {
  const ctx = useContext(TeamContext)
  if (!ctx) throw new Error("useTeams must be used within a TeamProvider")
  return ctx
}
