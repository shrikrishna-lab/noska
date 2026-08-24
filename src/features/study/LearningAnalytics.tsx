/* ─── Learning analytics ───
 *
 * Deterministic insights computed from the same block.review metadata
 * the review queue reads — no extra persistence, nothing simulated.
 * Mounted as the "Insights" tab of the study session and reusable
 * anywhere pages are available.
 */

import { useMemo, type ReactNode } from 'react';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Flame,
  CalendarClock,
  AlertTriangle,
  Target,
  Lightbulb,
  BarChart3,
} from "lucide-react";
import { isBlockDue, type ReviewState } from "../spaced/scheduler";

const DAY_MS = 86_400_000;

interface PageLike {
  id: string;
  title?: string;
  trashed?: boolean;
  tags?: unknown[];
  blocks?: Array<Record<string, unknown>>;
}

export interface TopicStat {
  topic: string;
  cards: number;
  struggling: number;
  due: number;
  avgEase: number;
}

export interface Analytics {
  totalCards: number;
  suspended: number;
  dueNow: number;
  overdue: number;
  reviewedToday: number;
  reviewedThisWeek: number;
  /** % of answered ratings that were Hard-or-better (quality ≥ 3). */
  retention: number;
  avgEase: number;
  masteryPct: number;
  streakDays: number;
  forecast: Array<{ day: string; count: number }>;
  weakTopics: TopicStat[];
  strongTopics: TopicStat[];
  recommendations: Array<{ icon: "danger" | "insight" | "target" | "trend"; text: string }>;
}

function topicLabelFor(page: PageLike): string {
  const tags = Array.isArray(page.tags) ? page.tags.filter((t): t is string => typeof t === "string") : [];
  if (tags.length > 0) return tags[0];
  return page.title?.trim() || "Untitled";
}

/** A card is "struggling" when its ease has been ground down or its last
 * answer was Again/Hard — the SM-2 signals of weak memory. */
function isStruggling(review: ReviewState): boolean {
  if ((review.easeFactor ?? 2.5) < 2.35) return true;
  if (typeof review.quality === "number" && review.quality > 0 && review.quality < 3) return true;
  return false;
}

export function computeAnalytics(pages: PageLike[], nowMs: number = Date.now()): Analytics {
  interface CardEntry {
    page: PageLike;
    review: ReviewState;
  }
  const cards: CardEntry[] = [];
  let suspended = 0;

  for (const page of pages) {
    if (page.trashed) continue;
    for (const raw of page.blocks ?? []) {
      const review = raw?.review as ReviewState | undefined;
      if (!review) continue;
      if (review.suspended) {
        suspended += 1;
        continue;
      }
      cards.push({ page, review });
    }
  }

  const startOfToday = new Date(nowMs);
  startOfToday.setHours(0, 0, 0, 0);
  const todayStart = startOfToday.getTime();

  let overdue = 0;
  let dueNow = 0;
  let reviewedToday = 0;
  let reviewedThisWeek = 0;
  let easeSum = 0;
  let ratedCards = 0;
  let correctCards = 0;
  let mastered = 0;
  const reviewDays = new Set<string>();
  const forecastBuckets = new Map<number, number>();

  for (const { review } of cards) {
    const nextMs = review.nextReview ? new Date(review.nextReview).getTime() : 0;
    if (!review.nextReview || nextMs <= nowMs) {
      dueNow += 1;
      if (nextMs && nextMs < todayStart) overdue += 1;
    }
    const lastMs = review.lastReview ? new Date(review.lastReview).getTime() : 0;
    if (lastMs >= todayStart) {
      reviewedToday += 1;
      reviewDays.add(new Date(lastMs).toDateString());
    }
    if (lastMs >= nowMs - 7 * DAY_MS) reviewedThisWeek += 1;
    if (typeof review.easeFactor === "number") {
      easeSum += review.easeFactor;
      ratedCards += 1;
    }
    if (typeof review.quality === "number" && review.quality > 0) {
      if (review.quality >= 3) correctCards += 1;
    }
    if ((review.repetition ?? 0) >= 3) mastered += 1;
    // Future workload: only count not-yet-due cards.
    if (nextMs > nowMs) {
      const dayIndex = Math.floor((nextMs - todayStart) / DAY_MS);
      if (dayIndex >= 0 && dayIndex < 7) {
        forecastBuckets.set(dayIndex, (forecastBuckets.get(dayIndex) ?? 0) + 1);
      }
    }
  }

  /* Streak: consecutive days with ≥1 review. If today has none yet the
     chain may still be alive through yesterday. */
  let streakDays = 0;
  const reviewedTodayKey = reviewDays.has(new Date(todayStart).toDateString());
  const cursorStart = reviewedTodayKey ? 0 : reviewDays.has(new Date(todayStart - DAY_MS).toDateString()) ? 1 : -1;
  if (cursorStart >= 0) {
    for (let i = cursorStart; i < 365; i++) {
      const dayKey = new Date(todayStart - i * DAY_MS).toDateString();
      if (reviewDays.has(dayKey)) streakDays += 1;
      else break;
    }
  }

  /* Topics */
  const topicMap = new Map<string, { cards: number; struggling: number; due: number; easeSum: number }>();
  for (const { page, review } of cards) {
    const label = topicLabelFor(page);
    const t = topicMap.get(label) ?? { cards: 0, struggling: 0, due: 0, easeSum: 0 };
    t.cards += 1;
    t.easeSum += review.easeFactor ?? 2.5;
    if (!review.nextReview || new Date(review.nextReview).getTime() <= nowMs) t.due += 1;
    if (isStruggling(review)) t.struggling += 1;
    topicMap.set(label, t);
  }
  const topics: TopicStat[] = [...topicMap.entries()]
    .map(([topic, t]) => ({
      topic,
      cards: t.cards,
      struggling: t.struggling,
      due: t.due,
      avgEase: Math.round((t.easeSum / t.cards) * 100) / 100,
    }))
    .sort((a, b) => b.struggling / b.cards - a.struggling / a.cards || a.avgEase - b.avgEase);

  const weakTopics = topics.filter((t) => t.struggling > 0).slice(0, 3);
  const strongTopics = [...topics]
    .sort((a, b) => b.avgEase - a.avgEase)
    .filter((t) => t.struggling === 0)
    .slice(0, 3);

  /* Forecast labels */
  const forecast = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayStart + i * DAY_MS);
    return {
      day: i === 0 ? "Today" : d.toLocaleDateString(undefined, { weekday: "short" }),
      count: forecastBuckets.get(i) ?? 0,
    };
  });

  /* Recommendations */
  const recommendations: Analytics["recommendations"] = [];
  if (overdue > 0) {
    recommendations.push({
      icon: "danger",
      text: `${overdue} card${overdue === 1 ? "" : "s"} past due — clear these first to stop the backlog growing.`,
    });
  }
  if (weakTopics.length > 0) {
    const w = weakTopics[0];
    recommendations.push({
      icon: "target",
      text: `${w.topic} is your weakest topic — ${w.struggling} of ${w.cards} cards are struggling${w.due > 0 ? ` and ${w.due} are due now` : ""}. Re-read that page before rating.`,
    });
  }
  const busiest = forecast.reduce((best, f, i) => (f.count > (forecast[best]?.count ?? 0) ? i : best), 0);
  if ((forecast[busiest]?.count ?? 0) >= 10 && busiest > 0) {
    recommendations.push({
      icon: "trend",
      text: `${forecast[busiest].count} cards land on ${forecast[busiest].day}. Reviewing a few early keeps future days light.`,
    });
  }
  if (cards.length > 0 && reviewedToday === 0 && dueNow > 0) {
    recommendations.push({ icon: "insight", text: `${dueNow} card${dueNow === 1 ? "" : "s"} ready — a ${Math.min(dueNow, 15)}-card session takes about ${Math.max(2, Math.round(Math.min(dueNow, 15) * 0.4))} minutes.` });
  }
  if (cards.length > 0 && mastered / cards.length >= 0.6) {
    recommendations.push({
      icon: "insight",
      text: `${Math.round((mastered / cards.length) * 100)}% of your cards are long-interval. Time to add new material.`,
    });
  }

  return {
    totalCards: cards.length,
    suspended,
    dueNow,
    overdue,
    reviewedToday,
    reviewedThisWeek,
    retention: correctCards > 0 ? Math.round((correctCards / correctAndRated(cards)) * 100) : 0,
    avgEase: ratedCards > 0 ? Math.round((easeSum / ratedCards) * 100) / 100 : 2.5,
    masteryPct: cards.length > 0 ? Math.round((mastered / cards.length) * 100) : 0,
    streakDays,
    forecast,
    weakTopics,
    strongTopics,
    recommendations,
  };
}

/** Denominator for retention: every card that carries at least one rating. */
function correctAndRated(cards: Array<{ review: ReviewState }>): number {
  return cards.filter(({ review }) => typeof review.quality === "number" && review.quality > 0).length;
}

/* ═══ UI ═══ */

const BAR_MAX = 24;

export default function LearningAnalytics({ pages }: { pages: PageLike[] }) {
  const a = useMemo(() => computeAnalytics(pages), [pages]);

  if (a.totalCards === 0) {
    return (
      <div className="py-8 text-center">
        <Brain size={22} className="mx-auto mb-2 text-[var(--muted)]" />
        <p className="text-sm font-medium text-[var(--secondary)]">No analytics yet</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Add your first study card — right-click any block → “Add to review”.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 overflow-y-auto max-h-[480px] pr-1">
      {/* Top metrics */}
      <div className="grid grid-cols-3 gap-2.5">
        <Metric icon={Flame} label="Streak" value={`${a.streakDays}d`} tone="warning" />
        <Metric icon={Target} label="Retention" value={`${a.retention}%`} tone="success" />
        <Metric icon={TrendingUp} label="Mastery" value={`${a.masteryPct}%`} tone="accent" />
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <Metric icon={CalendarClock} label="Due now" value={a.dueNow} tone={a.dueNow > 0 ? "danger" : "muted"} />
        <Metric icon={AlertTriangle} label="Overdue" value={a.overdue} tone={a.overdue > 0 ? "danger" : "muted"} />
        <Metric icon={BarChart3} label="Avg ease" value={a.avgEase.toFixed(2)} tone="muted" />
      </div>

      {/* Workload forecast */}
      <div>
        <SectionLabel>Next 7 days</SectionLabel>
        <div className="flex items-end gap-1.5 h-20 mt-2">
          {a.forecast.map((f, i) => {
            const h = Math.max(4, Math.round((f.count / BAR_MAX) * 64));
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className={`text-[9px] font-semibold ${f.count > 15 ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>
                  {f.count || ""}
                </span>
                <div
                  className={`w-full rounded-t-md ${f.count > 15 ? "bg-[var(--danger)]/70" : i === 0 ? "bg-[var(--accent)]" : "bg-[var(--accent)]/45"}`}
                  style={{ height: `${f.count ? h : 3}px` }}
                />
                <span className="text-[9px] text-[var(--muted)]">{f.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      {a.recommendations.length > 0 && (
        <div>
          <SectionLabel>Recommendations</SectionLabel>
          <div className="space-y-1.5 mt-2">
            {a.recommendations.map((r, i) => {
              const Icon = r.icon === "danger" ? AlertTriangle : r.icon === "target" ? Target : r.icon === "trend" ? TrendingDown : Lightbulb;
              return (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-[var(--surface)] p-2.5 text-xs leading-relaxed text-[var(--secondary)]">
                  <Icon size={13} className={`mt-0.5 shrink-0 ${r.icon === "danger" ? "text-[var(--danger)]" : "text-[var(--accent)]"}`} />
                  <span>{r.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weak / strong topics */}
      {(a.weakTopics.length > 0 || a.strongTopics.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {a.weakTopics.length > 0 && (
            <div>
              <SectionLabel>
                <span className="inline-flex items-center gap-1"><TrendingDown size={10} /> Weakest topics</span>
              </SectionLabel>
              <div className="space-y-1 mt-2">
                {a.weakTopics.map((t) => (
                  <TopicRow key={t.topic} topic={t} tone="danger" />
                ))}
              </div>
            </div>
          )}
          {a.strongTopics.length > 0 && (
            <div>
              <SectionLabel>
                <span className="inline-flex items-center gap-1"><TrendingUp size={10} /> Strongest topics</span>
              </SectionLabel>
              <div className="space-y-1 mt-2">
                {a.strongTopics.map((t) => (
                  <TopicRow key={t.topic} topic={t} tone="success" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-center text-[10px] text-[var(--muted)]">
        {a.totalCards} active card{a.totalCards === 1 ? "" : "s"} · {a.reviewedToday} reviewed today · {a.reviewedThisWeek} this week
        {a.suspended > 0 ? ` · ${a.suspended} suspended` : ""}
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">{children}</div>
  );
}

const TONE_CLASSES = {
  accent: "text-[var(--accent)]",
  success: "text-[var(--success)]",
  warning: "text-[var(--warning)]",
  danger: "text-[var(--danger)]",
  muted: "text-[var(--secondary)]",
} as const;

function Metric({ icon: Icon, label, value, tone }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  tone: keyof typeof TONE_CLASSES;
}) {
  return (
    <div className="rounded-xl bg-[var(--surface)] p-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon size={12} className={TONE_CLASSES[tone]} />
        <span className="truncate text-[9px] font-medium uppercase tracking-wider text-[var(--muted)]">{label}</span>
      </div>
      <div className={`text-xl font-bold ${TONE_CLASSES[tone]}`}>{value}</div>
    </div>
  );
}

function TopicRow({ topic, tone }: { topic: TopicStat; tone: "danger" | "success" }) {
  return (
    <div className="rounded-lg bg-[var(--surface)] px-2.5 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-[var(--text)]">{topic.topic}</span>
        <span className={`shrink-0 font-mono text-[10px] font-bold ${TONE_CLASSES[tone]}`}>
          {tone === "danger" ? topic.avgEase.toFixed(2) : `${Math.round(topic.avgEase * 40)}%`}
        </span>
      </div>
      <div className="text-[9px] text-[var(--muted)]">
        {topic.cards} card{topic.cards === 1 ? "" : "s"}
        {tone === "danger" ? ` · ${topic.struggling} struggling${topic.due > 0 ? ` · ${topic.due} due` : ""}` : ""}
      </div>
    </div>
  );
}
