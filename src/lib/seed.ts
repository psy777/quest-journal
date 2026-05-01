import type { Item } from "./types";

const t0 = Date.now();

export const seedItems: Item[] = [
  {
    id: "f-today",
    parentId: null,
    kind: "folder",
    name: "Today",
    createdAt: t0,
    expanded: true,
  },
  {
    id: "t-morning",
    parentId: "f-today",
    kind: "task",
    title: "Morning routine",
    description: "Get the day started.",
    objectives: [
      { id: "o-1", text: "Make coffee", done: true },
      { id: "o-2", text: "Triage inbox", done: false },
      { id: "o-3", text: "Stand-up at 10", done: false },
    ],
    status: "active",
    createdAt: t0 + 1,
    log: [{ id: "j-1", at: t0 + 1, kind: "started", text: "Quest started." }],
  },
  {
    id: "f-work",
    parentId: null,
    kind: "folder",
    name: "Work",
    createdAt: t0 + 2,
    expanded: true,
  },
  {
    id: "t-release",
    parentId: "f-work",
    kind: "task",
    title: "Ship v2 release",
    description: "Final pass before tagging the build.",
    objectives: [
      { id: "o-4", text: "Update changelog", done: false },
      {
        id: "o-5",
        text: "Run regression suite",
        done: false,
        promotedToTaskId: "t-regression",
      },
      { id: "o-6", text: "Deploy to production", done: false },
    ],
    status: "active",
    createdAt: t0 + 3,
    log: [
      { id: "j-2", at: t0 + 3, kind: "started", text: "Quest started." },
      {
        id: "j-3",
        at: t0 + 100,
        kind: "promoted",
        text: "Running the regression suite turned out to be its own undertaking. Tracking it as a sub-quest.",
      },
    ],
  },
  {
    id: "t-regression",
    parentId: "f-work",
    kind: "task",
    title: "Run regression suite",
    description: "Spawned from Ship v2 release.",
    objectives: [
      { id: "o-r1", text: "Fix flaky auth test", done: false },
      { id: "o-r2", text: "Re-record visual snapshots", done: false },
      { id: "o-r3", text: "Triage remaining failures", done: false },
    ],
    status: "active",
    createdAt: t0 + 100,
    log: [
      {
        id: "j-4",
        at: t0 + 100,
        kind: "started",
        text: "Promoted from a step in 'Ship v2 release'.",
      },
    ],
    parentTaskRef: { taskId: "t-release", objectiveId: "o-5" },
  },
  {
    id: "t-groceries",
    parentId: null,
    kind: "task",
    title: "Buy groceries",
    description: "",
    objectives: [
      { id: "o-7", text: "Apples", done: false },
      { id: "o-8", text: "Bread", done: false },
      { id: "o-9", text: "Coffee beans", done: false },
    ],
    status: "active",
    createdAt: t0 + 4,
    log: [{ id: "j-5", at: t0 + 4, kind: "started", text: "Quest started." }],
  },
];
