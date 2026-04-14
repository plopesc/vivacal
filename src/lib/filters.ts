import type { Activity, Category } from "@/types/activity";

export interface ActivityFilter {
  category?: Category | null;
  instructor?: string | null;
  room?: string | null;
}

/**
 * Filter a list of activities. Any filter field that is null/undefined/empty
 * is treated as "no filter" on that dimension.
 */
export function filterActivities(
  list: Activity[],
  f: ActivityFilter,
): Activity[] {
  return list.filter(
    (a) =>
      (!f.category || a.category === f.category) &&
      (!f.instructor || a.instructor === f.instructor) &&
      (!f.room || a.room === f.room),
  );
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter((v) => v.length > 0))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function getUniqueInstructors(list: Activity[]): string[] {
  return uniqueSorted(list.map((a) => a.instructor));
}

export function getUniqueRooms(list: Activity[]): string[] {
  return uniqueSorted(list.map((a) => a.room));
}

export function getUniqueCategories(list: Activity[]): Category[] {
  return [...new Set(list.map((a) => a.category))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/**
 * Group activities by their `date` (YYYY-MM-DD). Each day's activities are
 * sorted ascending by `startTime`. The returned object's keys are not
 * guaranteed to be in any particular order — callers that need ordered days
 * should sort the keys themselves.
 */
export function groupByDay(list: Activity[]): Record<string, Activity[]> {
  const groups: Record<string, Activity[]> = {};
  for (const a of list) {
    const day = groups[a.date];
    if (day) {
      day.push(a);
    } else {
      groups[a.date] = [a];
    }
  }
  for (const day of Object.keys(groups)) {
    groups[day].sort((x, y) => x.startTime.localeCompare(y.startTime));
  }
  return groups;
}
