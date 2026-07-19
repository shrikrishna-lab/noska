import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWaitlistSettings, useUpdateWaitlistSettings, useRealtimeInvalidate } from "@/lib/queries";
import { LoadingState } from "@/components/ui/LoadingState";
import { UsersRound, Save } from "lucide-react";
import toast from "react-hot-toast";

export function WaitlistSettingsPage() {
  const { data: settings, isLoading } = useWaitlistSettings();
  const update = useUpdateWaitlistSettings();
  useRealtimeInvalidate(["admin", "waitlist-settings"], "waitlist_settings");

  const [enabled, setEnabled] = useState(true);
  const [collectName, setCollectName] = useState(true);
  const [collectCompany, setCollectCompany] = useState(false);
  const [collectRole, setCollectRole] = useState(false);
  const [collectCountry, setCollectCountry] = useState(true);
  const [collectCode, setCollectCode] = useState(false);
  const [collectPhone, setCollectPhone] = useState(false);
  const [emailVerification, setEmailVerification] = useState(false);
  const [doubleOptIn, setDoubleOptIn] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMsg, setConfirmMsg] = useState("");

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setCollectName(settings.collect_name);
      setCollectCompany(settings.collect_company);
      setCollectRole(settings.collect_role);
      setCollectCountry(settings.collect_country);
      setCollectCode(settings.collect_referral_code);
      setCollectPhone(settings.collect_phone);
      setEmailVerification(settings.email_verification);
      setDoubleOptIn(settings.double_opt_in);
      setAutoApprove(settings.auto_approve);
      setConfirmTitle(settings.confirmation_title);
      setConfirmMsg(settings.confirmation_message);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        enabled: enabled, collect_name: collectName, collect_company: collectCompany,
        collect_role: collectRole, collect_country: collectCountry,
        collect_referral_code: collectCode, collect_phone: collectPhone,
        email_verification: emailVerification, double_opt_in: doubleOptIn,
        auto_approve: autoApprove, confirmation_title: confirmTitle,
        confirmation_message: confirmMsg,
      });
      toast.success("Waitlist settings saved");
    } catch { toast.error("Failed to save"); }
  };

  if (isLoading) return <div className="p-6"><PageHeader title="Waitlist Settings" description="Configure waitlist behavior" /><LoadingState count={1} /></div>;

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Waitlist Settings" description="Configure waitlist collection and behavior" actions={<Button size="sm" onClick={handleSave} disabled={update.isPending}><Save className="mr-1 h-3.5 w-3.5" /> Save</Button>} />

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Enable Waitlist</p><p className="text-sm text-muted-foreground">Accept new waitlist signups</p></div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="font-medium">Fields to Collect</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { k: "Name", v: collectName, s: setCollectName },
              { k: "Company", v: collectCompany, s: setCollectCompany },
              { k: "Role", v: collectRole, s: setCollectRole },
              { k: "Country", v: collectCountry, s: setCollectCountry },
              { k: "Referral Code", v: collectCode, s: setCollectCode },
              { k: "Phone", v: collectPhone, s: setCollectPhone },
            ].map(({ k, v, s }) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-sm">{k}</span>
                <Switch checked={v} onCheckedChange={s} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="font-medium">Verification & Approval</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Email Verification</p><p className="text-xs text-muted-foreground">Verify email before adding to waitlist</p></div>
              <Switch checked={emailVerification} onCheckedChange={setEmailVerification} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Double Opt-in</p><p className="text-xs text-muted-foreground">Send confirmation email</p></div>
              <Switch checked={doubleOptIn} onCheckedChange={setDoubleOptIn} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Auto-approve</p><p className="text-xs text-muted-foreground">Automatically approve all signups</p></div>
              <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="font-medium">Confirmation Message</p>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={confirmTitle} onChange={(e) => setConfirmTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Input value={confirmMsg} onChange={(e) => setConfirmMsg(e.target.value)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
