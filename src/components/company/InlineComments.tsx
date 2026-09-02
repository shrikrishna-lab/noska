import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MessageCircle, Send, Loader2, Trash2, Check, MoreHorizontal,
  Reply, Edit2, X
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"
import { writeAuditLog } from "../../lib/company"

interface Comment {
  id: string
  page_id: string
  user_id: string
  content: string
  parent_comment_id: string | null
  created_at: string
  updated_at: string
  user_name?: string
  user_avatar?: string
}

interface InlineCommentsProps {
  pageId: string
}

export function InlineComments({ pageId }: InlineCommentsProps) {
  const { currentCompany, currentMember } = useCompany()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const fetchComments = async () => {
    try {
      const { data } = await supabase
        .from("page_comments" as any)
        .select("*")
        .eq("page_id", pageId)
        .order("created_at", { ascending: true })

      if (data) {
        // Fetch user profiles
        const userIds = [...new Set(data.map((c: any) => c.user_id))]
        const { data: profiles } = userIds.length > 0
          ? await supabase.from("user_profiles").select("user_id, user_name, avatar_url").in("user_id", userIds)
          : { data: [] }

        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]))
        const enriched = data.map((c: any) => ({
          ...c,
          user_name: profileMap.get(c.user_id)?.user_name || "Unknown",
          user_avatar: profileMap.get(c.user_id)?.avatar_url,
        }))
        setComments(enriched)
      }
    } catch { setComments([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchComments() }, [pageId])

  const handleSend = async () => {
    if (!newComment.trim() || !currentMember) return
    setSending(true)
    try {
      await supabase.from("page_comments" as any).insert({
        page_id: pageId,
        user_id: currentMember.user_id,
        content: newComment.trim(),
        parent_comment_id: replyTo,
      } as any)
      setNewComment("")
      setReplyTo(null)
      await fetchComments()
    } catch {}
    finally { setSending(false) }
  }

  const handleEdit = async (id: string) => {
    if (!editContent.trim()) return
    try {
      await supabase
        .from("page_comments" as any)
        .update({ content: editContent.trim(), updated_at: new Date().toISOString() } as any)
        .eq("id", id)
      setEditingId(null)
      await fetchComments()
    } catch {}
  }

  const handleDelete = async (id: string) => {
    try {
      await supabase.from("page_comments" as any).delete().eq("id", id)
      setMenuId(null)
      await fetchComments()
    } catch {}
  }

  const formatTime = (date: string) => {
    const now = new Date()
    const d = new Date(date)
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(diff / 3600000)
    if (hours < 24) return `${hours}h ago`
    return d.toLocaleDateString()
  }

  const rootComments = comments.filter(c => !c.parent_comment_id)
  const getReplies = (parentId: string) => comments.filter(c => c.parent_comment_id === parentId)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageCircle size={14} className="text-[var(--muted)]" />
        <span className="text-[12px] font-bold text-[var(--text)]">
          Comments ({comments.length})
        </span>
      </div>

      {/* Comment input */}
      <div className="flex gap-2">
        <div className="w-7 h-7 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[9px] font-bold text-[var(--text)] shrink-0 overflow-hidden">
          {currentMember?.user_profiles?.avatar_url ? (
            <img src={currentMember.user_profiles.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            (currentMember?.user_profiles?.user_name || "U").slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <textarea
            ref={inputRef}
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
            rows={2}
            className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[12px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 resize-none"
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend() }}
          />
          {(replyTo || newComment.trim()) && (
            <div className="flex items-center gap-2 mt-1.5">
              {replyTo && (
                <button
                  onClick={() => setReplyTo(null)}
                  className="text-[10px] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                >
                  Cancel reply
                </button>
              )}
              <button
                onClick={handleSend}
                disabled={sending || !newComment.trim()}
                className="ml-auto flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--accent)] text-white text-[10px] font-semibold hover:bg-[var(--accent-deep)] transition disabled:opacity-50 cursor-pointer"
              >
                {sending ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                Send
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={14} className="animate-spin text-[var(--muted)]" />
        </div>
      ) : rootComments.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-[11px] text-[var(--muted)]">No comments yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rootComments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={getReplies(comment.id)}
              currentUserId={currentMember?.user_id}
              editingId={editingId}
              editContent={editContent}
              setEditContent={setEditContent}
              menuId={menuId}
              setMenuId={setMenuId}
              setEditingId={setEditingId}
              setReplyTo={setReplyTo}
              onEdit={handleEdit}
              onDelete={handleDelete}
              formatTime={formatTime}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CommentItem({ comment, replies, currentUserId, editingId, editContent, setEditContent, menuId, setMenuId, setEditingId, setReplyTo, onEdit, onDelete, formatTime }: {
  comment: Comment
  replies: Comment[]
  currentUserId?: string
  editingId: string | null
  editContent: string
  setEditContent: (v: string) => void
  menuId: string | null
  setMenuId: (id: string | null) => void
  setEditingId: (id: string | null) => void
  setReplyTo: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  formatTime: (d: string) => string
}) {
  const isOwner = comment.user_id === currentUserId

  return (
    <div className="group">
      <div className="flex gap-2">
        <div className="w-7 h-7 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[9px] font-bold text-[var(--text)] shrink-0 overflow-hidden">
          {comment.user_avatar ? (
            <img src={comment.user_avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            (comment.user_name || "U").slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[var(--text)]">{comment.user_name}</span>
            <span className="text-[10px] text-[var(--muted)]">{formatTime(comment.created_at)}</span>
            {comment.updated_at !== comment.created_at && (
              <span className="text-[9px] text-[var(--muted)]">(edited)</span>
            )}
          </div>

          {editingId === comment.id ? (
            <div className="mt-1">
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={2}
                className="w-full px-2 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 resize-none"
              />
              <div className="flex gap-1 mt-1">
                <button onClick={() => onEdit(comment.id)} className="px-2 py-0.5 rounded bg-[var(--accent)] text-white text-[9px] font-semibold cursor-pointer">Save</button>
                <button onClick={() => setEditingId(null)} className="px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--muted)] text-[9px] font-semibold cursor-pointer">Cancel</button>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-[var(--text)] mt-0.5 whitespace-pre-wrap">{comment.content}</p>
          )}

          {/* Actions */}
          {editingId !== comment.id && (
            <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={() => setReplyTo(comment.id)}
                className="text-[10px] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer flex items-center gap-0.5"
              >
                <Reply size={10} /> Reply
              </button>
              {isOwner && (
                <>
                  <button
                    onClick={() => { setEditingId(comment.id); setEditContent(comment.content) }}
                    className="text-[10px] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer flex items-center gap-0.5"
                  >
                    <Edit2 size={10} /> Edit
                  </button>
                  <button
                    onClick={() => onDelete(comment.id)}
                    className="text-[10px] text-[var(--muted)] hover:text-red-500 cursor-pointer flex items-center gap-0.5"
                  >
                    <Trash2 size={10} /> Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-9 mt-2 space-y-2 border-l-2 border-[var(--border)]/50 pl-3">
          {replies.map(reply => (
            <div key={reply.id} className="flex gap-2">
              <div className="w-5 h-5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[7px] font-bold text-[var(--text)] shrink-0 overflow-hidden">
                {reply.user_avatar ? (
                  <img src={reply.user_avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  (reply.user_name || "U").slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-[var(--text)]">{reply.user_name}</span>
                  <span className="text-[9px] text-[var(--muted)]">{formatTime(reply.created_at)}</span>
                </div>
                <p className="text-[10px] text-[var(--text)] mt-0.5">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
