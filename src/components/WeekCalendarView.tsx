"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Activity } from "@/types/activity";
import { useAppState } from "@/context/AppState";
import { useWeekActivities } from "@/hooks/useWeekActivities";
import { filterActivities } from "@/lib/filters";
import { CATEGORY_COLORS } from "@/lib/categories";
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

/**
 * Maximum number of visible activity blocks side-by-side within an overlap
 * cluster. When a cluster has more than this, the tail is collapsed into a
 * single "+N más" chip that opens a detail sheet listing all activities.
 * Google Calendar does the same — more than ~4 events becomes "+N more".
 */
const MAX_VISIBLE_COLS = 3;

interface PositionedActivity {
  activity: Activity;
  col: number;
  totalCols: number;
  clusterId: number;
}

interface OverflowItem {
  kind: "overflow";
  clusterId: number;
  activities: Activity[];
  col: number;
  totalCols: number;
  startMin: number;
  endMin: number;
}

type RenderedItem =
  | { kind: "activity"; data: PositionedActivity }
  | OverflowItem;

function parseHM(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Assign overlap clusters and column indices.
 * Activities in the same cluster are reachable via a chain of overlaps;
 * within a cluster, each activity gets the lowest-indexed column whose last
 * placed activity ended at or before this one's start (greedy sweep).
 */
function computeColumns(activities: Activity[]): PositionedActivity[] {
  const sorted = [...activities].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );

  const result: PositionedActivity[] = [];
  let clusterId = -1;
  let clusterStart = 0;
  let clusterEndMin = -1;
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
      flushCluster(i);
      clusterStart = i;
      clusterEndMin = endMin;
      columns = [];
      clusterId += 1;
    } else {
      clusterEndMin = Math.max(clusterEndMin, endMin);
    }

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
    result.push({ activity: a, col: placed, totalCols: 0, clusterId });
  }
  flushCluster(sorted.length);
  return result;
}

/**
 * Re-cluster a list of activities by transitive time overlap.
 * Used on the "overflow" activities of an oversized cluster so that instead
 * of one huge "+N más" chip we emit several smaller chips, each tightly
 * bounded to its own sub-range of time.
 */
function subClusterByOverlap(activities: Activity[]): Activity[][] {
  if (activities.length === 0) return [];
  const sorted = [...activities].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
  const result: Activity[][] = [];
  let current: Activity[] = [sorted[0]];
  let currentEnd = parseHM(sorted[0].endTime);
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i];
    const startMin = parseHM(a.startTime);
    if (startMin < currentEnd) {
      current.push(a);
      currentEnd = Math.max(currentEnd, parseHM(a.endTime));
    } else {
      result.push(current);
      current = [a];
      currentEnd = parseHM(a.endTime);
    }
  }
  result.push(current);
  return result;
}

/**
 * Post-process column assignments: if a cluster has more than MAX_VISIBLE_COLS
 * concurrent activities, keep the activities assigned to the first
 * (MAX_VISIBLE_COLS - 1) columns visible and push the rest into the last
 * column. Instead of a single chip for that column, we sub-cluster the hidden
 * activities by overlap and emit one chip per sub-cluster — so a dense 4-hour
 * cluster becomes several narrower chips at each peak instead of one giant one.
 * If a sub-cluster has only a single activity, render it as a regular pill.
 */
function renderItems(positioned: PositionedActivity[]): RenderedItem[] {
  if (positioned.length === 0) return [];

  const clusters = new Map<number, PositionedActivity[]>();
  for (const p of positioned) {
    const list = clusters.get(p.clusterId) ?? [];
    list.push(p);
    clusters.set(p.clusterId, list);
  }

  const out: RenderedItem[] = [];
  for (const [clusterId, members] of clusters) {
    if (members[0].totalCols <= MAX_VISIBLE_COLS) {
      for (const m of members) out.push({ kind: "activity", data: m });
      continue;
    }

    // Oversized cluster. Activities assigned to cols 0..MAX-2 stay visible;
    // everything in col MAX-1 and beyond becomes overflow candidates.
    const visible = members.filter((m) => m.col < MAX_VISIBLE_COLS - 1);
    const hidden = members.filter((m) => m.col >= MAX_VISIBLE_COLS - 1);

    for (const m of visible) {
      out.push({
        kind: "activity",
        data: { ...m, totalCols: MAX_VISIBLE_COLS },
      });
    }

    const subClusters = subClusterByOverlap(hidden.map((h) => h.activity));
    for (const sub of subClusters) {
      if (sub.length === 1) {
        // Single overflow activity — render as a normal pill in the overflow
        // column rather than a chip; no point in saying "+1 más".
        const a = sub[0];
        out.push({
          kind: "activity",
          data: {
            activity: a,
            col: MAX_VISIBLE_COLS - 1,
            totalCols: MAX_VISIBLE_COLS,
            clusterId,
          },
        });
        continue;
      }
      const starts = sub.map((a) => parseHM(a.startTime));
      const ends = sub.map((a) => parseHM(a.endTime));
      out.push({
        kind: "overflow",
        clusterId,
        activities: sub,
        col: MAX_VISIBLE_COLS - 1,
        totalCols: MAX_VISIBLE_COLS,
        startMin: Math.min(...starts),
        endMin: Math.max(...ends),
      });
    }
  }
  return out;
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

function formatTimeRange(startMin: number, endMin: number): string {
  const fmt = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return `${fmt(startMin)}\u2013${fmt(endMin)}`;
}

function formatDayHeading(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const s = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(dt);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface SheetState {
  title: string;
  subtitle: string;
  ariaLabel: string;
  activities: Activity[];
}

function ActivityListSheet({
  state,
  onClose,
  onSelect,
}: {
  state: SheetState | null;
  onClose: () => void;
  onSelect: (a: Activity) => void;
}) {
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [state, onClose]);

  if (!state || typeof document === "undefined") return null;

  const sorted = [...state.activities].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={state.ariaLabel}
      className="fixed inset-0 z-50"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40"
      />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl bg-white shadow-xl md:inset-auto md:left-1/2 md:top-1/2 md:h-[min(85vh,640px)] md:max-h-[85vh] md:w-[460px] md:max-w-[90vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900">
              {state.title}
            </h2>
            <p className="text-xs text-slate-500">{state.subtitle}</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {sorted.map((a) => {
            const colors = CATEGORY_COLORS[a.category];
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onSelect(a)}
                  className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50"
                >
                  <span
                    aria-hidden="true"
                    className={`mt-1 h-10 w-1.5 flex-shrink-0 rounded ${colors.bg} ${colors.border} border`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-slate-900">
                        {a.name}
                      </span>
                      {a.difficulty > 0 && (
                        <span
                          aria-label={`Dificultad ${a.difficulty} de 3`}
                          className="text-amber-500"
                        >
                          {"\u2605".repeat(a.difficulty)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs tabular-nums text-slate-600">
                      {a.startTime}&ndash;{a.endTime} · {a.duration} min
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {[a.instructor, a.room].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

export function WeekCalendarView() {
  const { selectedWeek, filters, setSelectedActivity, scrollToTodayNonce } =
    useAppState();
  const { activities, isLoading, error } = useWeekActivities(selectedWeek);
  const nowMinutes = useNowMinutes();
  const [sheetState, setSheetState] = useState<SheetState | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerStripInnerRef = useRef<HTMLDivElement>(null);
  const todayColumnRef = useRef<HTMLDivElement>(null);
  const todayHeaderRef = useRef<HTMLButtonElement>(null);
  const nowMarkerRef = useRef<HTMLDivElement>(null);

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

  const renderedByDay = useMemo(() => {
    const out: Record<string, RenderedItem[]> = {};
    for (const d of days) {
      out[d] = renderItems(computeColumns(byDay[d] ?? []));
    }
    return out;
  }, [days, byDay]);

  const todayYMD = getTodayYMD();
  const weekIncludesToday = days.includes(todayYMD);
  const nowTop = ((nowMinutes - DAY_START_HOUR * 60) / 60) * SLOT_HEIGHT;
  const showNowLine =
    weekIncludesToday && nowTop >= 0 && nowTop <= TOTAL_HEIGHT;

  // When "Hoy" is pressed, scroll the day-columns container horizontally to
  // today's column (relevant on mobile/small screens where we snap-scroll one
  // day at a time) and scroll the page vertically to the current-time marker
  // (if today is in the visible week) so the user lands near "now".
  useEffect(() => {
    if (scrollToTodayNonce === 0) return;
    const id = requestAnimationFrame(() => {
      const col = todayColumnRef.current;
      const scroller = scrollContainerRef.current;
      if (col && scroller) {
        scroller.scrollTo({
          left: col.offsetLeft,
          behavior: "smooth",
        });
      }
      const marker = nowMarkerRef.current;
      if (marker) {
        marker.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [scrollToTodayNonce, selectedWeek]);

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

  const RAIL_WIDTH = 56;
  const DAY_HEADER_HEIGHT = 48;

  // Mirror the body's horizontal scroll on the sticky header strip via direct
  // DOM mutation (keeps the day labels visually aligned with the day columns
  // below during swipe/scroll). We can't put the real day headers inside an
  // overflow-x:auto container and have them be vertically sticky because
  // browsers compute overflow-y to `auto` when overflow-x is `auto`, which
  // breaks position:sticky relative to the page viewport.
  const onBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const sl = e.currentTarget.scrollLeft;
    if (headerStripInnerRef.current) {
      headerStripInnerRef.current.style.transform = `translate3d(${-sl}px, 0, 0)`;
    }
  };

  const openDaySheet = (ymd: string) => {
    const dayActivities = (byDay[ymd] ?? []).slice();
    if (dayActivities.length === 0) return;
    setSheetState({
      title: formatDayHeading(ymd),
      subtitle: `${dayActivities.length} actividades`,
      ariaLabel: `Actividades del ${formatDayHeading(ymd)}`,
      activities: dayActivities,
    });
  };

  return (
    <div>
      {/* Sticky header strip — one row: hour-rail spacer + day headers.
          Stays pinned below the shell header while the user scrolls the
          calendar body vertically. Horizontal alignment with the body's
          scrollable day columns is maintained via a transform updated in
          onBodyScroll. */}
      <div
        className="sticky z-30 flex bg-white dark:bg-slate-950"
        style={{ top: "var(--shell-header-h, 0px)" }}
      >
        <div
          className="flex-shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
          style={{ width: RAIL_WIDTH, height: DAY_HEADER_HEIGHT }}
          aria-hidden="true"
        />
        <div className="flex-1 overflow-hidden">
          <div
            ref={headerStripInnerRef}
            className="flex min-w-max md:min-w-0"
            style={{ willChange: "transform" }}
          >
            {days.map((ymd) => {
              const isToday = ymd === todayYMD;
              return (
                <button
                  key={ymd}
                  ref={isToday ? todayHeaderRef : undefined}
                  type="button"
                  onClick={() => openDaySheet(ymd)}
                  aria-label={`Ver todas las actividades del ${formatDayHeading(ymd)}`}
                  style={{ height: DAY_HEADER_HEIGHT }}
                  className={`flex w-[calc(100vw-88px)] flex-shrink-0 flex-col items-center justify-center border-b border-r border-slate-200 text-xs transition last:border-r-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-inset md:w-auto md:flex-1 dark:border-slate-800 ${
                    isToday
                      ? "bg-sky-100 font-bold text-sky-900 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-100 dark:hover:bg-sky-900/60"
                      : "bg-slate-100 font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{DAY_LABELS_ES[days.indexOf(ymd)]}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {getDayNumber(ymd)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Hour rail — sibling of (not inside) the scroll container, so it
            never scrolls horizontally. */}
        <div
          className="flex-shrink-0 bg-white dark:bg-slate-950"
          style={{ width: RAIL_WIDTH }}
          aria-hidden="true"
        >
          <div className="relative" style={{ height: TOTAL_HEIGHT }}>
            {HOURS.map((h, i) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-2 text-[10px] text-slate-500 dark:text-slate-400"
                style={{ top: i * SLOT_HEIGHT }}
              >
                {h}
              </div>
            ))}
          </div>
        </div>

        {/* Horizontal scroll container holds only the day columns. */}
        <div
          ref={scrollContainerRef}
          onScroll={onBodyScroll}
          className="flex-1 overflow-x-auto"
        >
          <div className="flex min-w-max snap-x snap-mandatory md:min-w-0 md:snap-none">
            {days.map((ymd) => {
              const isToday = ymd === todayYMD;
              const dayItems = renderedByDay[ymd] ?? [];
              return (
                <div
                  key={ymd}
                  ref={isToday ? todayColumnRef : undefined}
                  className={`flex w-[calc(100vw-88px)] flex-shrink-0 snap-start flex-col border-r border-slate-200 last:border-r-0 md:w-auto md:flex-1 md:flex-shrink dark:border-slate-800 ${
                    isToday
                      ? "bg-slate-50 ring-1 ring-inset ring-slate-300 dark:bg-slate-900/60 dark:ring-slate-700"
                      : ""
                  }`}
                >
                  <div className="relative" style={{ height: TOTAL_HEIGHT }}>
                    {HOURS.map((_, i) => (
                      <div
                        key={i}
                        className="absolute left-0 right-0 border-t border-slate-100 dark:border-slate-800"
                        style={{ top: i * SLOT_HEIGHT }}
                      />
                    ))}

                    {isToday && showNowLine && (
                      <div
                        ref={nowMarkerRef}
                        className="pointer-events-none absolute left-0 right-0 z-20 border-t border-rose-500"
                        style={{
                          top: nowTop,
                          // Leave room beneath the shell header when scrolled to.
                          scrollMarginTop: "var(--shell-header-h, 0px)",
                        }}
                        aria-hidden="true"
                      >
                        <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-rose-500" />
                      </div>
                    )}

                    {dayItems.map((item, idx) => {
                      if (item.kind === "activity") {
                        const { activity, col, totalCols } = item.data;
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
                      }

                      // Overflow chip
                      const top =
                        ((item.startMin - DAY_START_HOUR * 60) / 60) *
                        SLOT_HEIGHT;
                      const height =
                        ((item.endMin - item.startMin) / 60) * SLOT_HEIGHT - 2;
                      const widthPct = 100 / item.totalCols;
                      const leftPct = item.col * widthPct;
                      const timeRange = formatTimeRange(
                        item.startMin,
                        item.endMin,
                      );
                      return (
                        <button
                          key={`overflow-${ymd}-${idx}`}
                          type="button"
                          onClick={() =>
                            setSheetState({
                              title: `${item.activities.length} actividades`,
                              subtitle: timeRange,
                              ariaLabel: "Actividades simultáneas",
                              activities: item.activities,
                            })
                          }
                          style={{
                            top,
                            height,
                            left: `calc(${leftPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                          }}
                          aria-label={`Ver ${item.activities.length} actividades más entre ${timeRange}`}
                          className="absolute flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md border border-dashed border-slate-400 bg-slate-50 px-1 py-1 text-center font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          <span className="text-[11px] leading-none">
                            +{item.activities.length} más
                          </span>
                          <span className="text-[9px] leading-none tabular-nums opacity-75">
                            {timeRange}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ActivityListSheet
        state={sheetState}
        onClose={() => setSheetState(null)}
        onSelect={(a) => {
          setSheetState(null);
          setSelectedActivity(a);
        }}
      />
    </div>
  );
}
