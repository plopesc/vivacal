/**
 * Mirror of src/lib/categories.ts (mapping only) in plain ESM so the
 * buildless scraper can import it without TS tooling. Keep in sync with
 * src/lib/categories.ts.
 */

export const ACTIVITY_CATEGORY_MAP = {
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

/** Normalize an activity name: uppercase, strip stars, collapse whitespace,
 * remove diacritics so "TRAINING GLÚTEO" matches "TRAINING GLUTEO". */
export function normalizeActivityName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Return category for an activity name, 'otros' when not found. */
export function getCategoryForActivity(name) {
  return ACTIVITY_CATEGORY_MAP[normalizeActivityName(name)] ?? "otros";
}
