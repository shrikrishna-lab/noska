import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bell, CheckCircle2, Mail, RotateCcw, UserCheck, UserPlus, ShieldAlert, Key } from "lucide-react";

const FLOWS = [
  {
    trigger: "Waitlist Joined",
    action: "Waitlist Confirmation",
    icon: UserPlus,
    description: "When a user joins the waitlist, send a confirmation with position and referral link.",
    active: true,
  },
  {
    trigger: "Admin Approved",
    action: "Invitation Email",
    icon: CheckCircle2,
    description: "When admin approves a waitlist entry, send an invitation with accept link and expiry.",
    active: true,
  },
  {
    trigger: "User Registered",
    action: "Welcome Email",
    icon: UserCheck,
    description: "When a user completes registration, send welcome email with getting started guide.",
    active: true,
  },
  {
    trigger: "Forgot Password",
    action: "Reset Email",
    icon: Key,
    description: "When a user requests a password reset, send reset link.",
    active: true,
  },
  {
    trigger: "Email Verification",
    action: "Verification Email",
    icon: Mail,
    description: "When a new email is added, send verification link.",
    active: false,
  },
  {
    trigger: "Security Event",
    action: "Security Alert",
    icon: ShieldAlert,
    description: "When a security event is detected, send alert to the user.",
    active: false,
  },
];

export function TransactionalEmails() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactional Emails"
        description="Automated email flows triggered by user actions"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {FLOWS.map((flow) => (
          <Card key={flow.trigger} className={!flow.active ? "opacity-50" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg p-2 bg-indigo-100 dark:bg-indigo-900/30">
                    <flow.icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{flow.trigger}</CardTitle>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" /> {flow.action}
                    </p>
                  </div>
                </div>
                <Badge variant={flow.active ? "default" : "outline"} className="text-[10px]">
                  {flow.active ? "Active" : "Draft"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">{flow.description}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  <Bell className="mr-1 h-3 w-3" /> Configure
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <RotateCcw className="mr-1 h-3 w-3" /> Test
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Automation Rules</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Transactional emails are sent automatically based on events. Configure which templates to use for each trigger above. When no template is assigned, the system will use the default built-in email.</p>
        </CardContent>
      </Card>
    </div>
  );
}
