"use client";

import { AppShell } from "@/components/AppShell";
import { ListView } from "@/components/ListView";
import { WeekCalendarView } from "@/components/WeekCalendarView";
import { useAppState } from "@/context/AppState";

function Views() {
  const { view } = useAppState();
  if (view === "list") {
    return <ListView />;
  }
  return <WeekCalendarView />;
}

export default function Home() {
  return (
    <AppShell>
      <Views />
    </AppShell>
  );
}
