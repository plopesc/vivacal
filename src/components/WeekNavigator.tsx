"use client";

import { useAppState } from "@/context/AppState";

function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const shortFmt = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  });
  const fullFmt = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${shortFmt.format(start)} – ${fullFmt.format(end)}`;
}

function getCurrentMondayYMD(): string {
  const now = new Date();
  const day = now.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function WeekNavigator() {
  const { manifest, selectedWeek, setSelectedWeek } = useAppState();

  if (!manifest || !selectedWeek || manifest.weeks.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        Cargando…
      </div>
    );
  }

  const idx = manifest.weeks.indexOf(selectedWeek);
  const atEarliest = idx <= 0;
  const atLatest = idx === -1 || idx >= manifest.weeks.length - 1;

  const goPrev = () => {
    if (atEarliest) return;
    setSelectedWeek(manifest.weeks[idx - 1]);
  };
  const goNext = () => {
    if (atLatest) return;
    setSelectedWeek(manifest.weeks[idx + 1]);
  };
  const goToday = () => {
    const monday = getCurrentMondayYMD();
    if (manifest.weeks.includes(monday)) {
      setSelectedWeek(monday);
    } else if (manifest.earliestWeek && monday < manifest.earliestWeek) {
      setSelectedWeek(manifest.earliestWeek);
    } else if (manifest.latestWeek) {
      setSelectedWeek(manifest.latestWeek);
    }
  };

  const arrowBase =
    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400";
  const arrowDisabled = "opacity-40 pointer-events-none";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={goPrev}
        aria-label="Semana anterior"
        aria-disabled={atEarliest}
        tabIndex={atEarliest ? -1 : 0}
        className={`${arrowBase} ${atEarliest ? arrowDisabled : ""}`}
      >
        <span aria-hidden="true">‹</span>
      </button>

      <div
        className="min-w-[11rem] text-center text-sm font-medium tabular-nums text-slate-800 sm:min-w-[13rem]"
        aria-live="polite"
      >
        {formatWeekRange(selectedWeek)}
      </div>

      <button
        type="button"
        onClick={goNext}
        aria-label="Semana siguiente"
        aria-disabled={atLatest}
        tabIndex={atLatest ? -1 : 0}
        className={`${arrowBase} ${atLatest ? arrowDisabled : ""}`}
      >
        <span aria-hidden="true">›</span>
      </button>

      <button
        type="button"
        onClick={goToday}
        aria-label="Ir a la semana actual"
        className="ml-1 inline-flex h-9 items-center rounded-full border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
      >
        Hoy
      </button>
    </div>
  );
}
