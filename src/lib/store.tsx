"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  FolderItem,
  Item,
  JournalEntry,
  JournalEntryKind,
  StatusFilter,
  TaskItem,
  TreeNode,
} from "./types";
import { seedItems } from "./seed";

const STORAGE_KEY = "quest-journal:v3";
const SELECTED_KEY = "quest-journal:v3:selected";
const FILTER_KEY = "quest-journal:v3:filter";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function migrate(items: Item[]): Item[] {
  return items.map((it) =>
    it.kind === "task" && !Array.isArray(it.log) ? { ...it, log: [] } : it,
  );
}

function appendLog(
  task: TaskItem,
  kind: JournalEntryKind,
  text: string,
): TaskItem {
  const entry: JournalEntry = { id: uid("j"), at: Date.now(), kind, text };
  return { ...task, log: [...task.log, entry] };
}

type StoreContextValue = {
  items: Item[];
  selectedId: string | null;
  filter: StatusFilter;
  hydrated: boolean;
  tree: TreeNode[];
  selectedTask: TaskItem | null;
  pathOf: (id: string) => string;
  taskById: (id: string) => TaskItem | null;
  select: (id: string | null) => void;
  setFilter: (f: StatusFilter) => void;
  createTask: (parentId: string | null) => string;
  createFolder: (parentId: string | null) => string;
  updateFolder: (id: string, patch: Partial<FolderItem>) => void;
  updateTask: (id: string, patch: Partial<TaskItem>) => void;
  deleteItem: (id: string) => void;
  toggleExpanded: (id: string) => void;
  toggleStatus: (id: string) => void;
  addObjective: (taskId: string, text: string) => void;
  updateObjective: (taskId: string, objectiveId: string, text: string) => void;
  toggleObjective: (taskId: string, objectiveId: string) => void;
  deleteObjective: (taskId: string, objectiveId: string) => void;
  promoteObjective: (taskId: string, objectiveId: string) => string | null;
  revealObjectives: (
    taskId: string,
    narrative: string,
    texts: string[],
  ) => void;
  addJournalNote: (taskId: string, text: string) => void;
  deleteJournalEntry: (taskId: string, entryId: string) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

function buildTree(items: Item[], filter: StatusFilter): TreeNode[] {
  const byParent = new Map<string | null, Item[]>();
  for (const it of items) {
    const list = byParent.get(it.parentId) ?? [];
    list.push(it);
    byParent.set(it.parentId, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => {
      // folders first, then tasks; each ordered by createdAt
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      return a.createdAt - b.createdAt;
    });
  }

  const matches = (it: Item): boolean => {
    if (it.kind === "task") {
      if (filter === "all") return true;
      return it.status === filter;
    }
    return true;
  };

  const build = (parentId: string | null, depth: number): TreeNode[] => {
    const items = byParent.get(parentId) ?? [];
    const out: TreeNode[] = [];
    for (const it of items) {
      if (it.kind === "folder") {
        const children = build(it.id, depth + 1);
        // hide empty folders when filtered (avoid stranded headers)
        if (filter !== "all" && children.length === 0) continue;
        out.push({ ...it, depth, children });
      } else {
        if (!matches(it)) continue;
        out.push({ ...it, depth });
      }
    }
    return out;
  };
  return build(null, 0);
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilterState] = useState<StatusFilter>("active");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setItems(migrate(JSON.parse(raw) as Item[]));
      } else {
        setItems(seedItems);
      }
      const sel = localStorage.getItem(SELECTED_KEY);
      if (sel) setSelectedId(sel);
      const f = localStorage.getItem(FILTER_KEY) as StatusFilter | null;
      if (f === "all" || f === "active" || f === "completed") setFilterState(f);
    } catch {
      setItems(seedItems);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (selectedId) localStorage.setItem(SELECTED_KEY, selectedId);
    else localStorage.removeItem(SELECTED_KEY);
  }, [selectedId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(FILTER_KEY, filter);
  }, [filter, hydrated]);

  const tree = useMemo(() => buildTree(items, filter), [items, filter]);

  const selectedTask = useMemo(() => {
    const it = items.find((x) => x.id === selectedId);
    return it && it.kind === "task" ? it : null;
  }, [items, selectedId]);

  const pathOf = useCallback(
    (id: string) => {
      const map = new Map(items.map((it) => [it.id, it]));
      const parts: string[] = [];
      let cur = map.get(id);
      while (cur) {
        const label =
          cur.kind === "folder"
            ? cur.name || "Untitled"
            : cur.title || "Untitled";
        parts.unshift(label);
        cur = cur.parentId ? map.get(cur.parentId) : undefined;
      }
      return "/" + parts.join("/");
    },
    [items],
  );

  const taskById = useCallback(
    (id: string) => {
      const it = items.find((x) => x.id === id);
      return it && it.kind === "task" ? it : null;
    },
    [items],
  );

  const select = useCallback((id: string | null) => setSelectedId(id), []);

  const setFilter = useCallback((f: StatusFilter) => setFilterState(f), []);

  const expandParent = (parentId: string | null, list: Item[]): Item[] => {
    if (!parentId) return list;
    return list.map((it) =>
      it.id === parentId && it.kind === "folder"
        ? { ...it, expanded: true }
        : it,
    );
  };

  const createTask = useCallback((parentId: string | null) => {
    const id = uid("t");
    const now = Date.now();
    const newTask: TaskItem = {
      id,
      parentId,
      kind: "task",
      title: "",
      description: "",
      objectives: [],
      status: "active",
      createdAt: now,
      log: [{ id: uid("j"), at: now, kind: "started", text: "Quest started." }],
    };
    setItems((prev) => expandParent(parentId, prev).concat(newTask));
    setSelectedId(id);
    return id;
  }, []);

  const createFolder = useCallback((parentId: string | null) => {
    const id = uid("f");
    const newFolder: FolderItem = {
      id,
      parentId,
      kind: "folder",
      name: "",
      createdAt: Date.now(),
      expanded: true,
    };
    setItems((prev) => expandParent(parentId, prev).concat(newFolder));
    setSelectedId(id);
    return id;
  }, []);

  const updateFolder = useCallback(
    (id: string, patch: Partial<FolderItem>) => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id && it.kind === "folder" ? { ...it, ...patch } : it,
        ),
      );
    },
    [],
  );

  const updateTask = useCallback((id: string, patch: Partial<TaskItem>) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id && it.kind === "task" ? { ...it, ...patch } : it,
      ),
    );
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => {
      // collect descendants in the folder tree
      const toDelete = new Set<string>([id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const it of prev) {
          if (it.parentId && toDelete.has(it.parentId) && !toDelete.has(it.id)) {
            toDelete.add(it.id);
            changed = true;
          }
        }
      }
      // sever sub-quest links pointing into the deleted set
      return prev
        .filter((it) => !toDelete.has(it.id))
        .map((it) => {
          if (it.kind !== "task") return it;
          let next = it;
          // unlink objectives that pointed at deleted sub-quests
          if (next.objectives.some((o) => o.promotedToTaskId && toDelete.has(o.promotedToTaskId))) {
            next = {
              ...next,
              objectives: next.objectives.map((o) =>
                o.promotedToTaskId && toDelete.has(o.promotedToTaskId)
                  ? { ...o, promotedToTaskId: undefined }
                  : o,
              ),
            };
            next = appendLog(
              next,
              "note",
              "A sub-quest tied to one of these steps was deleted.",
            );
          }
          // clear parentTaskRef if its parent was deleted
          if (next.parentTaskRef && toDelete.has(next.parentTaskRef.taskId)) {
            next = { ...next, parentTaskRef: undefined };
            next = appendLog(
              next,
              "note",
              "Parent quest was deleted. This quest now stands alone.",
            );
          }
          return next;
        });
    });
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id && it.kind === "folder"
          ? { ...it, expanded: !it.expanded }
          : it,
      ),
    );
  }, []);

  // Toggle a task's status. If the task is a sub-quest, cascade the result
  // up to the parent's promoted objective so the parent stays in sync.
  const toggleStatus = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((x) => x.id === id);
      if (!target || target.kind !== "task") return prev;
      const newStatus = target.status === "active" ? "completed" : "active";
      const ref = target.parentTaskRef;

      return prev.map((it) => {
        if (it.id === id && it.kind === "task") {
          const nowComplete = newStatus === "completed";
          const t: TaskItem = { ...it, status: newStatus };
          if (ref) {
            return appendLog(
              t,
              nowComplete ? "resolved" : "reopened",
              nowComplete
                ? "Sub-quest completed."
                : "Sub-quest reopened.",
            );
          }
          return t;
        }
        if (
          ref &&
          it.id === ref.taskId &&
          it.kind === "task" &&
          it.objectives.some((o) => o.id === ref.objectiveId)
        ) {
          const nowComplete = newStatus === "completed";
          const objText =
            it.objectives.find((o) => o.id === ref.objectiveId)?.text ?? "step";
          let updated: TaskItem = {
            ...it,
            objectives: it.objectives.map((o) =>
              o.id === ref.objectiveId ? { ...o, done: nowComplete } : o,
            ),
          };
          updated = appendLog(
            updated,
            nowComplete ? "resolved" : "reopened",
            nowComplete
              ? `"${objText}" resolved by completing its sub-quest.`
              : `"${objText}" reopened — its sub-quest was uncompleted.`,
          );
          return updated;
        }
        return it;
      });
    });
  }, []);

  const addObjective = useCallback((taskId: string, text: string) => {
    if (!text.trim()) return;
    setItems((prev) =>
      prev.map((it) =>
        it.id === taskId && it.kind === "task"
          ? {
              ...it,
              objectives: [
                ...it.objectives,
                { id: uid("o"), text: text.trim(), done: false },
              ],
            }
          : it,
      ),
    );
  }, []);

  const updateObjective = useCallback(
    (taskId: string, objectiveId: string, text: string) => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === taskId && it.kind === "task"
            ? {
                ...it,
                objectives: it.objectives.map((o) =>
                  o.id === objectiveId ? { ...o, text } : o,
                ),
              }
            : it,
        ),
      );
    },
    [],
  );

  const toggleObjective = useCallback(
    (taskId: string, objectiveId: string) => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === taskId && it.kind === "task"
            ? {
                ...it,
                objectives: it.objectives.map((o) =>
                  o.id === objectiveId && !o.promotedToTaskId
                    ? { ...o, done: !o.done }
                    : o,
                ),
              }
            : it,
        ),
      );
    },
    [],
  );

  const deleteObjective = useCallback(
    (taskId: string, objectiveId: string) => {
      setItems((prev) => {
        const target = prev.find((x) => x.id === taskId);
        if (!target || target.kind !== "task") return prev;
        const obj = target.objectives.find((o) => o.id === objectiveId);
        const subId = obj?.promotedToTaskId;
        return prev.map((it) => {
          if (it.id === taskId && it.kind === "task") {
            return {
              ...it,
              objectives: it.objectives.filter((o) => o.id !== objectiveId),
            };
          }
          // unlink the orphaned sub-quest, if any
          if (subId && it.id === subId && it.kind === "task") {
            return appendLog(
              { ...it, parentTaskRef: undefined },
              "note",
              "Parent quest removed the originating step. This quest now stands alone.",
            );
          }
          return it;
        });
      });
    },
    [],
  );

  // Take an objective and spin it out into its own quest. The objective
  // gains a link to the new quest (and becomes auto-managed); the new
  // quest is created as a sibling under the same folder. Both sides get
  // journal entries.
  const promoteObjective = useCallback(
    (taskId: string, objectiveId: string): string | null => {
      const newId = uid("t");
      let didPromote = false;
      setItems((prev) => {
        const parent = prev.find((x) => x.id === taskId);
        if (!parent || parent.kind !== "task") return prev;
        const obj = parent.objectives.find((o) => o.id === objectiveId);
        if (!obj || obj.promotedToTaskId) return prev;

        const now = Date.now();
        const newTask: TaskItem = {
          id: newId,
          parentId: parent.parentId,
          kind: "task",
          title: obj.text.trim() || "New sub-quest",
          description: "",
          objectives: [],
          status: "active",
          createdAt: now,
          log: [
            {
              id: uid("j"),
              at: now,
              kind: "started",
              text: `Promoted from a step in "${parent.title || "Untitled quest"}".`,
            },
          ],
          parentTaskRef: { taskId: parent.id, objectiveId: obj.id },
        };
        didPromote = true;

        const withNew = expandParent(parent.parentId, prev).concat(newTask);
        return withNew.map((it) => {
          if (it.id === taskId && it.kind === "task") {
            const updated: TaskItem = {
              ...it,
              objectives: it.objectives.map((o) =>
                o.id === objectiveId ? { ...o, promotedToTaskId: newId } : o,
              ),
            };
            return appendLog(
              updated,
              "promoted",
              `"${obj.text || "A step"}" turned out to be its own undertaking. Tracking it as a sub-quest.`,
            );
          }
          return it;
        });
      });
      if (!didPromote) return null;
      setSelectedId(newId);
      return newId;
    },
    [],
  );

  // The "Skyrim moment": you finish one thing and realize the quest is bigger
  // than you thought. Adds a narrative entry to the log alongside any number
  // of new objectives, all from a single update.
  const revealObjectives = useCallback(
    (taskId: string, narrative: string, texts: string[]) => {
      const cleaned = texts.map((t) => t.trim()).filter(Boolean);
      if (cleaned.length === 0 && !narrative.trim()) return;
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== taskId || it.kind !== "task") return it;
          const additions = cleaned.map((text) => ({
            id: uid("o"),
            text,
            done: false,
          }));
          const story =
            narrative.trim() ||
            (cleaned.length === 1
              ? "A new step revealed itself."
              : "The quest grows. New steps revealed.");
          return appendLog(
            {
              ...it,
              objectives: [...it.objectives, ...additions],
            },
            "expanded",
            story,
          );
        }),
      );
    },
    [],
  );

  const addJournalNote = useCallback((taskId: string, text: string) => {
    if (!text.trim()) return;
    setItems((prev) =>
      prev.map((it) =>
        it.id === taskId && it.kind === "task"
          ? appendLog(it, "note", text.trim())
          : it,
      ),
    );
  }, []);

  const deleteJournalEntry = useCallback(
    (taskId: string, entryId: string) => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === taskId && it.kind === "task"
            ? { ...it, log: it.log.filter((e) => e.id !== entryId) }
            : it,
        ),
      );
    },
    [],
  );

  const value: StoreContextValue = {
    items,
    selectedId,
    filter,
    hydrated,
    tree,
    selectedTask,
    pathOf,
    taskById,
    select,
    setFilter,
    createTask,
    createFolder,
    updateFolder,
    updateTask,
    deleteItem,
    toggleExpanded,
    toggleStatus,
    addObjective,
    updateObjective,
    toggleObjective,
    deleteObjective,
    promoteObjective,
    revealObjectives,
    addJournalNote,
    deleteJournalEntry,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
