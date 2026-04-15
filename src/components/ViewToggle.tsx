"use client";

import { useAppState } from "@/context/AppState";
import type { View } from "@/context/AppState";

export function ViewToggle() {
  const { view, setView } = useAppState();

  const btn = (value: View, label: string) => {
    const active = view === value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => setView(value)}
        aria-pressed={active}
        aria-label={`Vista ${label}`}
        className={`inline-flex h-9 items-center px-4 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-400 ${
          active
            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
            : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      role="group"
      aria-label="Cambiar vista"
      className="inline-flex overflow-hidden rounded-full border border-slate-300 dark:border-slate-700"
    >
      {btn("calendar", "Calendario")}
      {btn("list", "Lista")}
    </div>
  );
}
