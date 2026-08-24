/**
 * Noska Intelligence — Schedule Engine
 *
 * Parses human schedule descriptions into ScheduleSpec and evaluates when a
 * schedule is due. Pure functions — no timers here (the SchedulerService in
 * schedulerService.ts drives evaluation on an interval while the app is open).
 */

import type { ScheduleSpec, TriggerSpec } from "./types";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function parseSchedule(text: string): ScheduleSpec | null {
  const t = (text || "").toLowerCase().trim();
  if (!t) return null;

  // "every day at 8am" / "daily at 08:00"
  let m = t.match(/(?:every\s+day|daily|each\s+day)(?:\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/);
  if (m) return { kind: "every_day", ...extractTime(m[1], m[2], m[3]) };

  // "every weekday at 8am" / "weekdays at 9:30"
  m = t.match(/(?:every\s+weekdays?|weekdays)(?:\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/);
  if (m) return { kind: "every_weekday", ...extractTime(m[1], m[2], m[3]) };

  // "every monday/friday/…" / "weekly on friday"
  m = t.match(/(?:every|each)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)|(?:weekly|every\s+week)\s+(?:on\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
  if (m) {
    const day = m[1] || m[2];
    return { kind: "weekly", dayOfWeek: DAY_NAMES.indexOf(day), ...extractExplicitTime(t) };
  }

  // "monthly on the 5th" / "every month"
  m = t.match(/monthly(?:\s+(?:on\s+the\s+)?(\d{1,2}))?|every\s+month/);
  if (m) {
    const dayOfMonth = m[1] ? Math.min(Math.max(parseInt(m[1]), 1), 28) : 1;
    return { kind: "monthly", dayOfMonth, ...extractExplicitTime(t) };
  }

  // "every N minutes/hours"
  m = t.match(/every\s+(\d+)\s*(minute|min|hour|hr)s?/);
  if (m) {
    const n = parseInt(m[1]);
    const isHour = /hour|hr/.test(m[2]);
    return { kind: "interval", intervalMinutes: isHour ? n * 60 : Math.max(n, 5) };
  }

  return null;
}

/** Extract an explicit "at HH(:MM)? (am|pm)?" time, if stated. */
function extractExplicitTime(text: string): { hour: number; minute: number } {
  const m = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!m) return { hour: 8, minute: 0 };
  return extractTime(m[1], m[2], m[3]);
}

function extractTime(hourStr?: string, minuteStr?: string, ampm?: string): { hour: number; minute: number } {
  let hour = hourStr !== undefined ? parseInt(hourStr) : 8;
  const minute = minuteStr !== undefined ? parseInt(minuteStr) : 0;
  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  return { hour: Math.min(Math.max(hour, 0), 23), minute };
}

/** Human label for UI display. */
export function describeSchedule(spec: ScheduleSpec): string {
  const time = spec.hour !== undefined || spec.kind === "interval" ? "" : "";
  void time;
  switch (spec.kind) {
    case "every_day": return `Every day · ${formatTime(spec.hour ?? 8, spec.minute ?? 0)}`;
    case "every_weekday": return `Every weekday · ${formatTime(spec.hour ?? 8, spec.minute ?? 0)}`;
    case "weekly": return `Every ${DAY_NAMES[spec.dayOfWeek ?? 5]} · ${formatTime(spec.hour ?? 8, spec.minute ?? 0)}`;
    case "monthly": return `Monthly on the ${spec.dayOfMonth ?? 1} · ${formatTime(spec.hour ?? 8, spec.minute ?? 0)}`;
    case "interval": return `Every ${spec.intervalMinutes} min`;
  }
}

function formatTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h12}:${String(minute).padStart(2, "0")} ${ampm}`;
}

function matchesDay(spec: ScheduleSpec, date: Date): boolean {
  switch (spec.kind) {
    case "every_day": return true;
    case "every_weekday": { const d = date.getDay(); return d >= 1 && d <= 5; }
    case "weekly": return date.getDay() === (spec.dayOfWeek ?? 0);
    case "monthly": return date.getDate() === (spec.dayOfMonth ?? 1);
    default: return false;
  }
}

/** Most recent occurrence of this schedule at or before `now`, else null. */
export function lastOccurrenceOnOrBefore(spec: ScheduleSpec, now: Date): Date | null {
  const cursor = new Date(now);
  cursor.setHours(spec.hour ?? 8, spec.minute ?? 0, 0, 0);
  for (let i = 0; i < 400; i++) {
    if (matchesDay(spec, cursor)) return cursor;
    cursor.setDate(cursor.getDate() - 1);
  }
  return null;
}

/**
 * Is the schedule due at `now`, given when it last ran?
 * Due when a scheduled occurrence has fully passed since the last run —
 * including the very first run for sources that have never executed.
 */
export function isScheduleDue(spec: ScheduleSpec, now: Date, lastRunAt: string | null | undefined): boolean {
  if (spec.kind === "interval") {
    const intervalMs = Math.max((spec.intervalMinutes || 15) * 60_000, 60_000);
    const last = lastRunAt ? new Date(lastRunAt).getTime() : 0;
    if (Number.isNaN(last)) return true;
    return now.getTime() - last >= intervalMs;
  }

  const occurrence = lastOccurrenceOnOrBefore(spec, now);
  if (!occurrence) return false;
  const last = lastRunAt ? new Date(lastRunAt).getTime() : 0;
  if (Number.isNaN(last)) return true;
  return occurrence.getTime() > last;
}

/** Validate a trigger coming from persistence/AI output. */
export function isValidTrigger(trigger: unknown): trigger is TriggerSpec {
  const t = trigger as TriggerSpec;
  if (!t || typeof t !== "object") return false;
  if (!["manual", "schedule", "page_created", "page_updated", "task_completed", "title_changed", "page_trashed"].includes(t.type)) return false;
  if (t.type === "schedule") {
    if (!t.schedule || !["every_day", "every_weekday", "weekly", "monthly", "interval"].includes(t.schedule.kind)) return false;
    if (t.schedule.kind === "interval" && !(typeof t.schedule.intervalMinutes === "number" && t.schedule.intervalMinutes >= 5)) return false;
  }
  return true;
}
