export type JournalEntryKind =
  | "started"
  | "expanded"
  | "promoted"
  | "resolved"
  | "reopened"
  | "note";

export type JournalEntry = {
  id: string;
  at: number;
  kind: JournalEntryKind;
  text: string;
};

export type Objective = {
  id: string;
  text: string;
  done: boolean;
  promotedToTaskId?: string;
};

export type TaskStatus = "active" | "completed";

export type FolderItem = {
  id: string;
  parentId: string | null;
  kind: "folder";
  name: string;
  createdAt: number;
  expanded: boolean;
};

export type TaskParentRef = {
  taskId: string;
  objectiveId: string;
};

export type TaskItem = {
  id: string;
  parentId: string | null;
  kind: "task";
  title: string;
  description: string;
  objectives: Objective[];
  status: TaskStatus;
  createdAt: number;
  log: JournalEntry[];
  parentTaskRef?: TaskParentRef;
};

export type Item = FolderItem | TaskItem;

export type FolderTreeNode = FolderItem & {
  children: TreeNode[];
  depth: number;
};

export type TaskTreeNode = TaskItem & {
  depth: number;
};

export type TreeNode = FolderTreeNode | TaskTreeNode;

export type StatusFilter = "all" | "active" | "completed";
