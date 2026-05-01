"use client";

import { Sidebar } from "./Sidebar";
import { TaskDetail } from "./TaskDetail";
import { useStore } from "@/lib/store";
import type { StatusFilter } from "@/lib/types";

const TABS: { id: StatusFilter; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "all", label: "All" },
];

function useCounts() {
  const { items } = useStore();
  let active = 0;
  let completed = 0;
  for (const it of items) {
    if (it.kind !== "task") continue;
    if (it.status === "active") active++;
    else completed++;
  }
  return { active, completed, all: active + completed };
}

export function Journal() {
  const { filter, setFilter } = useStore();
  const counts = useCounts();

  return (
    <div className="flex flex-col h-screen bg-bg">
      <header className="border-b border-border bg-pane">
        <div className="h-[52px] px-5 flex items-center gap-1">
          {TABS.map((tab) => {
            const count =
              tab.id === "active"
                ? counts.active
                : tab.id === "completed"
                  ? counts.completed
                  : counts.all;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`tab ${filter === tab.id ? "active" : ""}`}
              >
                {tab.label}
                {count > 0 && (
                  <span className="ml-1.5 text-[11px] tabular-nums opacity-70">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <TaskDetail />
      </div>
    </div>
  );
}
