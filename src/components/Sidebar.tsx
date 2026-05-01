"use client";

import { useStore } from "@/lib/store";
import type { TreeNode } from "@/lib/types";

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      style={{
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 120ms ease",
      }}
      aria-hidden
    >
      <path d="M3 1 L7 5 L3 9 Z" fill="currentColor" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M2 4.5C2 3.67 2.67 3 3.5 3h3.1c.4 0 .78.16 1.06.44L8.5 4.3h4c.83 0 1.5.67 1.5 1.5v6.7c0 .83-.67 1.5-1.5 1.5h-9c-.83 0-1.5-.67-1.5-1.5V4.5Z"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  );
}

function TaskRow({ node }: { node: Extract<TreeNode, { kind: "task" }> }) {
  const { selectedId, select, toggleStatus, deleteItem } = useStore();
  const isSelected = selectedId === node.id;
  const total = node.objectives.length;
  const done = node.objectives.filter((o) => o.done).length;
  const isCompleted = node.status === "completed";
  const isSubQuest = !!node.parentTaskRef;

  return (
    <div
      className={`tree-row group flex items-center gap-2 pr-2 py-[7px] ${isSelected ? "selected" : ""}`}
      style={{ paddingLeft: 8 + node.depth * 16 }}
      onClick={() => select(node.id)}
    >
      <input
        type="checkbox"
        className="objective-check ml-[2px]"
        checked={isCompleted}
        onChange={(e) => {
          e.stopPropagation();
          toggleStatus(node.id);
        }}
        onClick={(e) => e.stopPropagation()}
      />
      {isSubQuest && (
        <span
          className="text-text-faint text-[12px] shrink-0 -mr-1"
          title="Sub-quest"
        >
          ↳
        </span>
      )}
      <span
        className={`text-[13.5px] truncate flex-1 ${isCompleted ? "struck" : ""}`}
      >
        {node.title || (
          <span className="italic text-text-faint">New task</span>
        )}
      </span>
      {total > 0 && !isCompleted && (
        <span className="text-[11px] text-text-faint tabular-nums">
          {done}/{total}
        </span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`Delete "${node.title || "this task"}"?`)) {
            deleteItem(node.id);
          }
        }}
        className="opacity-0 group-hover:opacity-100 text-text-faint hover:text-danger text-base leading-none px-1 transition-opacity"
        aria-label="Delete task"
        title="Delete"
      >
        ×
      </button>
    </div>
  );
}

function FolderRow({
  node,
}: {
  node: Extract<TreeNode, { kind: "folder" }>;
}) {
  const {
    selectedId,
    select,
    toggleExpanded,
    createTask,
    createFolder,
    deleteItem,
    updateFolder,
  } = useStore();
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className={`tree-row group flex items-center gap-1.5 pr-2 py-[7px] ${isSelected ? "selected" : ""}`}
        style={{ paddingLeft: 8 + node.depth * 16 }}
        onClick={() => {
          select(node.id);
          toggleExpanded(node.id);
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded(node.id);
          }}
          className="w-4 h-4 grid place-items-center text-text-faint hover:text-text shrink-0"
          aria-label="Toggle folder"
        >
          <Caret open={node.expanded} />
        </button>

        <span className="text-text-soft shrink-0">
          <FolderIcon />
        </span>

        <input
          className="bare flex-1 text-[13.5px] font-medium"
          value={node.name}
          placeholder="New folder"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => updateFolder(node.id, { name: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />

        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              createTask(node.id);
            }}
            className="text-text-faint hover:text-accent text-base leading-none px-1.5"
            title="New task in this folder"
            aria-label="New task"
          >
            +
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              createFolder(node.id);
            }}
            className="text-text-faint hover:text-accent leading-none px-1"
            title="New sub-folder"
            aria-label="New sub-folder"
          >
            <FolderIcon />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (
                confirm(
                  `Delete folder "${node.name || "Untitled"}" and everything inside?`,
                )
              ) {
                deleteItem(node.id);
              }
            }}
            className="text-text-faint hover:text-danger text-base leading-none px-1"
            title="Delete folder"
            aria-label="Delete folder"
          >
            ×
          </button>
        </div>
      </div>

      {node.expanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) =>
            child.kind === "folder" ? (
              <FolderRow key={child.id} node={child} />
            ) : (
              <TaskRow key={child.id} node={child} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { tree, createTask, createFolder, hydrated, filter } = useStore();

  return (
    <aside className="w-[300px] shrink-0 h-full flex flex-col border-r border-border bg-pane-soft">
      <div className="px-5 pt-5 pb-3">
        <h1 className="text-[15px] font-semibold tracking-tight">Tasks</h1>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin px-1.5 pb-3">
        {!hydrated ? (
          <div className="px-3 py-6 text-[13px] text-text-faint">Loading…</div>
        ) : tree.length === 0 ? (
          <div className="px-3 py-6 text-[13px] text-text-faint">
            {filter === "completed"
              ? "Nothing completed yet."
              : filter === "active"
                ? "No active tasks. Create one below."
                : "No tasks yet. Create one below."}
          </div>
        ) : (
          tree.map((node) =>
            node.kind === "folder" ? (
              <FolderRow key={node.id} node={node} />
            ) : (
              <TaskRow key={node.id} node={node} />
            ),
          )
        )}
      </div>

      <div className="border-t border-border p-2 flex gap-1.5">
        <button
          onClick={() => createTask(null)}
          className="btn-quiet primary flex-1 justify-center"
        >
          + New Task
        </button>
        <button
          onClick={() => createFolder(null)}
          className="btn-quiet"
          title="New folder"
          aria-label="New folder"
        >
          <FolderIcon />
        </button>
      </div>
    </aside>
  );
}
