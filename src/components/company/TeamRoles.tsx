import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, Plus, Loader2, Trash2, ChevronDown, Crown, User, Eye, Edit2 } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"

interface TeamRole {
  id: string
  name: string
  permissions: string[]
  member_count: number
}

const DEFAULT_PERMISSIONS = [
  { id: "view", label: "View pages", icon: Eye },
  { id: "edit", label: "Edit pages", icon: Edit2 },
  { id: "create", label: "Create pages", icon: Plus },
  { id: "delete", label: "Delete pages", icon: Trash2 },
  { id: "manage_members", label: "Manage members", icon: User },
  { id: "manage_settings", label: "Manage settings", icon: Shield },
]

interface TeamRolesProps {
  teamId: string
}

export function TeamRoles({ teamId }: TeamRolesProps) {
  const [roles, setRoles] = useState<TeamRole[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newPerms, setNewPerms] = useState<string[]>(["view"])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data: roleData } = await (supabase as any)
          .from("team_roles")
          .select("*")
          .eq("team_id", teamId)

        if (roleData) {
          const enriched = await Promise.all(roleData.map(async (r: any) => {
            const { count } = await (supabase as any)
              .from("team_members")
              .select("*", { count: "exact", head: true })
              .eq("role_id", r.id)
            return { ...r, member_count: count || 0 }
          }))
          setRoles(enriched)
        }
      } catch { setRoles([]) }
      finally { setLoading(false) }
    }
    fetchRoles()
  }, [teamId])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const { data } = await (supabase as any)
        .from("team_roles")
        .insert({ team_id: teamId, name: newName.trim(), permissions: newPerms })
        .select()
        .single()
      if (data) setRoles(prev => [...prev, { ...data, member_count: 0 }])
      setNewName(""); setNewPerms(["view"]); setShowCreate(false)
    } catch {}
    finally { setCreating(false) }
  }

  const handleDelete = async (roleId: string) => {
    try {
      await (supabase as any).from("team_roles").delete().eq("id", roleId)
      setRoles(prev => prev.filter(r => r.id !== roleId))
    } catch {}
  }

  const togglePerm = (perm: string) => {
    setNewPerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm])
  }

  if (loading) return <div className="flex items-center justify-center py-6"><Loader2 size={14} className="animate-spin text-[var(--muted)]" /></div>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-bold text-[var(--text)]">Team Roles</h4>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 text-[10px] text-[var(--accent)] cursor-pointer">
          <Plus size={10} /> Create role
        </button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Role name..." className="w-full px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)]" autoFocus />
              <div className="flex flex-wrap gap-1">
                {DEFAULT_PERMISSIONS.map(p => (
                  <button key={p.id} onClick={() => togglePerm(p.id)} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold transition cursor-pointer ${newPerms.includes(p.id) ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]"}`}>
                    <p.icon size={9} /> {p.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreate} disabled={creating || !newName.trim()} className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-[10px] font-semibold disabled:opacity-50 cursor-pointer">
                  {creating ? <Loader2 size={10} className="animate-spin" /> : "Create"}
                </button>
                <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--muted)] text-[10px] font-semibold cursor-pointer">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-1.5">
        {roles.map(role => (
          <div key={role.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] group">
            <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] flex items-center justify-center">
              <Shield size={14} className="text-[var(--muted)]" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-[var(--text)]">{role.name}</p>
              <p className="text-[9px] text-[var(--muted)]">{role.permissions?.length || 0} permissions · {role.member_count} members</p>
            </div>
            <div className="flex flex-wrap gap-0.5">
              {(role.permissions || []).slice(0, 3).map(p => (
                <span key={p} className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[8px] text-[var(--muted)]">{p}</span>
              ))}
              {(role.permissions || []).length > 3 && (
                <span className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[8px] text-[var(--muted)]">+{(role.permissions || []).length - 3}</span>
              )}
            </div>
            <button onClick={() => handleDelete(role.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition cursor-pointer">
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
