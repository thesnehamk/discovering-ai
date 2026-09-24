import type { TaskRepository } from "../types.js";
import { InMemoryTaskRepository } from "./InMemoryTaskRepository.js";
import { DynamoDbTaskRepository } from "./DynamoDbTaskRepository.js";

/**
 * Single switch point for the production swap-in: set STORAGE_BACKEND=dynamodb
 * (plus TASKS_TABLE_NAME / AWS_REGION) and every tool starts writing through
 * DynamoDbTaskRepository instead, with zero changes anywhere else.
 */
export function createTaskRepository(): TaskRepository {
  const backend = (process.env.STORAGE_BACKEND ?? "memory").toLowerCase();

  switch (backend) {
    case "dynamodb":
      return new DynamoDbTaskRepository();
    case "memory":
      return new InMemoryTaskRepository();
    default:
      throw new Error(
        `Unknown STORAGE_BACKEND "${backend}". Expected "memory" or "dynamodb".`
      );
  }
}
