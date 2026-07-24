import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift, Users, Trophy, Star, Zap, Plus, Pencil, Trash2, Copy, CheckCircle2,
  Award, Brain, Palette, Infinity, Paintbrush, X, Loader2, ExternalLink, Sparkles
} from "lucide-react";
import { useConfirmDialog } from "@/components/ui/ConfirmationDialog";
import { showToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Portal } from "@/components/ui/Portal";
import {
  useReferralCodes, useReferralRewards, useUserReferrals, useRealtimeInvalidate,
  useCreateReferralReward, useUpdateReferralReward, useDeleteReferralReward,
} from "@/lib/queries";

const iconMap: Record<string, typeof Zap> = {
  Zap, Brain, Palette, Award, Star, Infinity, Paintbrush, Sparkles,
};

const rewardColors: Record<string, string> = {
  pro_days: "#7CC8FF", ai_credits: "#8B5CF6", badge: "#F59E0B",
  theme: "#E6D5B8", xp: "#10B981", early_access: "#6366F1",
  workspace_skin: "#E6D5B8", founder_badge: "#F59E0B", lifetime_beta: "#6366F1",
};

function CreateRewardModal({ onClose }: { onClose: () => void }) {
  const create = useCreateReferralReward();
  const [form, setForm] = useState({ name: "", description: "", type: "pro_days", value: 7, min_referrals: 1, active: true });

  const handleSubmit = async () => {
    if (!form.name) return;
    await create.mutateAsync(form as unknown as Record<string, unknown>);
    showToast("Reward created", "success");
    onClose();
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Create Reward</h2>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 7 Days Pro" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Description</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Get 7 days of Pro" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-gray-300">
                  {Object.keys(rewardColors).map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Value</label>
                <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Min Referrals</label>
              <Input type="number" value={form.min_referrals} onChange={(e) => setForm({ ...form, min_referrals: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <span className="text-sm text-gray-600">Active</span>
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name || create.isPending} className="flex-1">
              {create.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Create Reward
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function RewardCard({ reward, onEdit, onDelete }: { reward: import("@/lib/queries").DbReferralReward; onEdit: () => void; onDelete: () => void }) {
  const color = reward.color || rewardColors[reward.type] || "#7CC8FF";
  const Icon = iconMap[reward.icon as string] || Gift;

  return (
    <motion.div layout className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={onEdit} className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"><Pencil className="h-3.5 w-3.5" /></button>
        <button onClick={onDelete} className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}20` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{reward.name}</h3>
      {reward.description && <p className="mt-1 text-xs text-gray-500">{reward.description}</p>}
      <div className="mt-3 flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px]">{reward.type.replace("_", " ")}</Badge>
        <Badge variant="outline" className="text-[10px]">{reward.min_referrals} refs</Badge>
        {!reward.active && <Badge variant="secondary" className="text-[10px] text-gray-400">Inactive</Badge>}
      </div>
    </motion.div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }: { icon: typeof Zap; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color || "#7CC8FF"}20` }}>
          <Icon className="h-5 w-5" style={{ color: color || "#7CC8FF" }} />
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-500">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export function Referrals() {
  const { confirm } = useConfirmDialog();
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState("overview");

  const { data: codes, isLoading: codesLoading } = useReferralCodes();
  const { data: rewards, isLoading: rewardsLoading } = useReferralRewards();
  const { data: userRefs, isLoading: refsLoading } = useUserReferrals();
  const deleteReward = useDeleteReferralReward();
  useRealtimeInvalidate(["admin", "referral-codes"], "referral_codes");
  useRealtimeInvalidate(["admin", "referral-rewards"], "referral_rewards");
  useRealtimeInvalidate(["admin", "user-referrals"], "user_referrals");

  const totalRefs = codes?.reduce((s, c) => s + c.total_referrals, 0) ?? 0;
  const activeRefs = codes?.reduce((s, c) => s + c.active_referrals, 0) ?? 0;
  const totalRewards = codes?.reduce((s, c) => s + c.rewards_earned, 0) ?? 0;
  const totalXP = codes?.reduce((s, c) => s + c.xp, 0) ?? 0;
  const totalCredits = codes?.reduce((s, c) => s + c.ai_credits, 0) ?? 0;
  const uniqueReferrers = codes?.length ?? 0;

  const handleDeleteReward = async (reward: import("@/lib/queries").DbReferralReward) => {
    if (!await confirm({ title: "Delete Reward", description: `Delete "${reward.name}"? This cannot be undone.`, variant: "delete", confirmText: "Delete" })) return;
    try { await deleteReward.mutateAsync(reward.id); showToast("Reward deleted", "success"); }
    catch { showToast("Failed to delete", "error"); }
  };

  return (
    <div className="p-6">
      <PageHeader title="Referrals & Rewards" description="Manage the referral system and rewards" />

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="codes">Referral Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard icon={Users} label="Referrers" value={uniqueReferrers} color="#7CC8FF" />
            <KpiCard icon={Users} label="Total Referrals" value={totalRefs} sub={`${activeRefs} active`} color="#8B5CF6" />
            <KpiCard icon={Gift} label="Rewards Earned" value={totalRewards} color="#F59E0B" />
            <KpiCard icon={Star} label="Total XP" value={totalXP.toLocaleString()} color="#10B981" />
            <KpiCard icon={Brain} label="AI Credits" value={totalCredits.toLocaleString()} color="#8B5CF6" />
            <KpiCard icon={Trophy} label="Rewards" value={rewards?.filter(r => r.active).length ?? 0} sub="active" color="#6366F1" />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Active Reward Tiers</CardTitle>
              <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="mr-1 h-4 w-4" /> Add Reward</Button>
            </CardHeader>
            <CardContent>
              {rewardsLoading ? <LoadingState count={3} /> : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {rewards?.filter(r => r.active).map((r) => (
                    <RewardCard key={r.id} reward={r} onEdit={() => {}} onDelete={() => handleDeleteReward(r)} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">All Rewards</CardTitle>
              <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="mr-1 h-4 w-4" /> Add Reward</Button>
            </CardHeader>
            <CardContent>
              {rewardsLoading ? <LoadingState count={6} /> : rewards?.length === 0 ? (
                <EmptyState title="No rewards yet" description="Create your first reward tier" />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {rewards?.map((r) => (
                    <RewardCard key={r.id} reward={r} onEdit={() => {}} onDelete={() => handleDeleteReward(r)} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Referral Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {refsLoading ? <LoadingState count={8} /> : !userRefs || userRefs.length === 0 ? (
                <EmptyState title="No referrals yet" description="Referrals will appear here when users start inviting" />
              ) : (
                <div className="space-y-2">
                  {userRefs.map((ref) => (
                    <div key={ref.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                          {(ref.referred_name ?? ref.referred_id).slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{ref.referred_name ?? "Unknown"}</p>
                          <p className="text-xs text-gray-400">{ref.referred_email ?? ""}</p>
                          <p className="text-xs text-gray-400">Referred by: {ref.referrer_name ?? "Unknown"} ({ref.referrer_email ?? ""})</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={ref.status === "active" ? "default" : ref.status === "joined" ? "secondary" : "outline"} className="text-[10px]">{ref.status}</Badge>
                        {ref.reward_claimed && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Referral Codes</CardTitle>
            </CardHeader>
            <CardContent>
              {codesLoading ? <LoadingState count={8} /> : !codes || codes.length === 0 ? (
                <EmptyState title="No codes generated" description="Users will generate codes when they access the referral page" />
              ) : (
                <div className="space-y-2">
                  {codes.map((code) => (
                    <div key={code.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-50 px-3 py-1 font-mono text-sm font-bold tracking-wider text-blue-600">
                          {code.code}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{code.user_name ?? "Unknown"}</p>
                          <p className="text-xs text-gray-400">{code.email ?? ""}</p>
                          <p className="text-xs text-gray-400">Level {code.level} · {code.xp} XP</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>{code.total_referrals} refs</span>
                        <span>{code.active_referrals} active</span>
                        <span>{code.rewards_earned} rewards</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AnimatePresence>
        {showCreate && <CreateRewardModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
}
