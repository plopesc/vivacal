"use client";

import { AppShell } from "@/components/AppShell";
import { useAppState } from "@/context/AppState";

function Placeholder() {
  const { selectedWeek, view } = useAppState();
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
      Views go here (week: {selectedWeek ?? "—"}, view: {view})
    </div>
  );
}

export default function Home() {
  return (
    <AppShell>
      <Placeholder />
    </AppShell>
  );
}
