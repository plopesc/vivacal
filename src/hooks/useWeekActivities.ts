"use client";

import { useEffect, useState } from "react";
import type { Activity, WeekData } from "@/types/activity";
import { loadWeek } from "@/lib/dataLoader";

interface WeekState {
  activities: Activity[];
  isLoading: boolean;
  error: Error | null;
}

interface AsyncResult {
  weekStart: string;
  activities: Activity[];
  error: Error | null;
}

// Module-level cache keyed by weekStart (YYYY-MM-DD). Returning to a
// previously loaded week is instant (no refetch, no loading flash).
const weekCache = new Map<string, WeekData>();

const EMPTY: Activity[] = [];

export function useWeekActivities(weekStart: string | null): WeekState {
  // Asynchronous fetch results, keyed by weekStart so stale results are
  // ignored after the caller switches weeks.
  const [asyncResult, setAsyncResult] = useState<AsyncResult | null>(null);

  // Derive the state for the current weekStart synchronously during render.
  // - null weekStart -> empty, not loading.
  // - cached -> instant hit.
  // - async result matches -> use it.
  // - otherwise -> loading.
  let state: WeekState;
  if (!weekStart) {
    state = { activities: EMPTY, isLoading: false, error: null };
  } else {
    const cached = weekCache.get(weekStart);
    if (cached) {
      state = {
        activities: cached.activities,
        isLoading: false,
        error: null,
      };
    } else if (asyncResult && asyncResult.weekStart === weekStart) {
      state = {
        activities: asyncResult.activities,
        isLoading: false,
        error: asyncResult.error,
      };
    } else {
      state = { activities: EMPTY, isLoading: true, error: null };
    }
  }

  useEffect(() => {
    if (!weekStart) return;
    if (weekCache.has(weekStart)) return;
    let cancelled = false;
    loadWeek(weekStart)
      .then((wd) => {
        if (cancelled) return;
        weekCache.set(weekStart, wd);
        setAsyncResult({
          weekStart,
          activities: wd.activities,
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAsyncResult({
          weekStart,
          activities: [],
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  return state;
}
