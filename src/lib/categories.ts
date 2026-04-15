import type { Category } from "@/types/activity";

/**
 * Static mapping of known activity names (uppercase, asterisks stripped) to
 * their category. Derived from the Viding "Agrupaciones" filter.
 */
export const ACTIVITY_CATEGORY_MAP: Record<string, Category> = {
  // Acuaticas
  AQUAGYM: "acuaticas",
  AQUAPILATES: "acuaticas",
  AQUAPOWER: "acuaticas",
  AQUARUNNING: "acuaticas",
  AQUAVIDING: "acuaticas",
  "VIDING SWIMMERS": "acuaticas",
  // Cardiovasculares
  "PEAK CYCLE": "cardiovasculares",
  "BODY COMBAT": "cardiovasculares",
  "BODY PUMP": "cardiovasculares",
  CROSSVIDING: "cardiovasculares",
  HYROX: "cardiovasculares",
  // Coreograficas
  ZUMBA: "coreograficas",
  "BAILES LATINOS": "coreograficas",
  // Cuerpo y Mente
  YOGA: "cuerpo-y-mente",
  PILATES: "cuerpo-y-mente",
  "PILATES IMPLEMENTOS": "cuerpo-y-mente",
  "BODY BALANCE": "cuerpo-y-mente",
  BARRE: "cuerpo-y-mente",
  "VITAL MOVE": "cuerpo-y-mente",
  // Tonificacion
  FUERZA: "tonificacion",
  "TRAINING GLUTEO": "tonificacion",
  "VITAL POWER": "tonificacion",
  FUNCTIONAL: "tonificacion",
  ACTIVATE: "tonificacion",
  ABDOMINALES: "tonificacion",
};

/**
 * Normalize an activity name for map lookup: uppercase, strip stars,
 * strip diacritics, collapse whitespace. Keeps "TRAINING GLÚTEO" matching
 * "TRAINING GLUTEO" in the map (the scraper uses the same normalization).
 */
export function normalizeActivityName(name: string): string {
  return name
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Return the category for the given activity name. Unknown names map to "otros".
 */
export function getCategoryForActivity(name: string): Category {
  return ACTIVITY_CATEGORY_MAP[normalizeActivityName(name)] ?? "otros";
}

export interface CategoryColor {
  bg: string;
  text: string;
  border: string;
}

/**
 * Tailwind color tokens per category. Keep in sync with the safelist in
 * tailwind.config (if any) since classes are applied dynamically.
 */
export const CATEGORY_COLORS: Record<Category, CategoryColor> = {
  acuaticas: {
    bg: "bg-sky-100 dark:bg-sky-900/40",
    text: "text-sky-900 dark:text-sky-100",
    border: "border-sky-400 dark:border-sky-500",
  },
  cardiovasculares: {
    bg: "bg-rose-100 dark:bg-rose-900/40",
    text: "text-rose-900 dark:text-rose-100",
    border: "border-rose-400 dark:border-rose-500",
  },
  coreograficas: {
    bg: "bg-fuchsia-100 dark:bg-fuchsia-900/40",
    text: "text-fuchsia-900 dark:text-fuchsia-100",
    border: "border-fuchsia-400 dark:border-fuchsia-500",
  },
  "cuerpo-y-mente": {
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    text: "text-emerald-900 dark:text-emerald-100",
    border: "border-emerald-400 dark:border-emerald-500",
  },
  tonificacion: {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-900 dark:text-amber-100",
    border: "border-amber-400 dark:border-amber-500",
  },
  otros: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-900 dark:text-slate-100",
    border: "border-slate-400 dark:border-slate-600",
  },
};

export const CATEGORY_LABELS: Record<Category, string> = {
  acuaticas: "Acuáticas",
  cardiovasculares: "Cardiovasculares",
  coreograficas: "Coreográficas",
  "cuerpo-y-mente": "Cuerpo y Mente",
  tonificacion: "Tonificación",
  otros: "Otros",
};

export const CATEGORY_ORDER: Category[] = [
  "acuaticas",
  "cardiovasculares",
  "coreograficas",
  "cuerpo-y-mente",
  "tonificacion",
  "otros",
];
