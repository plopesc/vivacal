"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Activity, Category } from "@/types/activity";
import { useAppState } from "@/context/AppState";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/categories";
import {
  getUniqueInstructors,
  getUniqueRooms,
  getUniqueCategories,
} from "@/lib/filters";

interface FilterBarProps {
  activities: Activity[];
}

function Dropdown({
  label,
  value,
  onChange,
  options,
  formatOption,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  options: string[];
  formatOption?: (v: string) => string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
      <span>{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        aria-label={label}
      >
        <option value="">Todas</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {formatOption ? formatOption(opt) : opt}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({ activities }: FilterBarProps) {
  const { filters, setFilters } = useAppState();

  const categoryOptions = useMemo(() => {
    const present = new Set(getUniqueCategories(activities));
    return CATEGORY_ORDER.filter((c) => present.has(c));
  }, [activities]);

  const instructorOptions = useMemo(
    () => getUniqueInstructors(activities),
    [activities],
  );
  const roomOptions = useMemo(() => getUniqueRooms(activities), [activities]);

  const anyActive = Boolean(
    filters.category || filters.instructor || filters.room,
  );
  const clearAll = () =>
    setFilters({ category: null, instructor: null, room: null });

  // Mobile bottom-sheet state. The sheet is portaled to document.body so it
  // escapes the header's containing block (the header uses backdrop-filter,
  // which otherwise scopes our `fixed inset-0` dialog to the header's height).
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    // Lock body scroll while the sheet is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  const categoryDropdown = (
    <Dropdown
      label="Categoría"
      value={filters.category}
      onChange={(v) => setFilters({ category: v as Category | null })}
      options={categoryOptions}
      formatOption={(v) => CATEGORY_LABELS[v as Category] ?? v}
    />
  );
  const instructorDropdown = (
    <Dropdown
      label="Monitor"
      value={filters.instructor}
      onChange={(v) => setFilters({ instructor: v })}
      options={instructorOptions}
    />
  );
  const roomDropdown = (
    <Dropdown
      label="Sala"
      value={filters.room}
      onChange={(v) => setFilters({ room: v })}
      options={roomOptions}
    />
  );

  return (
    <>
      {/* Desktop / tablet: inline filters */}
      <div className="hidden items-end gap-3 md:flex">
        {categoryDropdown}
        {instructorDropdown}
        {roomDropdown}
        {anyActive && (
          <button
            type="button"
            onClick={clearAll}
            aria-label="Limpiar filtros"
            className="mb-0.5 inline-flex h-9 items-center rounded-full border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Mobile: single "Filtros" button */}
      <div className="flex items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Abrir filtros"
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          className="inline-flex h-9 items-center rounded-full border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Filtros
          {anyActive && (
            <span
              aria-label="filtros activos"
              className="ml-2 inline-block h-2 w-2 rounded-full bg-sky-500"
            />
          )}
        </button>
        {anyActive && (
          <button
            type="button"
            onClick={clearAll}
            aria-label="Limpiar filtros"
            className="inline-flex h-9 items-center rounded-full border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Mobile bottom sheet — portaled to document.body so it's not trapped
          inside the header's backdrop-filter containing block. */}
      {sheetOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filtros"
            className="fixed inset-0 z-50 md:hidden"
          >
            <button
              type="button"
              aria-label="Cerrar filtros"
              onClick={() => setSheetOpen(false)}
              className="absolute inset-0 bg-slate-900/40"
            />
            <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl bg-white p-4 shadow-xl dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Filtros
                </h2>
                <button
                  type="button"
                  aria-label="Cerrar"
                  onClick={() => setSheetOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              <div className="flex flex-col gap-3 overflow-y-auto">
                {categoryDropdown}
                {instructorDropdown}
                {roomDropdown}
              </div>
              <div className="mt-4 flex gap-2">
                {anyActive && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
