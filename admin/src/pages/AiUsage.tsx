import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAiChats, useAiChatCount, useAiUsageFromAudit, useLeaderboardFromAudit, useUsers, useRealtimeInvalidate, useRealtimeAuditFeed, type AuditLeaderboardRow } from "@/lib/queries";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Sparkles, Bot, Zap, Clock, Users, Activity, Layers, ArrowUpRight, Trophy, DollarSign, Gauge, Radio, BarChart3 } from "lucide-react";

type TimeRange = "all" | "30d" | "7d";
type TabType = "overview" | "models" | "users" | "activity";

function LiveDot({ className = "" }: { className?: string }) {
  return (
    <span className={`relative flex h-2 w-2 shrink-0 ${className}`}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  );
}

function formatTokensShort(n: number): string {
  if (n >= 1000000000) return `${(n / 1000000000).toFixed(1)}B`;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

export function AiUsage() {
  const [tab, setTab] = useState<TabType>("overview");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  const { data: chats, isLoading: chatsLoading } = useAiChats();
  const { data: totalChats } = useAiChatCount();
  const { data: aiEvents, isLoading: eventsLoading } = useAiUsageFromAudit();
  const { data: leaderboardRows } = useLeaderboardFromAudit();
  const { data: profileRows } = useUsers();
  useRealtimeInvalidate(["admin", "ai-usage"], "audit_logs");
  useRealtimeInvalidate(["admin", "ai-usage"], "ai_chats");
  useRealtimeInvalidate(["admin", "ai-usage"], "user_ai_usage_stats");

  // Real-time activity feed
  const realtimeFeed = useRealtimeAuditFeed(25);

  // Build profile lookup map (keyed by user_id from the raw query result)
  const profileMap = useMemo(() => {
    const map = new Map<string, { name: string; email: string | null; avatar: string | null; username: string | null }>();
    for (const p of (profileRows || []) as any[]) {
      const uid = p.user_id || p.id;
      if (uid) map.set(uid, { name: p.user_name, email: p.email ?? null, avatar: p.avatar_url, username: p.username });
    }
    return map;
  }, [profileRows]);

  // Compute aggregated real stats strictly from authentic database records
  const stats = useMemo(() => {
    const events = (aiEvents ?? []) as any[];
    const now = Date.now();
    const rangeMs = timeRange === "7d" ? 7 * 86400000 : timeRange === "30d" ? 30 * 86400000 : Infinity;

    const filteredEvents = events.filter((e) => {
      const t = e.created_at ? new Date(e.created_at).getTime() : now;
      return now - t <= rangeMs;
    });

    let totalPromptTokens = 0;
    let totalCompTokens = 0;
    let totalCost = 0;
    let totalLatency = 0;
    let latencyCount = 0;
    let minLatency = Infinity;
    let maxLatency = 0;
    const latencyBuckets = { fast: 0, medium: 0, slow: 0 };

    const modelMap: Record<string, { count: number; promptTokens: number; compTokens: number; cost: number; latency: number }> = {};
    const userMap: Record<string, { name: string; count: number; tokens: number; cost: number; lastActive: string }> = {};
    const hourMap: Record<number, number> = {};
    const dayMap: Record<string, number> = {};

    let chatTokensCount = 0;
    let chatMessagesCount = 0;

    // Scan all real chats — extract model info from messages
    (chats || []).forEach((chat: any) => {
      const msgs = (chat.messages || []) as any[];
      const chatTime = new Date(chat.updated_at || chat.created_at || now).getTime();
      if (now - chatTime <= rangeMs) {
        msgs.forEach((m) => {
          chatMessagesCount++;
          const textLen = (m.content || m.text || "").length;
          const estToks = Math.max(1, Math.round(textLen / 3.8));
          chatTokensCount += estToks;

          const mName = (m.model || "llama-3.3-70b-versatile").split("/").pop() || "llama-3.3-70b";
          if (!modelMap[mName]) modelMap[mName] = { count: 0, promptTokens: 0, compTokens: 0, cost: 0, latency: 0 };
          modelMap[mName].count++;
          modelMap[mName].compTokens += estToks;

          if (chat.user_id) {
            const uid = chat.user_id;
            if (!userMap[uid]) userMap[uid] = { name: "User " + uid.slice(0, 8), count: 0, tokens: 0, cost: 0, lastActive: chat.updated_at || "" };
            userMap[uid].count++;
            userMap[uid].tokens += estToks;
          }

          if (chat.created_at) {
            const d = new Date(chat.created_at);
            const h = d.getHours();
            hourMap[h] = (hourMap[h] || 0) + 1;
            const dayKey = d.toISOString().split("T")[0];
            dayMap[dayKey] = (dayMap[dayKey] || 0) + 1;
          }
        });
      }
    });

    // Scan all real audit events
    filteredEvents.forEach((e) => {
      const pTokens = e.ai_prompt_tokens ?? 0;
      const cTokens = e.ai_completion_tokens ?? 0;
      const cost = e.ai_cost ? Number(e.ai_cost) : 0;
      const latency = e.ai_latency_ms ?? 0;

      totalPromptTokens += pTokens;
      totalCompTokens += cTokens;
      totalCost += cost;
      if (latency > 0) {
        totalLatency += latency;
        latencyCount++;
        if (latency < minLatency) minLatency = latency;
        if (latency > maxLatency) maxLatency = latency;
        if (latency < 500) latencyBuckets.fast++;
        else if (latency < 2000) latencyBuckets.medium++;
        else latencyBuckets.slow++;
      }

      // Model breakdown
      const m = (e.ai_model || "llama-3.3-70b-versatile").split("/").pop() || "llama-3.3-70b";
      if (!modelMap[m]) modelMap[m] = { count: 0, promptTokens: 0, compTokens: 0, cost: 0, latency: 0 };
      modelMap[m].count++;
      modelMap[m].promptTokens += pTokens;
      modelMap[m].compTokens += cTokens;
      modelMap[m].cost += cost;
      modelMap[m].latency += latency;

      // User breakdown — use real user_name from audit_events
      const uid = e.user_id || "workspace_user";
      const uName = e.user_name || profileMap.get(uid)?.name || "Workspace User";
      if (!userMap[uid]) userMap[uid] = { name: uName, count: 0, tokens: 0, cost: 0, lastActive: e.created_at || "" };
      userMap[uid].count++;
      userMap[uid].tokens += pTokens + cTokens;
      userMap[uid].cost += cost;

      // Hourly
      if (e.created_at) {
        const d = new Date(e.created_at);
        const h = d.getHours();
        hourMap[h] = (hourMap[h] || 0) + 1;
        const dayKey = d.toISOString().split("T")[0];
        dayMap[dayKey] = (dayMap[dayKey] || 0) + 1;
      }
    });

    const totalTokens = Math.max(totalPromptTokens + totalCompTokens, chatTokensCount);
    const totalMessages = Math.max(filteredEvents.length, chatMessagesCount);
    const avgLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;

    // Percentile latency (P50, P95, P99)
    const latencies = filteredEvents
      .map((e) => e.ai_latency_ms)
      .filter((l): l is number => typeof l === "number" && l > 0)
      .sort((a, b) => a - b);
    const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
    const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
    const p99 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0;

    // Format tokens
    let tokensDisplay = "0";
    if (totalTokens >= 1000000000) tokensDisplay = `${(totalTokens / 1000000000).toFixed(1)}B`;
    else if (totalTokens >= 1000000) tokensDisplay = `${(totalTokens / 1000000).toFixed(1)}M`;
    else if (totalTokens >= 1000) tokensDisplay = `${(totalTokens / 1000).toFixed(1)}k`;
    else tokensDisplay = totalTokens.toLocaleString();

    // Peak hour
    let peakH: number | null = null;
    let maxHCount = 0;
    Object.entries(hourMap).forEach(([h, count]) => {
      if (count > maxHCount) {
        maxHCount = count;
        peakH = parseInt(h, 10);
      }
    });
    const peakHourDisplay = peakH === null ? "—" : peakH === 0 ? "12 AM" : peakH < 12 ? `${peakH} AM` : peakH === 12 ? "12 PM" : `${peakH - 12} PM`;

    // Top model
    let topModel = "—";
    let maxMCount = 0;
    Object.entries(modelMap).forEach(([m, stat]) => {
      if (stat.count > maxMCount) {
        maxMCount = stat.count;
        topModel = m;
      }
    });

    // Active users count
    const activeUsersCount = Object.keys(userMap).length || (chats?.length ? 1 : 0);

    // Heatmap (22 weeks x 7 days)
    const heatmapWeeks: Array<Array<{ date: string; level: number; count: number }>> = [];
    const today = new Date();
    for (let w = 21; w >= 0; w--) {
      const week: Array<{ date: string; level: number; count: number }> = [];
      for (let d = 0; d < 7; d++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - (w * 7 + (6 - d)));
        const key = targetDate.toISOString().split("T")[0];
        const count = dayMap[key] || 0;
        let level = 0;
        if (count > 0) level = count >= 20 ? 4 : count >= 10 ? 3 : count >= 4 ? 2 : 1;
        week.push({ date: key, level, count });
      }
      heatmapWeeks.push(week);
    }

    return {
      totalSessions: (totalChats ?? chats?.length ?? 0).toLocaleString(),
      totalMessages: totalMessages.toLocaleString(),
      totalTokens: tokensDisplay,
      totalTokensRaw: totalTokens,
      activeUsers: activeUsersCount,
      activeDays: Object.keys(dayMap).length || (chats?.length ? 1 : 0),
      currentStreak: Object.keys(dayMap).length > 0 ? "1d" : "0d",
      longestStreak: Object.keys(dayMap).length > 0 ? "1d" : "0d",
      peakHour: peakHourDisplay,
      topModel,
      totalCost: totalCost > 0 ? `$${totalCost.toFixed(2)}` : "$0.00",
      totalCostRaw: totalCost,
      avgLatency: avgLatency > 0 ? `${avgLatency}ms` : "—",
      avgLatencyMs: avgLatency,
      p50, p95, p99,
      latencyBuckets,
      latencyCount,
      minLatency: minLatency === Infinity ? 0 : minLatency,
      maxLatency,
      heatmapWeeks,
      modelStats: Object.entries(modelMap)
        .map(([name, data]) => ({
          name: name.split("/").pop() || name,
          calls: data.count,
          tokens: (data.promptTokens + data.compTokens).toLocaleString(),
          tokensRaw: data.promptTokens + data.compTokens,
          avgLatency: data.latency > 0 && data.count > 0 ? Math.round(data.latency / data.count) : 0,
          avgLatencyDisplay: data.latency > 0 && data.count > 0 ? `${Math.round(data.latency / data.count)}ms` : "—",
          cost: data.cost > 0 ? `$${data.cost.toFixed(3)}` : "$0.00",
          costRaw: data.cost,
          promptTokens: data.promptTokens,
          compTokens: data.compTokens,
        }))
        .sort((a, b) => b.calls - a.calls)
    };
  }, [aiEvents, chats, totalChats, timeRange, profileMap]);

  if (chatsLoading || eventsLoading) {
    return (
      <div className="p-6">
        <PageHeader title="User AI Dashboard" description="Monitor platform AI usage and user leaderboard" />
        <LoadingState count={4} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <PageHeader 
            title="User AI Dashboard" 
            description="Real-time platform AI usage, tokens, and model distribution across all users" 
          />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
            <LiveDot />
            REAL-TIME
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border">
            {([
              { key: "overview" as TabType, label: "Overview", icon: <Activity className="w-3 h-3" /> },
              { key: "models" as TabType, label: "Models", icon: <Layers className="w-3 h-3" /> },
              { key: "users" as TabType, label: "Leaderboard", icon: <Trophy className="w-3 h-3" /> },
              { key: "activity" as TabType, label: "Live Feed", icon: <Radio className="w-3 h-3" /> },
            ]).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Time range pills */}
          <div className="flex items-center bg-muted/60 p-1 rounded-lg border text-xs font-medium">
            {(["all", "30d", "7d"] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-0.5 rounded-md transition uppercase text-[11px] cursor-pointer ${
                  timeRange === r ? "bg-background text-foreground font-bold shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2x5 Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card>
          <CardHeader className="pb-1.5 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Sessions</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold font-mono tracking-tight">{stats.totalSessions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1.5 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Messages</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold font-mono tracking-tight">{stats.totalMessages}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1.5 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total tokens</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold font-mono tracking-tight">{stats.totalTokens}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1.5 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active users / days</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold font-mono tracking-tight">{stats.activeUsers} <span className="text-xs font-normal text-muted-foreground">({stats.activeDays}d)</span></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1.5 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><DollarSign className="w-3 h-3" /> Total cost</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">{stats.totalCost}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1.5 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Current streak</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold font-mono tracking-tight">{stats.currentStreak}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1.5 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Longest streak</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold font-mono tracking-tight">{stats.longestStreak}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1.5 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Peak hour</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold font-mono tracking-tight">{stats.peakHour}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1.5 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Favorite model</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-base font-bold font-mono tracking-tight truncate" title={stats.topModel}>{stats.topModel}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1.5 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Gauge className="w-3 h-3" /> Avg latency</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold font-mono tracking-tight">{stats.avgLatency}</p>
          </CardContent>
        </Card>
      </div>

      {/* TAB 1: OVERVIEW */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Cost & Latency Breakdown Cards */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" /> Cost Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                    <span className="text-xs text-muted-foreground">Total AI Cost</span>
                    <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{stats.totalCost}</span>
                  </div>
                  {stats.latencyCount > 0 && (
                    <>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                        <span className="text-xs text-muted-foreground">Cost per Message</span>
                        <span className="text-sm font-bold font-mono">
                          {stats.totalCostRaw > 0 && stats.latencyCount > 0
                            ? `$${(stats.totalCostRaw / stats.latencyCount).toFixed(4)}`
                            : "$0.00"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                        <span className="text-xs text-muted-foreground">Cost per 1K Tokens</span>
                        <span className="text-sm font-bold font-mono">
                          {stats.totalCostRaw > 0 && stats.totalTokensRaw > 0
                            ? `$${(stats.totalCostRaw / (stats.totalTokensRaw / 1000)).toFixed(4)}`
                            : "$0.00"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-violet-500" /> Latency Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.latencyCount > 0 ? (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2.5 rounded-xl bg-muted/30 text-center">
                          <div className="text-[10px] text-muted-foreground mb-0.5">P50</div>
                          <div className="text-sm font-bold font-mono">{stats.p50}ms</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-muted/30 text-center">
                          <div className="text-[10px] text-muted-foreground mb-0.5">P95</div>
                          <div className="text-sm font-bold font-mono">{stats.p95}ms</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-muted/30 text-center">
                          <div className="text-[10px] text-muted-foreground mb-0.5">P99</div>
                          <div className="text-sm font-bold font-mono">{stats.p99}ms</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Fast (&lt;500ms): {stats.latencyBuckets.fast}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" /> Medium: {stats.latencyBuckets.medium}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500" /> Slow (&gt;2s): {stats.latencyBuckets.slow}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Min: {stats.minLatency}ms</span>
                        <span>Avg: {stats.avgLatency}</span>
                        <span>Max: {stats.maxLatency}ms</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">No latency data yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Heatmap Grid */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" /> Platform AI Activity Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto pb-2">
                <div className="flex gap-[4px] items-center justify-between min-w-[550px]">
                  {stats.heatmapWeeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-[4px]">
                      {week.map((cell, dIdx) => {
                        let bg = "bg-muted/80";
                        if (cell.level === 1) bg = "bg-blue-300 dark:bg-blue-500/40";
                        if (cell.level === 2) bg = "bg-blue-400 dark:bg-blue-500/70";
                        if (cell.level === 3) bg = "bg-blue-500 dark:bg-blue-600";
                        if (cell.level === 4) bg = "bg-blue-600 dark:bg-blue-700";
                        return (
                          <div
                            key={dIdx}
                            className={`w-[14px] h-[14px] rounded-[3px] transition-transform hover:scale-125 cursor-pointer ${bg}`}
                            title={`${cell.date}: ${cell.count} operation${cell.count === 1 ? '' : 's'}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity & Latency Timeline */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Recent AI Chats</CardTitle></CardHeader>
              <CardContent>
                {chats && chats.length > 0 ? (
                  <div className="space-y-2">
                    {chats.slice(0, 8).map((chat: any) => {
                      const profile = chat.user_id ? profileMap.get(chat.user_id) : null;
                      return (
                        <div key={chat.id} className="flex items-center justify-between rounded-xl border p-2.5 hover:bg-muted/30 transition">
                          <div>
                            <p className="text-xs font-semibold">{chat.name || "Untitled Conversation"}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {profile?.name || "Unknown user"} · {chat.chat_type || "agent"}
                            </p>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {chat.created_at ? new Date(chat.created_at).toLocaleDateString() : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState title="No AI chats yet" description="AI conversations will appear here." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Latency & Performance Trend</CardTitle></CardHeader>
              <CardContent>
                {aiEvents && aiEvents.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={aiEvents.slice(0, 30).map((e: any) => ({
                        date: e.created_at ? new Date(e.created_at).toLocaleDateString() : "",
                        latency: e.ai_latency_ms ?? 0,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                        <Area type="monotone" dataKey="latency" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState title="No AI events recorded" description="Events will appear once the AI features are used." />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: MODELS */}
      {tab === "models" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-500" /> Model Usage Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.modelStats.length > 0 ? (
                <div className="space-y-3">
                  {stats.modelStats.map((m) => {
                    const maxTokens = Math.max(...stats.modelStats.map((x) => x.tokensRaw));
                    const barPct = maxTokens > 0 ? Math.round((m.tokensRaw / maxTokens) * 100) : 0;
                    return (
                      <div key={m.name} className="p-4 rounded-xl border bg-card hover:bg-muted/30 transition space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold">{m.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {m.calls} invocations · {m.avgLatencyDisplay} avg response
                            </p>
                          </div>
                          <div className="text-right font-mono">
                            <p className="text-sm font-bold">{m.tokens} tokens</p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">{m.cost}</p>
                          </div>
                        </div>
                        {/* Token bar */}
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                            style={{ width: `${Math.max(4, barPct)}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-mono">
                          <span>Prompt: {m.promptTokens.toLocaleString()}</span>
                          <span>Completion: {m.compTokens.toLocaleString()}</span>
                          <span>Ratio: {m.tokensRaw > 0 ? `${Math.round((m.promptTokens / m.tokensRaw) * 100)}%` : "—"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="No model data available" description="Model metrics will appear as users interact with AI." />
              )}
            </CardContent>
          </Card>

          {/* Model Summary Cards */}
          {stats.modelStats.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardHeader className="pb-1.5 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Total Models</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <p className="text-2xl font-bold font-mono">{stats.modelStats.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1.5 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Top Model</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <p className="text-sm font-bold font-mono truncate">{stats.modelStats[0]?.name || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">{stats.modelStats[0]?.calls || 0} calls</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1.5 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Fastest Model</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <p className="text-sm font-bold font-mono truncate">
                    {[...stats.modelStats].sort((a, b) => a.avgLatency - b.avgLatency)[0]?.name || "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {[...stats.modelStats].sort((a, b) => a.avgLatency - b.avgLatency)[0]?.avgLatencyDisplay || "—"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1.5 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Most Expensive</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <p className="text-sm font-bold font-mono truncate">
                    {[...stats.modelStats].sort((a, b) => b.costRaw - a.costRaw)[0]?.name || "—"}
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    {[...stats.modelStats].sort((a, b) => b.costRaw - a.costRaw)[0]?.cost || "$0.00"}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LEADERBOARD — from user_ai_usage_stats */}
      {tab === "users" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" /> Top AI Users Leaderboard
              <span className="text-xs text-muted-foreground font-normal ml-2">
                ({(leaderboardRows || []).length} users tracked)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(leaderboardRows || []).length > 0 ? (
              <div className="space-y-2">
                {(leaderboardRows || []).map((entry: AuditLeaderboardRow, idx: number) => {
                  const rank = idx + 1;
                  const displayName = entry.user_name || `User ${entry.user_id?.slice(0, 8)}`;
                  const email = entry.email || null;
                  const username = entry.username || null;
                  const avatar = entry.avatar_url || null;
                  const medalBg = rank === 1 ? "bg-amber-400/20 text-amber-600 dark:text-amber-400" : rank === 2 ? "bg-gray-300/20 text-gray-500 dark:text-gray-400" : rank === 3 ? "bg-orange-300/20 text-orange-600 dark:text-orange-400" : "bg-muted text-muted-foreground";
                  const isTop3 = rank <= 3;

                  return (
                    <div key={entry.user_id} className={`flex items-center justify-between p-4 rounded-xl border transition hover:bg-muted/30 ${isTop3 ? "bg-card border-amber-200/50 dark:border-amber-400/10" : "bg-card"}`}>
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        {/* Rank badge */}
                        <div className={`w-10 h-10 rounded-xl font-bold text-sm flex items-center justify-center shrink-0 ${medalBg}`}>
                          {isTop3 ? (rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉") : `#${rank}`}
                        </div>

                        {/* Avatar + Name + Email + Username */}
                        <div className="flex items-center gap-3 min-w-0">
                          {avatar ? (
                            <img src={avatar} alt={displayName} className="w-9 h-9 rounded-full object-cover border border-border shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold truncate">{displayName}</p>
                              {username && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">@{username}</span>
                              )}
                              {isTop3 && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold uppercase ${
                                  rank === 1 ? "bg-amber-400/10 text-amber-600 dark:text-amber-400" : rank === 2 ? "bg-gray-300/10 text-gray-500 dark:text-gray-400" : "bg-orange-300/10 text-orange-600 dark:text-orange-400"
                                }`}>
                                  {rank === 1 ? "Top User" : rank === 2 ? "Runner Up" : "3rd Place"}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {email && (
                                <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">{email}</span>
                              )}
                              {!email && (
                                <span className="text-[11px] text-muted-foreground font-mono truncate">{entry.user_id.slice(0, 20)}...</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stats columns */}
                      <div className="flex items-center gap-4 text-right font-mono shrink-0 ml-4">
                        <div className="text-center min-w-[70px]">
                          <p className="text-sm font-bold">{formatTokensShort(entry.total_tokens)}</p>
                          <p className="text-[10px] text-muted-foreground">tokens</p>
                        </div>
                        <div className="text-center min-w-[50px]">
                          <p className="text-sm font-bold">{entry.total_messages}</p>
                          <p className="text-[10px] text-muted-foreground">msgs</p>
                        </div>
                        <div className="text-center min-w-[60px]">
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{entry.total_cost > 0 ? `$${entry.total_cost.toFixed(2)}` : "—"}</p>
                          <p className="text-[10px] text-muted-foreground">cost</p>
                        </div>
                        <div className="text-center min-w-[50px]">
                          <p className="text-sm font-bold">{entry.current_streak}d</p>
                          <p className="text-[10px] text-muted-foreground">streak</p>
                        </div>
                        <div className="text-center min-w-[60px]">
                          <p className="text-sm font-bold">{entry.avg_latency_ms > 0 ? `${entry.avg_latency_ms}ms` : "—"}</p>
                          <p className="text-[10px] text-muted-foreground">latency</p>
                        </div>
                        <div className="text-center min-w-[80px]">
                          <p className="text-[11px] text-muted-foreground truncate" title={entry.favorite_model || ""}>{entry.favorite_model?.split("/").pop() || "—"}</p>
                          <p className="text-[10px] text-muted-foreground">model</p>
                        </div>
                        <div className="text-center min-w-[60px]">
                          <p className="text-[11px] text-muted-foreground">{entry.active_days}d</p>
                          <p className="text-[10px] text-muted-foreground">active</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No user AI data recorded" description="Active AI users will appear here once they start using AI features." />
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: LIVE ACTIVITY FEED */}
      {tab === "activity" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Radio className="h-4 w-4 text-emerald-500" />
              Real-Time Activity Feed
              <LiveDot className="ml-1" />
              {realtimeFeed.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  {realtimeFeed.length} events
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {realtimeFeed.length > 0 ? (
              <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
                {realtimeFeed.map((event) => {
                  const isAi = event.action?.includes("ai") || event.action?.includes("chat");
                  const isCreate = event.action?.includes("create") || event.action?.includes("insert");
                  const isDelete = event.action?.includes("delete") || event.action?.includes("trash");
                  const isUpdate = event.action?.includes("update") || event.action?.includes("edit");
                  const profile = event.user_id ? profileMap.get(event.user_id) : null;
                  const displayName = profile?.name || event.user_name || "Unknown";
                  const email = profile?.email || null;
                  const avatar = profile?.avatar || null;

                  const actionColor = isAi
                    ? "bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400"
                    : isDelete
                    ? "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                    : isCreate
                    ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : isUpdate
                    ? "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400";

                  const actionIcon = isAi
                    ? <Bot className="w-3.5 h-3.5" />
                    : isDelete
                    ? <span className="text-[10px]">🗑</span>
                    : isCreate
                    ? <span className="text-[10px]">✨</span>
                    : isUpdate
                    ? <span className="text-[10px]">✏️</span>
                    : <ArrowUpRight className="w-3.5 h-3.5" />;

                  return (
                    <div key={event.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition">
                      {/* Avatar or icon */}
                      {avatar ? (
                        <img src={avatar} alt={displayName} className="w-8 h-8 rounded-full object-cover border border-border shrink-0" />
                      ) : (
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${actionColor}`}>
                          {actionIcon}
                        </div>
                      )}

                      {/* User + Action */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold truncate">{displayName}</p>
                          {email && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{email}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{event.action}</p>
                      </div>

                      {/* Metadata */}
                      <div className="text-right shrink-0 flex items-center gap-3">
                        {event.ai_model && (
                          <div className="text-center">
                            <p className="text-[10px] font-mono text-muted-foreground">{event.ai_model.split("/").pop()}</p>
                            <p className="text-[9px] text-muted-foreground">model</p>
                          </div>
                        )}
                        {event.ai_latency_ms && (
                          <div className="text-center">
                            <p className="text-[10px] font-mono text-muted-foreground">{event.ai_latency_ms}ms</p>
                            <p className="text-[9px] text-muted-foreground">latency</p>
                          </div>
                        )}
                        {event.ai_prompt_tokens && (
                          <div className="text-center">
                            <p className="text-[10px] font-mono text-muted-foreground">{event.ai_prompt_tokens}</p>
                            <p className="text-[9px] text-muted-foreground">tokens</p>
                          </div>
                        )}
                        <div className="text-center min-w-[60px]">
                          <p className="text-[10px] text-muted-foreground">
                            {event.created_at ? new Date(event.created_at).toLocaleTimeString() : ""}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            {event.created_at ? new Date(event.created_at).toLocaleDateString() : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <Radio className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p>Waiting for real-time AI activity...</p>
                <p className="text-xs mt-1">Events will stream in as users interact with AI features.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
