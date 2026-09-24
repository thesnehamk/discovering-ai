import { z } from "zod";
import { DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT } from "../constants.js";

export const CreateTaskInputSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(200, "Title must not exceed 200 characters")
      .describe("Short summary of the task"),
    description: z
      .string()
      .max(2000, "Description must not exceed 2000 characters")
      .optional()
      .describe("Optional longer-form detail about the task"),
  })
  .strict();

export const ListTasksInputSchema = z
  .object({
    status: z
      .enum(["open", "completed", "all"])
      .default("all")
      .describe("Filter by task status, or 'all' for every task"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_LIST_LIMIT)
      .default(DEFAULT_LIST_LIMIT)
      .describe(`Maximum tasks to return (1-${MAX_LIST_LIMIT})`),
    offset: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe("Number of tasks to skip, for pagination"),
  })
  .strict();

export const CompleteTaskInputSchema = z
  .object({
    id: z.string().uuid("id must be a valid task id").describe("ID of the task to mark completed"),
  })
  .strict();

export const DeleteTaskInputSchema = z
  .object({
    id: z.string().uuid("id must be a valid task id").describe("ID of the task to delete"),
  })
  .strict();

export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;
export type ListTasksInput = z.infer<typeof ListTasksInputSchema>;
export type CompleteTaskInput = z.infer<typeof CompleteTaskInputSchema>;
export type DeleteTaskInput = z.infer<typeof DeleteTaskInputSchema>;
