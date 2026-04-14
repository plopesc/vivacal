"use client";

import { useEffect, useRef, useState } from "react";
import { useAppState } from "@/context/AppState";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/categories";
import type { Activity } from "@/types/activity";

function formatSpanishDate(isoDate: string): string {
  // Parse YYYY-MM-DD as a local date (avoid TZ drift).
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  const fmt = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const raw = fmt.format(date);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function renderStars(difficulty: 0 | 1 | 2 | 3): string {
  if (difficulty === 0) return "";
  return "★".repeat(difficulty);
}

export function ActivityDetailPanel() {
  const { selectedActivity, setSelectedActivity } = useAppState();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  // Mirror the context so the exit transition can play while the context is
  // already null. Updates happen inside timer callbacks (not directly in the
  // effect body) to satisfy the `react-hooks/set-state-in-effect` rule.
  const [displayed, setDisplayed] = useState<Activity | null>(selectedActivity);

  useEffect(() => {
    if (selectedActivity) {
      // Sync immediately on the next tick; using a timer keeps the setState
      // call out of the effect body.
      const t = window.setTimeout(() => setDisplayed(selectedActivity), 0);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setDisplayed(null), 300);
    return () => window.clearTimeout(t);
  }, [selectedActivity]);

  // Focus trap, Escape to close, body scroll lock — active while open.
  useEffect(() => {
    if (!selectedActivity) return;
    const panel = panelRef.current;
    if (!panel) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    closeBtnRef.current?.focus();

    const getFocusables = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedActivity(null);
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = getFocusables();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [selectedActivity, setSelectedActivity]);

  const isOpen = selectedActivity !== null;
  // On open, prefer the live context so content is present immediately; on
  // close, fall back to the lagging copy so the exit transition has content.
  const activity: Activity | null = selectedActivity ?? displayed;

  // Panel animates as a slide-up bottom sheet on mobile and as a scale+fade
  // centered modal on desktop. The base classes always include the desktop
  // centering translate (-50%, -50%); the open/close variants layer opacity
  // and scale on top without disturbing the centering transform.
  const panelTransform = isOpen
    ? "translate-y-0 md:-translate-x-1/2 md:-translate-y-1/2 md:scale-100 md:opacity-100"
    : "translate-y-full md:-translate-x-1/2 md:-translate-y-1/2 md:scale-95 md:opacity-0 md:pointer-events-none";

  const backdropClasses = `fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
    isOpen ? "opacity-100" : "pointer-events-none opacity-0"
  }`;

  return (
    <>
      <div
        className={backdropClasses}
        aria-hidden="true"
        onClick={() => setSelectedActivity(null)}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-detail-heading"
        aria-hidden={!isOpen}
        className={`fixed z-50 flex flex-col bg-white shadow-2xl transition-all duration-300 inset-x-0 bottom-0 rounded-t-2xl max-h-[85vh] md:inset-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[480px] md:max-w-[90vw] md:max-h-[85vh] md:rounded-2xl ${panelTransform}`}
      >
        {activity ? (
          <ActivityDetailContent
            activity={activity}
            closeBtnRef={closeBtnRef}
            onClose={() => setSelectedActivity(null)}
          />
        ) : null}
      </div>
    </>
  );
}

interface ContentProps {
  activity: Activity;
  closeBtnRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

function ActivityDetailContent({ activity, closeBtnRef, onClose }: ContentProps) {
  const colors = CATEGORY_COLORS[activity.category];
  const stars = renderStars(activity.difficulty);
  const dateLine = formatSpanishDate(activity.date);
  const timeLine = `${activity.startTime} – ${activity.endTime} · ${activity.duration} min`;
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <h2
          id="activity-detail-heading"
          className="text-2xl font-bold leading-tight text-slate-900"
        >
          {activity.name}
          {stars ? (
            <span
              className="ml-2 text-amber-500"
              aria-label={`Dificultad ${activity.difficulty} de 3`}
            >
              {stars}
            </span>
          ) : null}
        </h2>
        <button
          ref={closeBtnRef}
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="-mr-2 -mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-2xl leading-none text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          ×
        </button>
      </div>

      <div className="px-6 pb-6 pt-4">
        <div className="mb-5">
          <span
            className={`inline-block rounded px-2 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}
          >
            {CATEGORY_LABELS[activity.category]}
          </span>
        </div>

        <dl className="space-y-3 text-sm text-slate-700">
          <div>
            <dt className="sr-only">Fecha</dt>
            <dd className="text-base font-medium text-slate-900">{dateLine}</dd>
          </div>
          <div>
            <dt className="sr-only">Horario</dt>
            <dd className="text-base text-slate-900">{timeLine}</dd>
          </div>
          {activity.instructor ? (
            <div>
              <dt className="sr-only">Monitor</dt>
              <dd>
                <span className="font-medium text-slate-900">Monitor:</span>{" "}
                {activity.instructor}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="sr-only">Sala</dt>
            <dd>
              <span className="font-medium text-slate-900">Sala:</span>{" "}
              {activity.room}
            </dd>
          </div>
          <div>
            <dt className="sr-only">Capacidad</dt>
            <dd>
              <span className="font-medium text-slate-900">
                {activity.capacity.current > 0 ? "Plazas:" : "Aforo:"}
              </span>{" "}
              {activity.capacity.current > 0
                ? `${activity.capacity.current} / ${activity.capacity.max}`
                : activity.capacity.max}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
