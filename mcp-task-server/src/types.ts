export type TaskStatus = "open" | "completed";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string;
}

export interface ListTasksOptions {
  status?: TaskStatus | "all";
  limit: number;
  offset: number;
}

export interface ListTasksResult {
  tasks: Task[];
  total: number;
}

/**
 * Storage-agnostic contract the MCP tools are written against. Swapping the
 * backing store (in-memory -> DynamoDB, or anything else) means writing a
 * new implementation of this interface — the tool handlers and their
 * input/output schemas never change.
 */
export interface TaskRepository {
  createTask(input: { title: string; description?: string }): Promise<Task>;
  getTask(id: string): Promise<Task | undefined>;
  listTasks(options: ListTasksOptions): Promise<ListTasksResult>;
  completeTask(id: string): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;
}
