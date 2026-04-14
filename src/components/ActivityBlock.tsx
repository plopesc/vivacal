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
      className="ml-1 text-[10px] leading-none"
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
  const secondary = [activity.instructor, activity.room]
    .filter((v) => v && v.length > 0)
    .join(" \u00B7 ");

  return (
    <button
      type="button"
      onClick={() => onClick(activity)}
      style={style}
      className={`absolute overflow-hidden rounded-md border-l-4 ${colors.bg} ${colors.text} ${colors.border} px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-700`}
      title={`${activity.name} ${activity.startTime}-${activity.endTime} ${secondary}`}
    >
      <div className="flex items-center truncate font-bold">
        <span className="truncate">{activity.name}</span>
        <Stars difficulty={activity.difficulty} />
      </div>
      <div className="truncate text-[10px] opacity-80">
        {activity.startTime}&ndash;{activity.endTime}
      </div>
      {secondary && (
        <div className="truncate text-[10px] opacity-70">{secondary}</div>
      )}
    </button>
  );
}
