"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAppState } from "@/context/AppState";
import { useWeekActivities } from "@/hooks/useWeekActivities";
import { filterActivities, groupByDay } from "@/lib/filters";
import { CATEGORY_COLORS } from "@/lib/categories";
import type { Activity } from "@/types/activity";

function formatDayHeader(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const formatted = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
  return formatted.replace(/^./, (c) => c.toUpperCase());
}

function getTodayYMD(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface ActivityRowProps {
  activity: Activity;
  onSelect: (a: Activity) => void;
}

function ActivityRow({ activity, onSelect }: ActivityRowProps) {
  const color = CATEGORY_COLORS[activity.category];
  return (
    <button
      type="button"
      onClick={() => onSelect(activity)}
      className="w-full flex items-center gap-4 px-4 py-3 border-b border-slate-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-inset text-left transition-colors"
    >
      <div className="w-14 text-lg font-semibold tabular-nums text-slate-900 shrink-0">
        {activity.startTime}
      </div>
      <span
        className={`w-1.5 h-10 rounded-full ${color.bg} shrink-0`}
        aria-hidden
      />
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-4">
        <div className="font-medium truncate text-slate-900 sm:flex-1 sm:min-w-0">
          {activity.name}
          {activity.difficulty > 0 && (
            <span
              className="ml-2 text-amber-500"
              aria-label={`Dificultad ${activity.difficulty} de 3`}
            >
              {"\u2605".repeat(activity.difficulty)}
            </span>
          )}
        </div>
        <div className="text-sm text-slate-600 truncate sm:flex-1 sm:min-w-0">
          {activity.instructor && `${activity.instructor} · `}
          {activity.room}
        </div>
      </div>
      <div className="text-sm text-slate-500 tabular-nums shrink-0">
        {activity.duration} min
      </div>
    </button>
  );
}

export function ListView() {
  const {
    selectedWeek,
    filters,
    setSelectedActivity,
    scrollToTodayNonce,
  } = useAppState();
  const { activities, isLoading, error } = useWeekActivities(selectedWeek);

  const { dayKeys, groups } = useMemo(() => {
    const filtered = filterActivities(activities, filters);
    const grouped = groupByDay(filtered);
    const keys = Object.keys(grouped).sort();
    return { dayKeys: keys, groups: grouped };
  }, [activities, filters]);

  const todayYMD = getTodayYMD();

  // When "Hoy" is pressed, scroll today's section into view (or the last
  // day if today isn't in the current week). The scroll triggers after the
  // week data has loaded and rendered.
  const todayRef = useRef<HTMLElement>(null);
  const lastSectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (scrollToTodayNonce === 0) return;
    const target = todayRef.current ?? lastSectionRef.current;
    if (!target) return;
    // Defer to the next frame so layout reflects the latest render.
    const id = requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [scrollToTodayNonce, dayKeys]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b border-slate-200 animate-pulse"
          >
            <div className="w-14 h-6 bg-slate-200 rounded" />
            <div className="w-1.5 h-10 bg-slate-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="h-3 bg-slate-200 rounded w-1/3" />
            </div>
            <div className="h-4 w-12 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        Error al cargar las actividades: {error.message}
      </div>
    );
  }

  if (dayKeys.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        No hay actividades que coincidan con los filtros.
      </div>
    );
  }

  return (
    // Note: no `overflow-hidden` here — it would create a containing block for
    // `position: sticky` on the day headers and clip them, breaking stickiness.
    // Rounded corners are achieved via the first/last child rounding below.
    <div className="rounded-lg border border-slate-200 bg-white">
      {dayKeys.map((day, i) => {
        const isToday = day === todayYMD;
        const isLast = i === dayKeys.length - 1;
        return (
          <section
            key={day}
            ref={isToday ? todayRef : isLast ? lastSectionRef : undefined}
            // scroll-margin-top accounts for the sticky shell header, so
            // scrollIntoView lands the section just below it.
            style={{ scrollMarginTop: "var(--shell-header-h, 0px)" }}
          >
            <h2
              // Stick below the global shell header, not behind it.
              style={{ top: "var(--shell-header-h, 0px)" }}
              className={`sticky z-10 px-4 py-2 text-sm font-semibold border-b border-slate-200 ${
                i === 0 ? "rounded-t-lg" : ""
              } ${
                isToday
                  ? "border-l-4 border-l-sky-500 bg-sky-100 text-sky-900"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              {formatDayHeader(day)}
            </h2>
            <div>
              {groups[day].map((activity) => (
                <ActivityRow
                  key={activity.id}
                  activity={activity}
                  onSelect={setSelectedActivity}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
