import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Task, TaskRepository } from "../types.js";
import { CHARACTER_LIMIT } from "../constants.js";
import {
  CompleteTaskInputSchema,
  CreateTaskInputSchema,
  DeleteTaskInputSchema,
  ListTasksInputSchema,
} from "../schemas/taskSchemas.js";

function toolText(payload: unknown): { content: { type: "text"; text: string }[] } {
  let text = JSON.stringify(payload, null, 2);
  if (text.length > CHARACTER_LIMIT) {
    text = JSON.stringify(
      { error: "Response too large", hint: "Narrow your query with 'status' or 'limit'." },
      null,
      2
    );
  }
  return { content: [{ type: "text", text }] };
}

function errorResult(message: string) {
  return { isError: true as const, content: [{ type: "text" as const, text: `Error: ${message}` }] };
}

/** Registers the create/list/complete/delete task tools against the given repository. */
export function registerTaskTools(server: McpServer, repository: TaskRepository): void {
  server.registerTool(
    "create_task",
    {
      title: "Create Task",
      description: `Create a new task.

Args:
  - title (string, required): short summary of the task, 1-200 characters
  - description (string, optional): longer-form detail, up to 2000 characters

Returns the created task, including its generated id (needed for
complete_task / delete_task) and status "open".`,
      inputSchema: CreateTaskInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ title, description }) => {
      const task = await repository.createTask({ title, description });
      return toolText({ task } satisfies { task: Task });
    }
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List Tasks",
      description: `List tasks, optionally filtered by status, with pagination.

Args:
  - status ('open' | 'completed' | 'all', default 'all'): filter by status
  - limit (number, default 20, max 100): maximum tasks to return
  - offset (number, default 0): number of tasks to skip

Returns:
  {
    "total": number,       // total tasks matching the filter
    "count": number,       // tasks in this page
    "offset": number,
    "has_more": boolean,
    "tasks": Task[]
  }`,
      inputSchema: ListTasksInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ status, limit, offset }) => {
      const { tasks, total } = await repository.listTasks({ status, limit, offset });
      return toolText({
        total,
        count: tasks.length,
        offset,
        has_more: total > offset + tasks.length,
        tasks,
      });
    }
  );

  server.registerTool(
    "complete_task",
    {
      title: "Complete Task",
      description: `Mark a task as completed.

Args:
  - id (string, required): the task's id, as returned by create_task or list_tasks

Returns the updated task with status "completed" and a completedAt
timestamp. Returns an error if no task with that id exists.`,
      inputSchema: CompleteTaskInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id }) => {
      const task = await repository.completeTask(id);
      if (!task) {
        return errorResult(`No task found with id "${id}". Use list_tasks to find valid ids.`);
      }
      return toolText({ task });
    }
  );

  server.registerTool(
    "delete_task",
    {
      title: "Delete Task",
      description: `Permanently delete a task.

Args:
  - id (string, required): the task's id, as returned by create_task or list_tasks

Returns a confirmation. Returns an error if no task with that id exists.
This cannot be undone.`,
      inputSchema: DeleteTaskInputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ id }) => {
      const deleted = await repository.deleteTask(id);
      if (!deleted) {
        return errorResult(`No task found with id "${id}". Use list_tasks to find valid ids.`);
      }
      return toolText({ deleted: true, id });
    }
  );
}
