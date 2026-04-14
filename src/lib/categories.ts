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

/** Normalize an activity name: uppercase, strip stars, collapse whitespace. */
export function normalizeActivityName(name: string): string {
  return name
    .toUpperCase()
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
  acuaticas: { bg: "bg-sky-100", text: "text-sky-900", border: "border-sky-400" },
  cardiovasculares: { bg: "bg-rose-100", text: "text-rose-900", border: "border-rose-400" },
  coreograficas: { bg: "bg-fuchsia-100", text: "text-fuchsia-900", border: "border-fuchsia-400" },
  "cuerpo-y-mente": { bg: "bg-emerald-100", text: "text-emerald-900", border: "border-emerald-400" },
  tonificacion: { bg: "bg-amber-100", text: "text-amber-900", border: "border-amber-400" },
  otros: { bg: "bg-slate-100", text: "text-slate-900", border: "border-slate-400" },
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
