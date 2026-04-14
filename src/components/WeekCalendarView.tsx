"use client";

import { useEffect, useMemo, useState } from "react";
import type { Activity } from "@/types/activity";
import { useAppState } from "@/context/AppState";
import { useWeekActivities } from "@/hooks/useWeekActivities";
import { filterActivities } from "@/lib/filters";
import { ActivityBlock } from "./ActivityBlock";

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 22;
const SLOT_HEIGHT = 60; // px per hour
const TOTAL_HEIGHT = (DAY_END_HOUR - DAY_START_HOUR) * SLOT_HEIGHT;
const HOURS: string[] = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
  (_, i) => `${String(DAY_START_HOUR + i).padStart(2, "0")}:00`,
);
const DAY_LABELS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface PositionedActivity {
  activity: Activity;
  col: number;
  totalCols: number;
}

function parseHM(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Compute side-by-side column layout for overlapping activities within a day.
 * Uses a sweep through activities (already sorted by startTime):
 * - Place each activity in the lowest-indexed column whose last activity ended
 *   before (or at) this one's start.
 * - Maintain clusters of mutually-overlapping activities; within a cluster,
 *   all activities share the same totalCols (the cluster's max column count).
 */
function computeColumns(activities: Activity[]): PositionedActivity[] {
  const sorted = [...activities].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );

  const result: PositionedActivity[] = [];
  let clusterStart = 0;
  let clusterEndMin = -1;
  // For each active column, track end-minute of last placed activity.
  let columns: number[] = [];

  const flushCluster = (upto: number) => {
    const total = columns.length;
    for (let i = clusterStart; i < upto; i++) {
      result[i] = { ...result[i], totalCols: total };
    }
  };

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    const startMin = parseHM(a.startTime);
    const endMin = parseHM(a.endTime);

    if (startMin >= clusterEndMin) {
      // Cluster boundary: finalize the previous cluster.
      flushCluster(i);
      clusterStart = i;
      clusterEndMin = endMin;
      columns = [];
    } else {
      clusterEndMin = Math.max(clusterEndMin, endMin);
    }

    // Find the first free column (end <= startMin).
    let placed = -1;
    for (let c = 0; c < columns.length; c++) {
      if (columns[c] <= startMin) {
        placed = c;
        columns[c] = endMin;
        break;
      }
    }
    if (placed === -1) {
      placed = columns.length;
      columns.push(endMin);
    }
    result.push({ activity: a, col: placed, totalCols: 0 });
  }
  flushCluster(sorted.length);
  return result;
}

function addDaysYMD(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function getTodayYMD(): string {
  const n = new Date();
  const yy = n.getFullYear();
  const mm = String(n.getMonth() + 1).padStart(2, "0");
  const dd = String(n.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function getDayNumber(ymd: string): number {
  return Number(ymd.split("-")[2]);
}

function useNowMinutes(): number {
  const [now, setNow] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function WeekCalendarView() {
  const { selectedWeek, filters, setSelectedActivity } = useAppState();
  const { activities, isLoading, error } = useWeekActivities(selectedWeek);
  const nowMinutes = useNowMinutes();

  const filtered = useMemo(
    () => filterActivities(activities, filters),
    [activities, filters],
  );

  const days = useMemo(() => {
    if (!selectedWeek) return [];
    return Array.from({ length: 7 }, (_, i) => addDaysYMD(selectedWeek, i));
  }, [selectedWeek]);

  const byDay = useMemo(() => {
    const map: Record<string, Activity[]> = {};
    for (const d of days) map[d] = [];
    for (const a of filtered) {
      if (map[a.date]) map[a.date].push(a);
    }
    return map;
  }, [days, filtered]);

  const positionedByDay = useMemo(() => {
    const out: Record<string, PositionedActivity[]> = {};
    for (const d of days) {
      out[d] = computeColumns(byDay[d] ?? []);
    }
    return out;
  }, [days, byDay]);

  const todayYMD = getTodayYMD();
  const weekIncludesToday = days.includes(todayYMD);
  const nowTop =
    ((nowMinutes - DAY_START_HOUR * 60) / 60) * SLOT_HEIGHT;
  const showNowLine =
    weekIncludesToday && nowTop >= 0 && nowTop <= TOTAL_HEIGHT;

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center py-12 text-sm text-slate-500">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
          role="status"
          aria-label="Cargando"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        Error al cargar las actividades: {error.message}
      </div>
    );
  }

  if (!selectedWeek) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        No hay semana seleccionada.
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        No hay actividades que coincidan con los filtros.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-full">
        {/* Left hour rail */}
        <div
          className="sticky left-0 z-10 flex-shrink-0 bg-white"
          style={{ width: 56 }}
        >
          {/* Header spacer to align with day headers */}
          <div className="h-12 border-b border-slate-200" />
          <div className="relative" style={{ height: TOTAL_HEIGHT }}>
            {HOURS.map((h, i) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-2 text-[10px] text-slate-500"
                style={{ top: i * SLOT_HEIGHT }}
              >
                {h}
              </div>
            ))}
          </div>
        </div>

        {/* Day columns container: desktop flex-1 each, mobile snap-scroll */}
        <div className="flex flex-1 snap-x snap-mandatory md:snap-none">
          {days.map((ymd) => {
            const isToday = ymd === todayYMD;
            const dayPositioned = positionedByDay[ymd] ?? [];
            return (
              <div
                key={ymd}
                className={`flex w-[85vw] flex-shrink-0 snap-start flex-col border-r border-slate-200 last:border-r-0 md:w-auto md:flex-1 md:flex-shrink ${
                  isToday ? "bg-slate-50 ring-1 ring-inset ring-slate-300" : ""
                }`}
              >
                {/* Day header */}
                <div
                  className={`flex h-12 flex-col items-center justify-center border-b border-slate-200 text-xs ${
                    isToday
                      ? "font-bold text-slate-900"
                      : "font-medium text-slate-700"
                  }`}
                >
                  <span>{DAY_LABELS_ES[days.indexOf(ymd)]}</span>
                  <span className="text-[10px] text-slate-500">
                    {getDayNumber(ymd)}
                  </span>
                </div>

                {/* Grid body */}
                <div
                  className="relative"
                  style={{ height: TOTAL_HEIGHT }}
                >
                  {/* Hour grid lines */}
                  {HOURS.map((_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-slate-100"
                      style={{ top: i * SLOT_HEIGHT }}
                    />
                  ))}

                  {/* Current-time line (today only) */}
                  {isToday && showNowLine && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-20 border-t border-rose-500"
                      style={{ top: nowTop }}
                      aria-hidden="true"
                    >
                      <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-rose-500" />
                    </div>
                  )}

                  {/* Activity blocks */}
                  {dayPositioned.map(({ activity, col, totalCols }) => {
                    const startMin = parseHM(activity.startTime);
                    const top =
                      ((startMin - DAY_START_HOUR * 60) / 60) * SLOT_HEIGHT;
                    const height =
                      (activity.duration / 60) * SLOT_HEIGHT - 2;
                    const widthPct = 100 / totalCols;
                    const leftPct = col * widthPct;
                    return (
                      <ActivityBlock
                        key={activity.id}
                        activity={activity}
                        onClick={setSelectedActivity}
                        style={{
                          top,
                          height,
                          left: `calc(${leftPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
