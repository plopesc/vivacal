"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Category } from "@/types/activity";
import { useManifest } from "@/hooks/useManifest";
import { useWeekActivities } from "@/hooks/useWeekActivities";
import {
  AppStateProvider,
  type AppFilters,
  type View,
} from "@/context/AppState";
import { CATEGORY_ORDER } from "@/lib/categories";
import { WeekNavigator } from "./WeekNavigator";
import { ViewToggle } from "./ViewToggle";
import { FilterBar } from "./FilterBar";
import { LastUpdatedBanner } from "./LastUpdatedBanner";
import { ActivityDetailPanel } from "./ActivityDetailPanel";

function getCurrentMondayYMD(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isValidCategory(v: string | null): v is Category {
  return !!v && (CATEGORY_ORDER as string[]).includes(v);
}

interface ShellInnerProps {
  children: ReactNode;
}

function ShellInner({ children }: ShellInnerProps) {
  const { manifest } = useManifest();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === "") next.delete(key);
        else next.set(key, val);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  // Derive the selected week synchronously from URL + manifest. No local
  // state needed — the URL is the source of truth.
  const weekParam = searchParams.get("week");
  const selectedWeek: string | null = useMemo(() => {
    if (!manifest || manifest.weeks.length === 0) return null;
    if (weekParam && manifest.weeks.includes(weekParam)) return weekParam;
    const monday = getCurrentMondayYMD();
    if (manifest.weeks.includes(monday)) return monday;
    return manifest.latestWeek ?? manifest.weeks[manifest.weeks.length - 1];
  }, [manifest, weekParam]);

  // If URL's week is missing or invalid, reflect the resolved value back.
  // Syncing state to an external system (the URL) inside an effect is fine.
  useEffect(() => {
    if (!selectedWeek) return;
    if (weekParam === selectedWeek) return;
    setParams({ week: selectedWeek });
  }, [selectedWeek, weekParam, setParams]);

  const setSelectedWeek = useCallback(
    (w: string) => {
      setParams({ week: w });
    },
    [setParams],
  );

  // View from URL (synchronous derivation).
  const viewParam = searchParams.get("view");
  const view: View = viewParam === "list" ? "list" : "calendar";
  const setView = useCallback(
    (v: View) => {
      setParams({ view: v === "calendar" ? null : v });
    },
    [setParams],
  );

  // Filters from URL.
  const categoryParam = searchParams.get("category");
  const filters: AppFilters = useMemo(
    () => ({
      category: isValidCategory(categoryParam) ? categoryParam : null,
      instructor: searchParams.get("instructor") || null,
      room: searchParams.get("room") || null,
    }),
    [categoryParam, searchParams],
  );
  const setFilters = useCallback(
    (patch: Partial<AppFilters>) => {
      const updates: Record<string, string | null> = {};
      if ("category" in patch) updates.category = patch.category ?? null;
      if ("instructor" in patch) updates.instructor = patch.instructor ?? null;
      if ("room" in patch) updates.room = patch.room ?? null;
      setParams(updates);
    },
    [setParams],
  );

  // Current week's activities feed the FilterBar dropdowns.
  const { activities } = useWeekActivities(selectedWeek);

  // Measure the sticky header's height and expose it as --shell-header-h so
  // sub-views (e.g. ListView day headers) can stick *below* it instead of
  // behind it. ResizeObserver handles responsive wrapping of the header.
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => setHeaderHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <AppStateProvider
      manifest={manifest}
      selectedWeek={selectedWeek}
      setSelectedWeek={setSelectedWeek}
      view={view}
      setView={setView}
      filters={filters}
      setFilters={setFilters}
    >
      <ActivityDetailPanel />
      <div
        className="flex min-h-screen flex-col"
        style={
          { "--shell-header-h": `${headerHeight}px` } as React.CSSProperties
        }
      >
        <header
          ref={headerRef}
          className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90"
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  ViVaCal
                </h1>
                <LastUpdatedBanner />
              </div>
              <div className="flex items-center gap-3">
                <ViewToggle />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <WeekNavigator />
              <FilterBar activities={activities} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          {children}
        </main>

        <footer className="flex flex-col items-center gap-1 border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <p>
            Proyecto independiente sin afiliación con Viding. Datos extraídos
            automáticamente de{" "}
            <a
              href="https://valladolid-viding.viding.es/ActividadesColectivas/ActividadesColectivasHorarioSemanal"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-700 dark:hover:text-slate-200"
            >
              valladolid-viding.viding.es
            </a>
            . Código en{" "}
            <a
              href="https://github.com/plopesc/vivacal"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-700 dark:hover:text-slate-200"
            >
              GitHub
            </a>
            .
          </p>
          <p>
            Hecho con{" "}
            <span aria-label="cariño" className="text-rose-500">
              ♥
            </span>{" "}
            por{" "}
            <a
              href="https://github.com/plopesc"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-700 dark:hover:text-slate-200"
            >
              plopesc
            </a>
            .
          </p>
        </footer>
      </div>
    </AppStateProvider>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  // useSearchParams requires a Suspense boundary during static export.
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ShellInner>{children}</ShellInner>
    </Suspense>
  );
}
