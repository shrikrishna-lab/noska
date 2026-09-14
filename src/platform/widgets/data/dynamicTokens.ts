/**
 * Dynamic variable token resolution for widget query filters.
 * Evaluates context-aware tokens like @me, @today, @this_week dynamically at runtime.
 */
import type { DynamicVariable } from "./types";

export interface EvaluationContext {
  currentUserId?: string | null;
  currentUserName?: string | null;
  currentWorkspaceId?: string | null;
  currentProjectId?: string | null;
  now?: Date;
}

export function resolveDynamicToken(token: unknown, ctx: EvaluationContext): unknown {
  if (typeof token !== "string") return token;

  const now = ctx.now || new Date();

  switch (token as DynamicVariable) {
    case "@me":
      return ctx.currentUserId || ctx.currentUserName || "me";

    case "@today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d.toISOString().split("T")[0];
    }

    case "@tomorrow": {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      return d.toISOString().split("T")[0];
    }

    case "@yesterday": {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      d.setHours(0, 0, 0, 0);
      return d.toISOString().split("T")[0];
    }

    case "@this_week": {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      const start = new Date(d.setDate(diff));
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }

    case "@next_week": {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1) + 7;
      const start = new Date(d.setDate(diff));
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }

    case "@last_7_days": {
      const end = new Date(now);
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      return { start: start.toISOString(), end: end.toISOString() };
    }

    case "@last_30_days": {
      const end = new Date(now);
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      return { start: start.toISOString(), end: end.toISOString() };
    }

    case "@current_project":
      return ctx.currentProjectId || null;

    case "@current_workspace":
      return ctx.currentWorkspaceId || "personal";

    default:
      return token;
  }
}

export const evaluateDynamicToken = resolveDynamicToken;


export function isDateWithinTimeframe(
  dateValue: string | number | Date | null | undefined,
  timeframe: "today" | "this_week" | "last_30_days",
  now: Date = new Date()
): boolean {
  if (!dateValue) return false;
  const targetDate = new Date(dateValue);
  if (isNaN(targetDate.getTime())) return false;

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  if (timeframe === "today") {
    return targetDate >= startOfDay && targetDate <= endOfDay;
  }

  if (timeframe === "this_week") {
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return targetDate >= monday && targetDate <= sunday;
  }

  if (timeframe === "last_30_days") {
    const past30 = new Date(now);
    past30.setDate(now.getDate() - 30);
    past30.setHours(0, 0, 0, 0);
    return targetDate >= past30 && targetDate <= endOfDay;
  }

  return true;
}
