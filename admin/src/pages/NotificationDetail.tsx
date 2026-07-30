import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, CheckCheck, Mail, Archive, Trash2, Copy, Link,
  CheckCircle2, AlertTriangle, XCircle, Info, Clock, User,
  Tag, Globe, Server, Database, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LoadingState } from "@/components/ui/LoadingState";
import notify from "@/lib/notify";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  useNotification, useMarkRead, useMarkUnread,
  useArchiveNotification, useDeleteNotification,
} from "@/lib/notifications/hooks";
import { SEVERITY_CONFIG, CATEGORY_LABELS } from "@/lib/notifications/types";
import { SmartActions } from "@/components/notifications/SmartActions";

export function NotificationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showMeta, setShowMeta] = useState(false);

  const { data: notif, isLoading, isError } = useNotification(id!);
  const { mutate: markRead } = useMarkRead();
  const { mutate: markUnread } = useMarkUnread();
  const { mutate: archive } = useArchiveNotification();
  const { mutate: deleteNotif } = useDeleteNotification();

  const handleBack = useCallback(() => {
    navigate("/notifications");
  }, [navigate]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    notify.success("Link copied", "Notification URL saved to clipboard");
  }, []);

  const handleDelete = useCallback(() => {
    if (!notif) return;
    deleteNotif(notif.id, {
      onSuccess: () => {
        notify.success("Deleted", "Notification has been permanently removed");
        navigate("/notifications");
      },
    });
  }, [notif, deleteNotif, navigate]);

  if (isLoading) {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <LoadingState count={3} />
      </div>
    );
  }

  if (isError || !notif) {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="text-lg font-semibold">Notification not found</p>
            <p className="text-sm text-muted-foreground">This notification may have been deleted or doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sev = SEVERITY_CONFIG[notif.severity] ?? SEVERITY_CONFIG.info;
  const isUnread = notif.status === "unread";
  const isArchived = notif.status === "archived";
  const SeverityIcon = notif.severity === "critical" ? XCircle
    : notif.severity === "warning" ? AlertTriangle
    : notif.severity === "success" ? CheckCircle2
    : Info;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-1">
          {isUnread ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markRead(notif.id)}
            >
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Mark read
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markUnread(notif.id)}
            >
              <Mail className="mr-1.5 h-3.5 w-3.5" /> Mark unread
            </Button>
          )}
          {!isArchived && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => archive(notif.id, { onSuccess: () => notify.success("Archived", "Notification moved to archive") })}
            >
              <Archive className="mr-1.5 h-3.5 w-3.5" /> Archive
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopyLink}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
          </Button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-4"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", sev.bg + "/10")}>
                <SeverityIcon className={cn("h-5 w-5", sev.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <h1 className={cn("text-xl", isUnread && "font-bold")}>{notif.title}</h1>
                  {isUnread && (
                    <Badge variant="default" className="shrink-0">Unread</Badge>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(notif.created_at)}
                  </span>
                  {notif.source && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Server className="h-3 w-3" />
                      {notif.source}
                    </Badge>
                  )}
                  {notif.category && CATEGORY_LABELS[notif.category] && (
                    <Badge variant="secondary" className="text-[10px]">
                      {CATEGORY_LABELS[notif.category]}
                    </Badge>
                  )}
                  <Badge variant="outline" className={cn("text-[10px]", sev.color)}>
                    {sev.label}
                  </Badge>
                </div>
              </div>
            </div>

            {(notif.message || notif.description) && (
              <>
                <Separator className="my-4" />
                {notif.description && (
                  <p className="text-sm font-medium text-foreground">{notif.description}</p>
                )}
                {notif.message && (
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{notif.message}</p>
                )}
              </>
            )}

            {(notif.source || notif.action_url) && (
              <>
                <Separator className="my-4" />
                <SmartActions notification={notif} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setShowMeta(!showMeta)}>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Tag className="h-4 w-4" />
              Metadata
              <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", showMeta && "rotate-180")} />
            </CardTitle>
          </CardHeader>
          {showMeta && (
            <CardContent className="space-y-3 pt-0">
              <MetaRow icon={<Tag className="h-3.5 w-3.5" />} label="ID" value={notif.id} />
              <MetaRow icon={<Tag className="h-3.5 w-3.5" />} label="Type" value={notif.type} />
              {notif.category && <MetaRow icon={<Tag className="h-3.5 w-3.5" />} label="Category" value={CATEGORY_LABELS[notif.category] ?? notif.category} />}
              {notif.source && <MetaRow icon={<Server className="h-3.5 w-3.5" />} label="Source" value={notif.source} />}
              <MetaRow icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Status" value={notif.status} />
              {notif.severity && <MetaRow icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Severity" value={notif.severity} />}
              {notif.user_id && <MetaRow icon={<User className="h-3.5 w-3.5" />} label="User ID" value={notif.user_id} />}
              {notif.entity_type && <MetaRow icon={<Database className="h-3.5 w-3.5" />} label="Entity Type" value={notif.entity_type} />}
              {notif.entity_id && <MetaRow icon={<Database className="h-3.5 w-3.5" />} label="Entity ID" value={notif.entity_id} />}
              {notif.created_at && <MetaRow icon={<Clock className="h-3.5 w-3.5" />} label="Created" value={notif.created_at} />}
              {notif.read_at && <MetaRow icon={<CheckCheck className="h-3.5 w-3.5" />} label="Read at" value={notif.read_at} />}
              {notif.archived_at && <MetaRow icon={<Archive className="h-3.5 w-3.5" />} label="Archived at" value={notif.archived_at} />}
              {notif.action_url && (
                <MetaRow
                  icon={<ExternalLink className="h-3.5 w-3.5" />}
                  label="Action URL"
                  value={
                    <a href={notif.action_url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                      {notif.action_url}
                    </a>
                  }
                />
              )}

              {notif.metadata && Object.keys(notif.metadata).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">JSON Payload</p>
                    <pre className="overflow-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed">
                      {JSON.stringify(notif.metadata, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>

        {notif.action_url && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Related link</p>
                <a
                  href={notif.action_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline truncate block"
                >
                  {notif.action_url}
                </a>
              </div>
              <Button variant="ghost" size="icon" asChild>
                <a href={notif.action_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  const DATE_LABELS = ["Created", "Read at", "Archived at"];
  const formatted = typeof value === "string" && DATE_LABELS.includes(label)
    ? (() => { try { const d = new Date(value); if (!isNaN(d.getTime())) return formatRelativeTime(value); } catch {} return value; })()
    : value;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="flex w-24 items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-mono text-[11px] truncate">
        {formatted}
      </span>
    </div>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
