"use client";

import { useAppState } from "@/context/AppState";

function formatRelative(lastUpdated: string): string {
  const diffMs = Date.now() - new Date(lastUpdated).getTime();
  const diffMin = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat("es-ES", { numeric: "auto" });
  if (diffMin < 1) return "actualizado ahora";
  if (diffMin < 60) {
    return `Actualizado ${rtf.format(-diffMin, "minute")}`;
  }
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) {
    return `Actualizado ${rtf.format(-diffHr, "hour")}`;
  }
  const diffDay = Math.round(diffHr / 24);
  return `Actualizado ${rtf.format(-diffDay, "day")}`;
}

export function LastUpdatedBanner() {
  const { manifest } = useAppState();
  // The entire shell renders behind a Suspense boundary for useSearchParams,
  // so this only runs client-side — no hydration mismatch on Date.now().
  if (!manifest) {
    return <div className="h-4" aria-hidden="true" />;
  }

  return (
    <div className="text-xs text-slate-500" aria-live="polite">
      {formatRelative(manifest.lastUpdated)}
    </div>
  );
}
