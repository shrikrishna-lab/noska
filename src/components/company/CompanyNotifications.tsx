import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bell, Check, CheckCheck, Trash2, UserPlus, Users, FileText,
  AtSign, MessageSquare, Settings, Loader2, X
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  page_id: string | null
  comment_id: string | null
  from_user_id: string | null
  from_user_name: string | null
  read: boolean
  created_at: string
}

export function CompanyNotificationBell() {
  const { currentCompany, currentMember } = useCompany()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  // Fetch notifications
  useEffect(() => {
    if (!currentMember) return
    const fetchNotifications = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from("collab_notifications" as any)
          .select("*")
          .eq("user_id", currentMember.user_id)
          .order("created_at", { ascending: false })
          .limit(30)
        setNotifications((data as any) || [])
      } catch { setNotifications([]) }
      finally { setLoading(false) }
    }
    fetchNotifications()

    // Poll for new notifications every 30s
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [currentMember])

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const markAsRead = async (id: string) => {
    try {
      await supabase.from("collab_notifications" as any).update({ read: true }).eq("id", id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch {}
  }

  const markAllRead = async () => {
    if (!currentMember) return
    try {
      await supabase.from("collab_notifications" as any).update({ read: true }).eq("user_id", currentMember.user_id).eq("read", false)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch {}
  }

  const deleteNotification = async (id: string) => {
    try {
      await supabase.from("collab_notifications" as any).delete().eq("id", id)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch {}
  }

  const typeIcon: Record<string, React.FC<{ size: number; className?: string }>> = {
    comment: MessageSquare,
    mention: AtSign,
    reply: MessageSquare,
    invite: UserPlus,
    edit: FileText,
    permission: Settings,
    resolve: Check,
  }

  const typeColor: Record<string, string> = {
    comment: "text-blue-500 bg-blue-500/10",
    mention: "text-purple-500 bg-purple-500/10",
    reply: "text-blue-400 bg-blue-400/10",
    invite: "text-green-500 bg-green-500/10",
    edit: "text-orange-500 bg-orange-500/10",
    permission: "text-yellow-500 bg-yellow-500/10",
    resolve: "text-green-400 bg-green-400/10",
  }

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="relative w-8 h-8 rounded-xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition-all cursor-pointer"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[var(--accent)] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="absolute right-0 top-full mt-2 z-50 w-[360px] bg-[var(--surface)]/95 dark:bg-[#161a23]/95 backdrop-blur-2xl border border-[var(--border)]/80 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]/60">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--text)]">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] font-semibold text-[var(--accent)] hover:underline cursor-pointer px-2 py-1"
                  >
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="w-6 h-6 rounded-lg hover:bg-[var(--hover)] flex items-center justify-center text-[var(--muted)] cursor-pointer">
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading && notifications.length === 0 && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={16} className="animate-spin text-[var(--muted)]" />
                </div>
              )}

              {!loading && notifications.length === 0 && (
                <div className="py-12 text-center">
                  <Bell size={24} className="mx-auto mb-2 text-[var(--muted)]/50" />
                  <p className="text-xs text-[var(--muted)]">No notifications yet</p>
                </div>
              )}

              {notifications.map((notif) => {
                const Icon = typeIcon[notif.type] || Bell
                const colorClass = typeColor[notif.type] || "text-[var(--muted)] bg-[var(--surface-2)]"
                return (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-[var(--hover)] transition-colors group ${
                      !notif.read ? "bg-[var(--accent)]/5" : ""
                    }`}
                    onClick={() => !notif.read && markAsRead(notif.id)}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--text)] truncate">{notif.title}</span>
                        {!notif.read && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />}
                      </div>
                      {notif.body && (
                        <p className="text-[10px] text-[var(--muted)] mt-0.5 line-clamp-2">{notif.body}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {notif.from_user_name && (
                          <span className="text-[10px] text-[var(--muted)]">from {notif.from_user_name}</span>
                        )}
                        <span className="text-[9px] text-[var(--muted)]">{formatTime(notif.created_at)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id) }}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-[var(--muted)] hover:text-red-500 transition-all cursor-pointer shrink-0"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
