import { useState, useEffect, useRef } from "react";
import { Portal } from "@/components/ui/Portal";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSupportTickets, useSupportMessages, useSendSupportMessage, useUpdateTicketStatus, useDeleteTicket, useRealtimeInvalidate, type AdminUserRow } from "@/lib/queries";
import { formatRelativeTime, initialsFromName } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { SupportTicket, SupportMessage } from "@/lib/types";
import { MessageSquare, Send, Monitor, Gamepad2, X, Loader2, Trash2, UserCheck, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";

const priorityColors: Record<string, "secondary" | "warning" | "destructive" | "default"> = {
  low: "secondary", medium: "default", high: "warning", urgent: "destructive",
};
const statusColors: Record<string, "secondary" | "warning" | "default" | "success" | "destructive"> = {
  open: "destructive", in_progress: "warning", pending: "secondary", resolved: "success", closed: "default",
};

function ChatPanel({ ticket, onClose }: { ticket: SupportTicket; onClose: () => void }) {
  const { user: admin } = useAuth();
  const { data: messages, isLoading } = useSupportMessages(ticket.id);
  const sendMsg = useSendSupportMessage();
  const updateStatus = useUpdateTicketStatus();
  const deleteTicket = useDeleteTicket();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !admin) return;
    setSending(true);
    try {
      await sendMsg.mutateAsync({
        ticket_id: ticket.id,
        sender_type: "admin",
        sender_name: admin.name,
        message: text.trim(),
      });
      setText("");
      if (ticket.status === "open") {
        await updateStatus.mutateAsync({ id: ticket.id, status: "in_progress", assignedTo: admin.name });
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
      await updateStatus.mutateAsync({ id: ticket.id, status, assignedTo: admin?.name || null });
      toast.success(`Ticket marked as ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const { confirm } = useConfirmDialog();
  const handleDelete = async () => {
    if (!await confirm({ title: "Delete Ticket", description: "Delete this support ticket and all messages? This cannot be undone.", variant: "delete", confirmText: "Delete" })) return;
    try {
      await deleteTicket.mutateAsync(ticket.id);
      toast.success("Ticket deleted");
      onClose();
    } catch {
      toast.error("Failed to delete ticket");
    }
  };

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-xl border bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="font-semibold flex items-center gap-2">{ticket.subject}</h2>
            <p className="text-xs text-muted-foreground">{ticket.user_name} {ticket.email ? `<${ticket.email}>` : ""}</p>
          </div>
          <div className="flex items-center gap-2">
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
            <Button variant="ghost" size="icon" onClick={handleDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleScreenShare}>
            <Monitor className="mr-1 h-3.5 w-3.5" /> Screen Share
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleTakeControl}>
            <Gamepad2 className="mr-1 h-3.5 w-3.5" /> Take Control
          </Button>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={priorityColors[ticket.priority] ?? "default"} className="text-[10px]">{ticket.priority}</Badge>
            <Badge variant="outline" className="text-[10px]">{ticket.category}</Badge>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
  const isSystem = message.message.startsWith("📺") || message.message.startsWith("🕹️");
  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="rounded-full bg-muted px-4 py-1.5 text-xs text-muted-foreground italic">
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
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  useRealtimeInvalidate(["admin", "support-tickets"], "support_tickets", "*");

  if (isLoading) return <div className="p-6"><PageHeader title="Support Tickets" description="Manage customer support with live chat" /><LoadingState count={5} /></div>;

  return (
    <div className="p-6">
      <PageHeader
        title="Support Tickets"
        description="Manage customer support — live chat, screen share, take control"
      />
      {tickets && tickets.length > 0 ? (
        <div className="rounded-lg border">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="flex cursor-pointer items-center gap-4 border-b p-4 transition-colors hover:bg-muted/50 last:border-b-0"
              onClick={() => setActiveTicket(ticket)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{ticket.subject}</p>
                  <Badge variant={statusColors[ticket.status] ?? "secondary"} className="shrink-0 text-[10px]">{ticket.status}</Badge>
                  <Badge variant={priorityColors[ticket.priority] ?? "default"} className="shrink-0 text-[10px]">{ticket.priority}</Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {ticket.user_name} {ticket.email ? `<${ticket.email}>` : ""} · {ticket.category} · {ticket.replies} replies · {formatRelativeTime(ticket.last_update)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {ticket.assigned_to ? (
                  <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" />{ticket.assigned_to}</span>
                ) : (
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Unassigned</span>
                )}
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActiveTicket(ticket)}>
                  <MessageSquare className="mr-1 h-3.5 w-3.5" /> Open Chat
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No support tickets" description="Support tickets will appear here once customers submit them." />
      )}
      {activeTicket && <ChatPanel ticket={activeTicket} onClose={() => setActiveTicket(null)} />}
    </div>
  );
}
