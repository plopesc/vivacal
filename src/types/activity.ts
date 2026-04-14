export type Category =
  | "acuaticas"
  | "cardiovasculares"
  | "coreograficas"
  | "cuerpo-y-mente"
  | "tonificacion"
  | "otros";

export interface Capacity {
  current: number;
  max: number;
}

export interface Activity {
  /** Deterministic hash of name + date + startTime + room + instructor. */
  id: string;
  /** Activity name without trailing asterisks, e.g. "BODY PUMP". */
  name: string;
  category: Category;
  /** ISO date YYYY-MM-DD for the day this activity happens. */
  date: string;
  /** Lowercase Spanish day name: lunes, martes, miercoles, jueves, viernes, sabado, domingo. */
  dayOfWeek: string;
  /** HH:MM 24h. */
  startTime: string;
  /** HH:MM 24h. */
  endTime: string;
  /** Duration in minutes. */
  duration: number;
  /** Instructor name as published by Viding; may be empty string. */
  instructor: string;
  /** Room label, e.g. "SALA 1", "CICLO", "VASO AADD". */
  room: string;
  capacity: Capacity;
  /** 0 when no asterisks, 1-3 for * to ***. */
  difficulty: 0 | 1 | 2 | 3;
}

export interface WeekData {
  /** YYYY-MM-DD Monday of the week. */
  weekStart: string;
  activities: Activity[];
}

export interface Manifest {
  /** ISO 8601 UTC timestamp of last scraper run. */
  lastUpdated: string;
  /** YYYY-MM-DD of the earliest retained week (Monday). */
  earliestWeek: string | null;
  /** YYYY-MM-DD of the latest fetched week (Monday). */
  latestWeek: string | null;
  /** All retained weeks, sorted ascending. */
  weeks: string[];
}
