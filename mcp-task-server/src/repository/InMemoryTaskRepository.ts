import { randomUUID } from "node:crypto";
import type {
  ListTasksOptions,
  ListTasksResult,
  Task,
  TaskRepository,
} from "../types.js";

/**
 * Default backend for local development and tests. Data lives only for the
 * lifetime of the process — restarting the server clears all tasks.
 */
export class InMemoryTaskRepository implements TaskRepository {
  private tasks = new Map<string, Task>();

  async createTask(input: { title: string; description?: string }): Promise<Task> {
    const task: Task = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      status: "open",
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async listTasks(options: ListTasksOptions): Promise<ListTasksResult> {
    const all = Array.from(this.tasks.values()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );
    const filtered =
      !options.status || options.status === "all"
        ? all
        : all.filter((t) => t.status === options.status);

    const page = filtered.slice(options.offset, options.offset + options.limit);
    return { tasks: page, total: filtered.length };
  }

  async completeTask(id: string): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const updated: Task = {
      ...task,
      status: "completed",
      completedAt: new Date().toISOString(),
    };
    this.tasks.set(id, updated);
    return updated;
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }
}
