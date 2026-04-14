"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Activity, Category, Manifest } from "@/types/activity";

export interface AppFilters {
  category: Category | null;
  instructor: string | null;
  room: string | null;
}

export type View = "calendar" | "list";

export interface AppStateValue {
  manifest: Manifest | null;
  selectedWeek: string | null;
  setSelectedWeek: (w: string) => void;
  view: View;
  setView: (v: View) => void;
  filters: AppFilters;
  setFilters: (f: Partial<AppFilters>) => void;
  selectedActivity: Activity | null;
  setSelectedActivity: (a: Activity | null) => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

interface AppStateProviderProps {
  manifest: Manifest | null;
  selectedWeek: string | null;
  setSelectedWeek: (w: string) => void;
  view: View;
  setView: (v: View) => void;
  filters: AppFilters;
  setFilters: (f: Partial<AppFilters>) => void;
  children: ReactNode;
}

export function AppStateProvider({
  manifest,
  selectedWeek,
  setSelectedWeek,
  view,
  setView,
  filters,
  setFilters,
  children,
}: AppStateProviderProps) {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );

  const setSelectedActivityCb = useCallback((a: Activity | null) => {
    setSelectedActivity(a);
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      manifest,
      selectedWeek,
      setSelectedWeek,
      view,
      setView,
      filters,
      setFilters,
      selectedActivity,
      setSelectedActivity: setSelectedActivityCb,
    }),
    [
      manifest,
      selectedWeek,
      setSelectedWeek,
      view,
      setView,
      filters,
      setFilters,
      selectedActivity,
      setSelectedActivityCb,
    ],
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return ctx;
}
