import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Portal } from "@/components/ui/Portal";
import { ArrowRight, Bell, Mail, RotateCcw, FileText, Send, X, Loader2 } from "lucide-react";
import { useEmailTemplates, useRealtimeInvalidate } from "@/lib/queries";
import { sendEmail } from "@/lib/email";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/utils";
import { Link } from "react-router-dom";
import type { EmailTemplate } from "@/lib/types";
import toast from "react-hot-toast";

function TestEmailDialog({ template, onClose }: { template: EmailTemplate; onClose: () => void }) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(template.subject ?? "");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSend = async () => {
    if (!to.trim()) { toast.error("Enter a recipient email"); return; }
    setSending(true);
    setResult(null);
    try {
      const res = await sendEmail({
        to: to.trim(),
        subject: subject.trim() || `${template.name} — test`,
        html: template.html_content || "<p>This is a test email.</p>",
      });
      if (res.error) { setResult(`Failed: ${res.error}`); toast.error("Test email failed"); }
      else { setResult("Test email sent"); toast.success("Test email sent"); }
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Send failed");
      toast.error("Test email failed");
    }
    setSending(false);
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Test Email</h2>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Send <strong>{template.name}</strong> to a recipient.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input type="email" placeholder="you@example.com" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            {result && (
              <div className="rounded-lg bg-muted p-3 text-sm">{result}</div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={sending}>Cancel</Button>
              <Button className="flex-1" onClick={handleSend} disabled={sending || !to.trim()}>
                {sending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
                Send Test
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

export function TransactionalEmails() {
  useRealtimeInvalidate(["admin", "email-templates"], "email_templates");
  const { data: templates, isLoading } = useEmailTemplates();
  const [testing, setTesting] = useState<EmailTemplate | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Transactional Emails" description="Automated email flows triggered by user actions" />
        <LoadingState count={6} />
      </div>
    );
  }

  const active = (templates ?? []).filter((t) => t.status === "published");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactional Emails"
        description="Automated email flows triggered by user actions"
      />

      {templates && templates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(templates ?? []).map((tpl) => (
            <Card key={tpl.id} className={tpl.status === "archived" ? "opacity-50" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg p-2 bg-indigo-100 dark:bg-indigo-900/30">
                      <Mail className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{tpl.name}</CardTitle>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <ArrowRight className="h-3 w-3" /> {tpl.subject || "No subject"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={active.some((a) => a.id === tpl.id) ? "default" : "outline"} className="text-[10px]">
                    {tpl.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  {tpl.description || "No description"}
                  {tpl.updated_at ? ` · Updated ${formatRelativeTime(tpl.updated_at)}` : ""}
                </p>
                <div className="flex gap-2">
                  <Link to={`/email-templates/${tpl.id}/edit`}>
                    <Button variant="outline" size="sm" className="text-xs">
                      <Bell className="mr-1 h-3 w-3" /> Configure
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => setTesting(tpl)}>
                    <RotateCcw className="mr-1 h-3 w-3" /> Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No email templates"
          description="Transactional email templates will appear here once created."
          icon={FileText}
        />
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Automation Rules</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Transactional emails are sent automatically based on events. Configure which templates to use for each trigger above. When no template is assigned, the system will use the default built-in email.</p>
        </CardContent>
      </Card>

      {testing && <TestEmailDialog template={testing} onClose={() => setTesting(null)} />}
    </div>
  );
}
