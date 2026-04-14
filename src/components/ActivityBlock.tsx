"use client";

import type { CSSProperties } from "react";
import type { Activity } from "@/types/activity";
import { CATEGORY_COLORS } from "@/lib/categories";

interface ActivityBlockProps {
  activity: Activity;
  style: CSSProperties;
  onClick: (a: Activity) => void;
}

function Stars({ difficulty }: { difficulty: 0 | 1 | 2 | 3 }) {
  if (difficulty === 0) return null;
  return (
    <span
      aria-label={`Dificultad ${difficulty} de 3`}
      className="ml-1 shrink-0 text-[10px] leading-none"
    >
      {"\u2605".repeat(difficulty)}
    </span>
  );
}

export function ActivityBlock({
  activity,
  style,
  onClick,
}: ActivityBlockProps) {
  const colors = CATEGORY_COLORS[activity.category];
  // Secondary info (instructor · room) is only shown on pill hover/tap via
  // the detail panel — keeps the pill readable when many activities overlap.
  const fullLabel = `${activity.name} · ${activity.startTime}\u2013${activity.endTime} · ${[activity.instructor, activity.room].filter(Boolean).join(" · ")}`;

  return (
    <button
      type="button"
      onClick={() => onClick(activity)}
      style={style}
      className={`absolute overflow-hidden rounded-md border-l-4 ${colors.bg} ${colors.text} ${colors.border} px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-700`}
      title={fullLabel}
      aria-label={fullLabel}
    >
      <div className="flex items-start gap-1 font-semibold">
        <span className="flex-1 truncate">{activity.name}</span>
        <Stars difficulty={activity.difficulty} />
      </div>
      <div className="truncate text-[10px] tabular-nums opacity-75">
        {activity.startTime}&ndash;{activity.endTime}
      </div>
    </button>
  );
}
