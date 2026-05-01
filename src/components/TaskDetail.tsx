"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { JournalEntry, Objective, TaskItem } from "@/lib/types";

function formatStamp(ms: number) {
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ObjectiveRow({
  task,
  objective,
}: {
  task: TaskItem;
  objective: Objective;
}) {
  const {
    toggleObjective,
    updateObjective,
    deleteObjective,
    promoteObjective,
    taskById,
    select,
  } = useStore();
  const [text, setText] = useState(objective.text);

  useEffect(() => setText(objective.text), [objective.text]);

  const subQuest = objective.promotedToTaskId
    ? taskById(objective.promotedToTaskId)
    : null;

  if (subQuest) {
    const subDone = subQuest.status === "completed";
    return (
      <li className="group flex items-start gap-3 py-1.5">
        <span
          className={`objective-check linked mt-[5px] ${subDone ? "linked-done" : ""}`}
          aria-hidden
          title="Auto-managed by sub-quest"
        />
        <button
          className={`bare flex-1 text-left text-[15px] leading-relaxed text-accent hover:underline ${subDone ? "struck" : ""}`}
          onClick={() => select(subQuest.id)}
          title="Open sub-quest"
        >
          <span className="opacity-60 mr-1">→</span>
          {subQuest.title || "Untitled sub-quest"}
        </button>
        <span className="text-[11px] text-text-faint italic shrink-0 mt-[5px]">
          sub-quest
        </span>
        <button
          onClick={() => deleteObjective(task.id, objective.id)}
          className="opacity-0 group-hover:opacity-100 text-text-faint hover:text-danger transition-opacity"
          aria-label="Remove step"
          title="Remove (sub-quest will become standalone)"
        >
          ×
        </button>
      </li>
    );
  }

  return (
    <li className="group flex items-start gap-3 py-1.5">
      <input
        type="checkbox"
        className="objective-check mt-[5px]"
        checked={objective.done}
        onChange={() => toggleObjective(task.id, objective.id)}
      />
      <input
        className={`bare flex-1 text-[15px] leading-relaxed ${objective.done ? "struck" : ""}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text !== objective.text)
            updateObjective(task.id, objective.id, text);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setText(objective.text);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      <button
        onClick={() => {
          if (objective.done) return;
          promoteObjective(task.id, objective.id);
        }}
        disabled={objective.done}
        className="opacity-0 group-hover:opacity-100 text-text-faint hover:text-accent transition-opacity text-[12px] disabled:cursor-not-allowed disabled:hover:text-text-faint"
        title="This is its own quest"
        aria-label="Promote step to its own quest"
      >
        ↗ promote
      </button>
      <button
        onClick={() => deleteObjective(task.id, objective.id)}
        className="opacity-0 group-hover:opacity-100 text-text-faint hover:text-danger transition-opacity"
        aria-label="Remove step"
        title="Remove"
      >
        ×
      </button>
    </li>
  );
}

function NewObjectiveInput({ taskId }: { taskId: string }) {
  const { addObjective } = useStore();
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <li className="flex items-start gap-3 py-1.5 mt-1">
      <span className="objective-check pointer-events-none opacity-40 mt-[5px]" />
      <input
        ref={inputRef}
        className="bare flex-1 text-[15px] leading-relaxed"
        placeholder="Add a step…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim()) {
            addObjective(taskId, text);
            setText("");
            requestAnimationFrame(() => inputRef.current?.focus());
          }
        }}
      />
    </li>
  );
}

function QuestGrowsForm({
  taskId,
  onClose,
}: {
  taskId: string;
  onClose: () => void;
}) {
  const { revealObjectives } = useStore();
  const [narrative, setNarrative] = useState("");
  const [steps, setSteps] = useState<string[]>([""]);
  const firstRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  const submit = () => {
    const cleaned = steps.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length === 0 && !narrative.trim()) {
      onClose();
      return;
    }
    revealObjectives(taskId, narrative, cleaned);
    onClose();
  };

  return (
    <div className="quest-grows mt-4 p-4 rounded-lg border border-border bg-pane">
      <div className="text-[12px] font-semibold uppercase tracking-wider text-text-faint mb-2">
        The quest grows
      </div>
      <textarea
        ref={firstRef}
        className="bare text-[14px] leading-relaxed mb-3 block"
        placeholder="What did you discover? (e.g., &ldquo;The innkeeper said Esbern is hiding in the Ratway…&rdquo;)"
        value={narrative}
        rows={2}
        onChange={(e) => setNarrative(e.target.value)}
      />
      <div className="space-y-1.5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="objective-check pointer-events-none opacity-40 shrink-0" />
            <input
              className="bare flex-1 text-[14px]"
              placeholder={i === 0 ? "New step…" : "Another step…"}
              value={step}
              onChange={(e) => {
                const next = [...steps];
                next[i] = e.target.value;
                setSteps(next);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (i === steps.length - 1 && step.trim()) {
                    setSteps([...steps, ""]);
                  } else {
                    submit();
                  }
                }
              }}
            />
            {steps.length > 1 && (
              <button
                onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                className="text-text-faint hover:text-danger text-base leading-none px-1"
                aria-label="Remove this step"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-3">
        <button
          onClick={() => setSteps([...steps, ""])}
          className="text-[12px] text-text-faint hover:text-accent"
        >
          + another step
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-quiet">
            Cancel
          </button>
          <button onClick={submit} className="btn-quiet primary">
            Update quest
          </button>
        </div>
      </div>
    </div>
  );
}

const KIND_LABEL: Record<JournalEntry["kind"], string> = {
  started: "Started",
  expanded: "Updated",
  promoted: "Branched",
  resolved: "Resolved",
  reopened: "Reopened",
  note: "Note",
};

function QuestLog({ task }: { task: TaskItem }) {
  const { addJournalNote, deleteJournalEntry } = useStore();
  const [noteText, setNoteText] = useState("");
  const entries = useMemo(
    () => [...task.log].sort((a, b) => b.at - a.at),
    [task.log],
  );

  if (entries.length === 0 && !task.parentTaskRef) {
    // Compact form — quest hasn't evolved yet
    return (
      <div className="border-t border-border pt-5 mt-8">
        <div className="flex items-center gap-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-text-faint">
            Quest log
          </h3>
          <span className="text-[12px] text-text-faint">— no entries yet</span>
        </div>
        <input
          className="bare text-[14px] leading-relaxed mt-2 block"
          placeholder="Add a note to the log…"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && noteText.trim()) {
              addJournalNote(task.id, noteText);
              setNoteText("");
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-5 mt-8">
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-text-faint mb-3">
        Quest log
      </h3>
      <ol className="space-y-3">
        {entries.map((e) => (
          <li
            key={e.id}
            className={`group quest-log-entry quest-log-${e.kind} pl-3 border-l-2`}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-text-soft">
                {KIND_LABEL[e.kind]}
              </span>
              <span className="text-[11px] text-text-faint tabular-nums">
                {formatStamp(e.at)}
              </span>
              <button
                onClick={() => deleteJournalEntry(task.id, e.id)}
                className="ml-auto opacity-0 group-hover:opacity-100 text-text-faint hover:text-danger text-[11px] transition-opacity"
                title="Remove entry"
              >
                ×
              </button>
            </div>
            <p className="text-[14px] leading-relaxed text-text whitespace-pre-wrap">
              {e.text}
            </p>
          </li>
        ))}
      </ol>
      <input
        className="bare text-[14px] leading-relaxed mt-4 block"
        placeholder="Add a note to the log…"
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && noteText.trim()) {
            addJournalNote(task.id, noteText);
            setNoteText("");
          }
        }}
      />
    </div>
  );
}

function ParentLink({ task }: { task: TaskItem }) {
  const { taskById, select } = useStore();
  const ref = task.parentTaskRef;
  if (!ref) return null;
  const parent = taskById(ref.taskId);
  if (!parent) return null;
  return (
    <div className="text-[12px] text-text-soft mb-2 flex items-center gap-1.5">
      <span className="text-text-faint">↳ Part of</span>
      <button
        onClick={() => select(parent.id)}
        className="text-accent hover:underline"
      >
        {parent.title || "Untitled quest"}
      </button>
    </div>
  );
}

export function TaskDetail() {
  const {
    selectedTask,
    pathOf,
    updateTask,
    toggleStatus,
    createTask,
    hydrated,
  } = useStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [growsOpen, setGrowsOpen] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitle(selectedTask?.title ?? "");
    setDescription(selectedTask?.description ?? "");
    setGrowsOpen(false);
  }, [selectedTask?.id, selectedTask?.title, selectedTask?.description]);

  useEffect(() => {
    const el = notesRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [description, selectedTask?.id]);

  if (!hydrated) {
    return (
      <div className="flex-1 grid place-items-center text-text-faint">
        Loading…
      </div>
    );
  }

  if (!selectedTask) {
    return (
      <main className="flex-1 grid place-items-center px-12">
        <div className="text-center max-w-sm">
          <div className="text-[17px] font-semibold mb-1">No task selected</div>
          <p className="text-text-soft text-[14px] mb-5">
            Select a task from the list, or create a new one.
          </p>
          <button onClick={() => createTask(null)} className="btn-quiet primary">
            + New Task
          </button>
        </div>
      </main>
    );
  }

  const path = pathOf(selectedTask.id);
  const total = selectedTask.objectives.length;
  const done = selectedTask.objectives.filter((o) => o.done).length;
  const isCompleted = selectedTask.status === "completed";

  return (
    <main className="flex-1 min-h-0 overflow-y-auto scroll-thin">
      <div className="max-w-2xl mx-auto px-12 py-10">
        <div className="text-[12px] text-text-faint mb-3 truncate">{path}</div>

        <ParentLink task={selectedTask} />

        <div className="flex items-center gap-3 mb-3">
          <input
            type="checkbox"
            className="objective-check"
            checked={isCompleted}
            onChange={() => toggleStatus(selectedTask.id)}
            aria-label="Toggle task complete"
          />
          <input
            className={`bare text-[26px] font-semibold leading-tight tracking-tight flex-1 ${isCompleted ? "struck" : ""}`}
            placeholder="New task"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title !== selectedTask.title)
                updateTask(selectedTask.id, { title });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        </div>

        <textarea
          ref={notesRef}
          className="bare text-[14px] leading-relaxed text-text-soft mb-8 block overflow-hidden"
          placeholder="Notes"
          value={description}
          rows={1}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            if (description !== selectedTask.description)
              updateTask(selectedTask.id, { description });
          }}
        />

        <div className="border-t border-border pt-5">
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-text-faint">
              Steps
            </h3>
            {total > 0 && (
              <span className="text-[12px] text-text-faint tabular-nums">
                {done} of {total}
              </span>
            )}
          </div>

          <ul>
            {selectedTask.objectives.map((obj) => (
              <ObjectiveRow
                key={obj.id}
                task={selectedTask}
                objective={obj}
              />
            ))}
            <NewObjectiveInput taskId={selectedTask.id} />
          </ul>

          {growsOpen ? (
            <QuestGrowsForm
              taskId={selectedTask.id}
              onClose={() => setGrowsOpen(false)}
            />
          ) : (
            <button
              onClick={() => setGrowsOpen(true)}
              className="mt-3 text-[12px] text-text-faint hover:text-accent"
            >
              ✦ The quest grows…
            </button>
          )}
        </div>

        <QuestLog task={selectedTask} />
      </div>
    </main>
  );
}
