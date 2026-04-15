import type { Manifest, WeekData } from "@/types/activity";
import { withBasePath } from "./basePath";

/**
 * Fetch the manifest of available weeks. We bypass the HTTP cache because we
 * always want the freshest deploy's manifest (week files are
 * content-addressed by date, so they cache aggressively instead).
 */
export async function loadManifest(): Promise<Manifest> {
  const res = await fetch(withBasePath("/data/manifest.json"), {
    cache: "no-cache",
  });
  if (!res.ok) {
    throw new Error(`manifest load failed: ${res.status}`);
  }
  return (await res.json()) as Manifest;
}

/**
 * Fetch a single week's activities. Week files are immutable per
 * (weekStart, deploy), so we let the browser cache them forever — the
 * service worker handles invalidation across deploys.
 */
export async function loadWeek(weekStart: string): Promise<WeekData> {
  const res = await fetch(withBasePath(`/data/activities-${weekStart}.json`), {
    cache: "force-cache",
  });
  if (!res.ok) {
    throw new Error(`week ${weekStart} load failed: ${res.status}`);
  }
  return (await res.json()) as WeekData;
}
