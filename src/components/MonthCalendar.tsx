import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, CheckSquare, Clock, ExternalLink, Layers } from "lucide-react";
import type { Page } from "../lib/supabaseService";
import { PageIcon } from "./PageIcon";
import { plainText, timeAgo } from "../utils/helpers";

interface MonthCalendarProps {
  pages: Page[];
  onSelect?: (pageId: string) => void;
  compact?: boolean;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface ReviewState {
  nextReview?: string;
}

interface ReviewItem {
  pageId: string;
  pageTitle: string;
  pageIcon: string;
  text: string;
  nextReview: string;
}

/** Build a real calendar month grid for a given month (cells for the
 * leading empty weekday slots, then days 1..daysInMonth). Today is only
 * highlighted when it falls inside the viewed month. */
export function buildMonthGrid(year: number, month: number, today = new Date()) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isSameMonth = today.getFullYear() === year && today.getMonth() === month;

  const cells: Array<{ day: number; isToday: boolean } | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, isToday: isSameMonth && d === today.getDate() });

  return { year, month, daysInMonth, cells };
}

/** Pages grouped by the local day-of-month of their `updatedAt`, for a
 * specific month — a page only lands on a cell if it was last edited in
 * that month. */
function byDayOfMonth(pages: Page[], year: number, month: number) {
  const map = new Map<number, Page[]>();
  for (const p of pages) {
    const date = new Date(p.updatedAt as string);
    if (!date.getTime()) continue;
    if (date.getFullYear() !== year || date.getMonth() !== month) continue;
    const arr = map.get(date.getDate()) || [];
    arr.push(p);
    map.set(date.getDate(), arr);
  }
  return map;
}

export default function MonthCalendar({ pages, onSelect, compact = false }: MonthCalendarProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [liveNow, setLiveNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setLiveNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const { cells } = useMemo(() => buildMonthGrid(viewYear, viewMonth, liveNow), [viewYear, viewMonth, liveNow]);
  const byDay = useMemo(() => byDayOfMonth(pages, viewYear, viewMonth), [pages, viewYear, viewMonth]);

  const selectedPages = selectedDay ? byDay.get(selectedDay) || [] : [];

  const stats = useMemo(() => {
    const nowIso = liveNow.toISOString();
    let pagesThisMonth = 0;
    let pagesToday = 0;
    let openTasks = 0;
    let reviewsDue = 0;
    for (const p of pages) {
      if (p.trashed) continue;
      const upd = new Date(p.updatedAt as string);
      if (upd.getFullYear() === liveNow.getFullYear() && upd.getMonth() === liveNow.getMonth()) pagesThisMonth++;
      if (upd.toDateString() === liveNow.toDateString()) pagesToday++;
      for (const b of p.blocks || []) {
        if (b.type === "todo" && !b.checked) openTasks++;
        const review = b.review as ReviewState | undefined;
        if (review && (!review.nextReview || review.nextReview <= nowIso)) reviewsDue++;
      }
    }
    return { pagesThisMonth, pagesToday, openTasks, reviewsDue };
  }, [pages, liveNow]);

  const upcomingReviews = useMemo(() => {
    const items: ReviewItem[] = [];
    const nowIso = liveNow.toISOString();
    const horizon = new Date(liveNow);
    horizon.setDate(horizon.getDate() + 7);
    for (const p of pages) {
      if (p.trashed) continue;
      for (const b of p.blocks || []) {
        const review = b.review as ReviewState | undefined;
        if (!review || !review.nextReview) continue;
        const when = new Date(review.nextReview);
        if (when <= horizon) {
          items.push({
            pageId: p.id,
            pageTitle: p.title || "Untitled",
            pageIcon: p.icon,
            text: (b.text || "").slice(0, 40),
            nextReview: review.nextReview
          });
        }
      }
    }
    return items.sort((a, b) => new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime()).slice(0, 6);
  }, [pages, liveNow]);

  const weekAhead = useMemo(() => {
    const days: Array<{ date: Date; pages: Page[] }> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(liveNow);
      d.setDate(d.getDate() + i);
      days.push({
        date: d,
        pages: pages.filter((p) => {
          const upd = new Date(p.updatedAt as string);
          return upd.toDateString() === d.toDateString() && !p.trashed;
        })
      });
    }
    return days;
  }, [pages, liveNow]);

  /* ─── Calendar intelligence ───
   * Forward study load for the selected future day: how many review cards
   * land between now and that day, which topics are weakest among them,
   * and what a sensible daily pace looks like. Deterministic — computed
   * from real scheduling state, no AI, no invented dates. */
  const studyLoad = useMemo(() => {
    if (selectedDay === null) return null;
    const selected = new Date(viewYear, viewMonth, selectedDay, 23, 59, 59);
    const daysAway = Math.ceil((selected.getTime() - liveNow.getTime()) / 86_400_000);
    if (daysAway <= 0) return null;

    interface ReviewFull { nextReview?: string; suspended?: boolean; easeFactor?: number }
    const topics = new Map<string, { label: string; pageId: string; pageIcon: string; cards: number; struggling: number }>();
    let cardsLanding = 0;

    for (const p of pages) {
      if (p.trashed) continue;
      const tags = Array.isArray(p.tags) ? p.tags.filter((t): t is string => typeof t === "string") : [];
      const label = tags[0] || p.title || "Untitled";
      for (const b of p.blocks || []) {
        const review = b.review as ReviewFull | undefined;
        if (!review || review.suspended || !review.nextReview) continue;
        const when = new Date(review.nextReview).getTime();
        if (when > selected.getTime() || when < new Date(liveNow).setHours(0, 0, 0, 0)) continue;
        cardsLanding += 1;
        const t = topics.get(label) ?? { label, pageId: p.id, pageIcon: p.icon, cards: 0, struggling: 0 };
        t.cards += 1;
        if ((review.easeFactor ?? 2.5) < 2.35) t.struggling += 1;
        topics.set(label, t);
      }
    }

    const topTopics = [...topics.values()].sort((a, b) => b.struggling - a.struggling || b.cards - a.cards).slice(0, 3);
    return {
      daysAway,
      cardsLanding,
      dailyPace: Math.ceil(cardsLanding / daysAway),
      heavy: cardsLanding / daysAway > 15,
      topTopics,
    };
  }, [selectedDay, viewYear, viewMonth, pages, liveNow]);

  const prevMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const nextMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };
  const goToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setSelectedDay(null);
  };

  const todayPage = (() => {
    const t = new Date();
    return MONTHS[t.getMonth()] + " " + t.getDate() + ", " + t.getFullYear();
  })();

  if (compact) {
    return (
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {w}
          </div>
        ))}
        {cells.map((cell, i) =>
          cell ? (
            <div
              key={i}
              className={`min-h-12 rounded-md border p-1 ${
                cell.isToday
                  ? "border-[var(--accent)] bg-[var(--accent)]/10"
                  : "border-[var(--border)] bg-[var(--panel)]"
              }`}
            >
              <div className={`${cell.isToday ? "font-bold text-[var(--accent)]" : "text-[var(--muted)]"} text-[10px]`}>
                {cell.day}
              </div>
              <div className="mt-0.5 space-y-0.5">
                {(byDay.get(cell.day) || []).slice(0, 2).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onSelect?.(p.id)}
                    className="flex w-full items-center gap-1 truncate rounded bg-[var(--surface)] px-1 py-0.5 text-left text-[9.5px] text-[var(--text)] hover:bg-[var(--hover)]"
                  >
                    <PageIcon icon={p.icon} size={9} fallback="📄" />
                    <span className="truncate">{p.title || "Untitled"}</span>
                  </button>
                ))}
                {(byDay.get(cell.day) || []).length > 2 && (
                  <div className="px-1 text-[9px] text-[var(--muted)]">
                    +{(byDay.get(cell.day) || []).length - 2} more
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div key={i} />
          )
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: month title + navigation */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-bold tracking-tight text-[var(--text)]">
            <CalendarDays size={16} className="shrink-0 text-[var(--accent)]" />
            {MONTHS[viewMonth]} {viewYear}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live · {todayPage}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            title="Previous month"
            className="grid h-7 w-7 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={goToday}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            title="Next month"
            className="grid h-7 w-7 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Real-time stats strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
          <div className="text-lg font-bold text-[var(--text)]">{stats.pagesThisMonth}</div>
          <div className="text-[10px] text-[var(--muted)]">Pages this month</div>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
          <div className="text-lg font-bold text-[var(--text)]">{stats.pagesToday}</div>
          <div className="text-[10px] text-[var(--muted)]">Edited today</div>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
          <div className="flex items-center gap-1 text-lg font-bold text-[var(--text)]">
            <CheckSquare size={15} className="text-[var(--secondary)]" />
            {stats.openTasks}
          </div>
          <div className="text-[10px] text-[var(--muted)]">Open tasks</div>
        </div>
        <div className={`rounded-md border px-3 py-2 ${stats.reviewsDue > 0 ? "border-[var(--danger)]/50 bg-[var(--danger)]/10" : "border-[var(--border)] bg-[var(--surface)]"}`}>
          <div className="text-lg font-bold text-[var(--text)]">{stats.reviewsDue}</div>
          <div className="text-[10px] text-[var(--muted)]">Reviews due</div>
        </div>
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {w}
          </div>
        ))}
        {cells.map((cell, i) =>
          cell ? (
            <div
              key={i}
              onClick={() => setSelectedDay(selectedDay === cell.day ? null : cell.day)}
              className={`min-h-28 cursor-pointer rounded-md border p-2 transition-colors ${
                cell.isToday
                  ? "border-[var(--accent)] bg-[var(--accent)]/10"
                  : selectedDay === cell.day
                  ? "border-[var(--accent)] bg-[var(--hover)]"
                  : "border-[var(--border)] bg-[var(--panel)] hover:border-[var(--accent)]/50"
              }`}
            >
              <div className={`${cell.isToday ? "font-bold text-[var(--accent)]" : "text-[var(--muted)]"} text-xs`}>
                {cell.day}
              </div>
              <div className="mt-1 space-y-0.5">
                {(byDay.get(cell.day) || []).slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect?.(p.id);
                    }}
                    className="flex w-full items-center gap-1 truncate rounded bg-[var(--surface)] px-1.5 py-1 text-left text-xs text-[var(--text)] hover:bg-[var(--hover)]"
                  >
                    <PageIcon icon={p.icon} size={12} fallback="📄" />
                    <span className="truncate">{p.title || "Untitled"}</span>
                  </button>
                ))}
                {(byDay.get(cell.day) || []).length > 3 && (
                  <div className="px-1 text-[10px] text-[var(--muted)]">
                    +{(byDay.get(cell.day) || []).length - 3} more
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div key={i} />
          )
        )}
      </div>

      {/* Day detail panel */}
      {selectedDay !== null && (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
              <Layers size={14} className="text-[var(--accent)]" />
              {WEEKDAYS[new Date(viewYear, viewMonth, selectedDay).getDay()]}, {MONTHS[viewMonth]} {selectedDay}
              {new Date(viewYear, viewMonth, selectedDay).toDateString() === liveNow.toDateString() && (
                <span className="rounded bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-medium text-white">Today</span>
              )}
            </div>
            <div className="text-[10px] text-[var(--muted)]">{selectedPages.length} page{selectedPages.length !== 1 ? "s" : ""}</div>
          </div>
          {selectedPages.length === 0 ? (
            <div className="mt-2 flex items-center gap-2 rounded bg-[var(--panel)] px-3 py-2.5 text-xs text-[var(--muted)]">
              <Clock size={13} />
              No pages edited on this day. Open a page and edit it to pin it here.
            </div>
          ) : (
            <div className="mt-2 space-y-1.5">
              {selectedPages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelect?.(p.id)}
                  className="flex w-full items-start gap-2 rounded bg-[var(--panel)] px-3 py-2 text-left hover:bg-[var(--hover)]"
                >
                  <PageIcon icon={p.icon} size={14} fallback="📄" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-medium text-[var(--text)]">{p.title || "Untitled"}</span>
                      <span className="shrink-0 text-[10px] text-[var(--muted)]">{timeAgo(p.updatedAt)}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-[var(--secondary)]">
                      {plainText(p).slice(0, 80) || "Empty page"}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--muted)]">
                      <span>{p.blocks?.length || 0} blocks</span>
                      {p.favorite && <span>★</span>}
                    </div>
                  </div>
                  <ExternalLink size={12} className="mt-1 shrink-0 text-[var(--muted)]" />
                </button>
              ))}
            </div>
          )}
          {/* Forward study load — shown when planning against a future day */}
          {studyLoad && (
            <div className={`mt-2 rounded-md border p-3 ${studyLoad.heavy ? "border-[var(--warning)]/40 bg-[var(--warning)]/[0.06]" : "border-[var(--border)] bg-[var(--panel)]"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[var(--text)]">
                  Study load · {studyLoad.daysAway} day{studyLoad.daysAway === 1 ? "" : "s"} out
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${studyLoad.heavy ? "bg-[var(--warning)]/15 text-[var(--warning)]" : "bg-[var(--hover)] text-[var(--secondary)]"}`}>
                  {studyLoad.cardsLanding} card{studyLoad.cardsLanding === 1 ? "" : "s"} land before this day
                </span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--secondary)]">
                Pace it: ~{studyLoad.dailyPace} card{studyLoad.dailyPace === 1 ? "" : "s"}/day keeps you even.
                {studyLoad.heavy && " That's a heavy window — start weak topics early."}
              </p>
              {studyLoad.topTopics.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {studyLoad.topTopics.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => onSelect?.(t.pageId)}
                      className="flex items-center gap-1 rounded bg-[var(--surface)] px-2 py-1 text-[10px] font-medium text-[var(--text)] hover:bg-[var(--hover)]"
                      title={`${t.cards} cards landing${t.struggling ? ` · ${t.struggling} struggling` : ""}`}
                    >
                      <PageIcon icon={t.pageIcon} size={9} fallback="📄" />
                      {t.label}
                      {t.struggling > 0 && <span className="font-bold text-[var(--danger)]">{t.struggling}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Next 7 days agenda */}
      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          <CalendarDays size={13} />
          Next 7 days
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekAhead.map((d) => (
            <div key={d.date.toDateString()} className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-1.5">
              <div className={`text-center text-[10px] font-semibold ${d.date.toDateString() === liveNow.toDateString() ? "text-[var(--accent)]" : "text-[var(--text)]"}`}>
                {WEEKDAYS[d.date.getDay()].slice(0, 2)}
              </div>
              <div className={`text-center text-[10px] ${d.date.toDateString() === liveNow.toDateString() ? "font-bold text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                {d.date.getDate()}
              </div>
              <div className="mt-1 space-y-0.5">
                {d.pages.slice(0, 2).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onSelect?.(p.id)}
                    className="flex w-full items-center gap-0.5 truncate rounded bg-[var(--surface)] px-1 py-0.5 text-left text-[9px] text-[var(--text)] hover:bg-[var(--hover)]"
                  >
                    <PageIcon icon={p.icon} size={8} fallback="📄" />
                    <span className="truncate">{p.title || "Untitled"}</span>
                  </button>
                ))}
                {d.pages.length > 2 && <div className="px-1 text-[9px] text-[var(--muted)]">+{d.pages.length - 2}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming reviews */}
      {upcomingReviews.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            <Clock size={13} />
            Upcoming reviews
          </div>
          <div className="space-y-1">
            {upcomingReviews.map((r, i) => (
              <button
                key={`${r.pageId}-${i}`}
                onClick={() => onSelect?.(r.pageId)}
                className="flex w-full items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left hover:bg-[var(--hover)]"
              >
                <PageIcon icon={r.pageIcon} size={13} fallback="📄" />
                <div className="min-w-0 flex-1 truncate text-xs text-[var(--text)]">
                  <span className="font-medium">{r.pageTitle}</span>
                  {r.text && <span className="text-[var(--secondary)]"> · {r.text}</span>}
                </div>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                    new Date(r.nextReview) <= liveNow ? "bg-[var(--danger)]/15 text-[var(--danger)]" : "bg-[var(--hover)] text-[var(--secondary)]"
                  }`}
                >
                  {new Date(r.nextReview) <= liveNow ? "due" : timeAgo(r.nextReview)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}