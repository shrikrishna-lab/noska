import { useState, useEffect, useRef, useMemo } from "react";
import { Portal } from "@/components/ui/Portal";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSupportTickets, useSupportMessages, useSendSupportMessage, useUpdateTicketStatus, useDeleteTicket, useRealtimeInvalidate, useAdminUsers, type DbAdminUser } from "@/lib/queries";
import { sendEmail } from "@/lib/email";
import { buildAdminReplyEmail, excerpt } from "../../../supabase/functions/support-notify/email";
import { formatRelativeTime, initialsFromName } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { SupportTicket, SupportMessage } from "@/lib/types";
import { MessageSquare, Send, Monitor, Gamepad2, X, Loader2, Trash2, UserCheck, Clock, Search, UserPlus, UserX, ArrowUpNarrowWide, Inbox } from "lucide-react";
import toast from "react-hot-toast";

const priorityColors: Record<string, "secondary" | "warning" | "destructive" | "default"> = {
  low: "secondary", medium: "default", high: "warning", urgent: "destructive",
};
const statusColors: Record<string, "secondary" | "warning" | "default" | "success" | "destructive"> = {
  open: "destructive", in_progress: "warning", pending: "secondary", resolved: "success", closed: "default",
};
const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const STATUS_TABS = ["all", "open", "in_progress", "pending", "resolved", "closed"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

function ChatPanel({ ticket, adminNameById, onClose }: {
  ticket: SupportTicket;
  adminNameById: Map<string, string>;
  onClose: () => void;
}) {
  const { user: admin } = useAuth();
  const { data: messages, isLoading } = useSupportMessages(ticket.id);
  const sendMsg = useSendSupportMessage();
  const updateStatus = useUpdateTicketStatus();
  const deleteTicket = useDeleteTicket();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Live updates: support_messages is relayed through admin_realtime_outbox.
  useRealtimeInvalidate(["admin", "support-messages", ticket.id], "support_messages");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !admin) return;
    setSending(true);
    try {
      const body = text.trim();
      await sendMsg.mutateAsync({
        ticket_id: ticket.id,
        sender_type: "admin",
        sender_name: admin.name,
        message: body,
      });
      setText("");
      // Fire-and-forget user notification email (never blocks the chat).
      if (ticket.email) {
        const mail = buildAdminReplyEmail({
          ticket_number: ticket.ticket_number || ticket.id.slice(0, 8),
          user_name: ticket.user_name,
          subject: ticket.subject,
          admin_name: admin.name,
          reply_excerpt: excerpt(body),
        });
        void sendEmail({ to: ticket.email, subject: mail.subject, html: mail.html, text: mail.text }).then((r) => {
          if (r.error) toast.error(`Reply sent, but notification email failed: ${r.error}`);
        });
      }
      if (ticket.status === "open") {
        await updateStatus.mutateAsync({ id: ticket.id, status: "in_progress", assignedTo: admin.id });
      }
    } catch {
      toast.error("Failed to send message");
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleScreenShare = async () => {
    if (!admin) return;
    try {
      await sendMsg.mutateAsync({
        ticket_id: ticket.id,
        sender_type: "admin",
        sender_name: admin.name,
        message: "📺 Admin has requested screen share with the user. The user will be prompted to start sharing their screen.",
      });
      toast.success("Screen share request sent to user");
    } catch {
      toast.error("Failed to send screen share request");
    }
  };

  const handleTakeControl = async () => {
    if (!admin) return;
    try {
      await sendMsg.mutateAsync({
        ticket_id: ticket.id,
        sender_type: "admin",
        sender_name: admin.name,
        message: "🕹️ Admin has requested to take control of the user's session. The user will be prompted to grant control.",
      });
      toast.success("Take control request sent to user");
    } catch {
      toast.error("Failed to send take control request");
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await updateStatus.mutateAsync({ id: ticket.id, status, assignedTo: admin?.id || null });
      // Leave a visible timeline entry so the user sees what happened.
      if (status !== ticket.status) {
        await sendMsg.mutateAsync({
          ticket_id: ticket.id,
          sender_type: "admin",
          sender_name: admin?.name || "Support",
          message: `🔔 Ticket status changed to ${status.replace("_", " ")}.`,
        });
      }
      toast.success(`Ticket marked as ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handlePriorityChange = async (priority: string) => {
    try {
      await updateStatus.mutateAsync({ id: ticket.id, priority });
      toast.success(`Priority set to ${priority}`);
    } catch {
      toast.error("Failed to update priority");
    }
  };

  const handleAssign = async (adminId: string) => {
    try {
      await updateStatus.mutateAsync({
        id: ticket.id,
        assignedTo: adminId === "__none__" ? null : adminId,
      });
      toast.success(adminId === "__none__" ? "Ticket unassigned" : `Assigned to ${adminNameById.get(adminId) || "admin"}`);
    } catch {
      toast.error("Failed to assign ticket");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this ticket and all messages?")) return;
    try {
      await deleteTicket.mutateAsync(ticket.id);
      toast.success("Ticket deleted");
      onClose();
    } catch {
      toast.error("Failed to delete ticket");
    }
  };

  const assigneeName = ticket.assigned_to ? adminNameById.get(ticket.assigned_to) || "Unknown admin" : null;

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex h-[82vh] w-full max-w-2xl flex-col rounded-xl border bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 border-b p-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 truncate font-semibold">
              {ticket.subject}
              {ticket.ticket_number && (
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {ticket.ticket_number}
                </span>
              )}
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {ticket.user_name} {ticket.email ? `<${ticket.email}>` : ""}
              {assigneeName ? ` · Assigned to ${assigneeName}` : " · Unassigned"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Select value={ticket.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={handleDelete} title="Delete ticket">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleScreenShare}>
            <Monitor className="mr-1 h-3.5 w-3.5" /> Screen Share
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleTakeControl}>
            <Gamepad2 className="mr-1 h-3.5 w-3.5" /> Take Control
          </Button>
          <Select value={ticket.priority} onValueChange={handlePriorityChange}>
            <SelectTrigger className="h-7 w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ticket.assigned_to || "__none__"} onValueChange={handleAssign}>
            <SelectTrigger className="h-7 w-[150px] text-xs">
              <SelectValue placeholder="Assign…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Unassigned</SelectItem>
              {admin?.id && <SelectItem value={admin.id}>Assign to me ({admin.name})</SelectItem>}
              {[...adminNameById.entries()]
                .filter(([id]) => id !== admin?.id)
                .map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={priorityColors[ticket.priority] ?? "default"} className="text-[10px]">{ticket.priority}</Badge>
            <Badge variant="outline" className="text-[10px]">{ticket.category}</Badge>
          </div>
        </div>

        {(ticket.description || ticket.platform) && (
          <div className="border-b bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
            {ticket.description && <p className="line-clamp-3 whitespace-pre-wrap">{ticket.description}</p>}
            {ticket.platform && <p className="mt-1 font-mono text-[10px]">via {ticket.platform}</p>}
          </div>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : messages && messages.length > 0 ? (
            messages.map((msg) => <ChatBubble key={msg.id} message={msg} isAdmin={msg.sender_type === "admin"} />)
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No messages yet. Start the conversation.</div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t p-3">
          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1"
              disabled={sending}
            />
            <Button size="icon" onClick={handleSend} disabled={!text.trim() || sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
    </Portal>
  );
}

function ChatBubble({ message, isAdmin }: { message: SupportMessage; isAdmin: boolean }) {
  const isSystem = message.message.startsWith("📺") || message.message.startsWith("🕹️") || message.message.startsWith("🔔");
  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="rounded-full bg-muted px-4 py-1.5 text-xs italic text-muted-foreground">
          {message.message.replace(/^[^\s]+\s/, "")}
        </div>
      </div>
    );
  }
  return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[80%] gap-2 ${isAdmin ? "flex-row-reverse" : ""}`}>
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="text-[9px]">{initialsFromName(message.sender_name)}</AvatarFallback>
        </Avatar>
        <div>
          <div className={`rounded-2xl px-3 py-2 text-sm ${isAdmin ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            {message.message}
          </div>
          <p className={`mt-0.5 text-[10px] text-muted-foreground ${isAdmin ? "text-right" : "text-left"}`}>
            {message.sender_name} · {formatRelativeTime(message.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Support() {
  const { data: tickets, isLoading } = useSupportTickets();
  const { data: admins } = useAdminUsers();
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [tab, setTab] = useState<StatusTab>("all");
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [urgentFirst, setUrgentFirst] = useState(true);
  useRealtimeInvalidate(["admin", "support-tickets"], "support_tickets", "*");

  const adminNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of (admins as DbAdminUser[] | undefined) || []) map.set(a.id, a.name);
    return map;
  }, [admins]);

  const stats = useMemo(() => {
    const list = tickets || [];
    return {
      open: list.filter((t) => t.status === "open").length,
      inProgress: list.filter((t) => t.status === "in_progress").length,
      unassigned: list.filter((t) => !t.assigned_to && t.status !== "closed" && t.status !== "resolved").length,
      urgent: list.filter((t) => t.priority === "urgent" && t.status !== "closed" && t.status !== "resolved").length,
    };
  }, [tickets]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (tickets || []).filter((t) => {
      if (tab !== "all" && t.status !== tab) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (!q) return true;
      return (
        t.subject.toLowerCase().includes(q) ||
        (t.email || "").toLowerCase().includes(q) ||
        (t.user_name || "").toLowerCase().includes(q) ||
        (t.ticket_number || "").toLowerCase().includes(q)
      );
    });
    if (urgentFirst) {
      list.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)
        || +new Date(b.last_update) - +new Date(a.last_update));
    }
    return list;
  }, [tickets, tab, query, priorityFilter, urgentFirst]);

  if (isLoading) return <div className="p-6"><PageHeader title="Support Tickets" description="Manage customer support with live chat" /><LoadingState count={5} /></div>;

  return (
    <div className="p-6">
      <PageHeader
        title="Support Tickets"
        description="Manage customer support — live chat, screen share, take control"
      />

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Open", value: stats.open, icon: <Inbox className="h-4 w-4 text-destructive" /> },
          { label: "In progress", value: stats.inProgress, icon: <Clock className="h-4 w-4 text-amber-500" /> },
          { label: "Unassigned", value: stats.unassigned, icon: <UserX className="h-4 w-4 text-muted-foreground" /> },
          { label: "Urgent", value: stats.urgent, icon: <ArrowUpNarrowWide className="h-4 w-4 text-destructive" /> },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">{s.icon}<p className="text-2xl font-bold">{s.value}</p></div>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
          {STATUS_TABS.map((s) => (
            <Button
              key={s}
              variant={tab === s ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs capitalize"
              onClick={() => setTab(s)}
            >
              {s === "all" ? "All" : s.replace("_", " ")}
            </Button>
          ))}
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={urgentFirst ? "secondary" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setUrgentFirst((v) => !v)}
          title="Sort urgent tickets first"
        >
          <ArrowUpNarrowWide className="mr-1 h-3.5 w-3.5" /> Urgent first
        </Button>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subject, email, name, NSK-…"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {visible.length > 0 ? (
        <div className="rounded-lg border">
          {visible.map((ticket) => {
            const assignee = ticket.assigned_to ? adminNameById.get(ticket.assigned_to) || "Unknown admin" : null;
            return (
              <div
                key={ticket.id}
                className="flex cursor-pointer items-center gap-4 border-b p-4 transition-colors hover:bg-muted/50 last:border-b-0"
                onClick={() => setActiveTicket(ticket)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{ticket.subject}</p>
                    <Badge variant={statusColors[ticket.status] ?? "secondary"} className="shrink-0 text-[10px]">{ticket.status}</Badge>
                    <Badge variant={priorityColors[ticket.priority] ?? "default"} className="shrink-0 text-[10px]">{ticket.priority}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {ticket.ticket_number && <span className="mr-1 font-mono">{ticket.ticket_number}</span>}
                    {ticket.user_name} {ticket.email ? `<${ticket.email}>` : ""} · {ticket.category} · {ticket.replies} replies · {formatRelativeTime(ticket.last_update)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  {assignee ? (
                    <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" />{assignee}</span>
                  ) : (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Unassigned</span>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActiveTicket(ticket)}>
                    <MessageSquare className="mr-1 h-3.5 w-3.5" /> Open Chat
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={(tickets || []).length === 0 ? "No support tickets" : "No tickets match"}
          description={(tickets || []).length === 0
            ? "Support tickets will appear here once customers submit them."
            : "Try a different search or filter."}
        />
      )}
      {activeTicket && (
        <ChatPanel
          ticket={activeTicket}
          adminNameById={adminNameById}
          onClose={() => setActiveTicket(null)}
        />
      )}
      <AssignMeHint />
    </div>
  );
}

/** Small helper row under the queue — keeps the "assign to me" flow discoverable. */
function AssignMeHint() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
      <UserPlus className="h-3.5 w-3.5" />
      Signed in as {user.name} — opening a chat and replying auto-assigns open tickets to you.
    </p>
  );
}
