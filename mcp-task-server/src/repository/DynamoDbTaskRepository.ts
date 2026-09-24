import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type {
  ListTasksOptions,
  ListTasksResult,
  Task,
  TaskRepository,
} from "../types.js";

/**
 * Production backend. Same TaskRepository contract as
 * InMemoryTaskRepository — swapping which one gets instantiated in
 * src/index.ts is the entire migration; no tool or schema code changes.
 *
 * Table layout: single table, partition key "id" (string). listTasks()
 * uses a Scan with a FilterExpression, which is fine at demo/small-table
 * scale but not how this would be built past that: a real production
 * deployment would add a GSI on (status, createdAt) and switch listTasks
 * to a Query with cursor-based pagination (ExclusiveStartKey) instead of
 * scanning the whole table and slicing by numeric offset in memory.
 */
export class DynamoDbTaskRepository implements TaskRepository {
  private readonly doc: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(options?: { tableName?: string; region?: string }) {
    this.tableName = options?.tableName ?? process.env.TASKS_TABLE_NAME ?? "mcp-tasks";
    const client = new DynamoDBClient({ region: options?.region ?? process.env.AWS_REGION });
    this.doc = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  async createTask(input: { title: string; description?: string }): Promise<Task> {
    const task: Task = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      status: "open",
      createdAt: new Date().toISOString(),
    };
    await this.doc.send(
      new PutCommand({ TableName: this.tableName, Item: task })
    );
    return task;
  }

  async getTask(id: string): Promise<Task | undefined> {
    const result = await this.doc.send(
      new GetCommand({ TableName: this.tableName, Key: { id } })
    );
    return result.Item as Task | undefined;
  }

  async listTasks(options: ListTasksOptions): Promise<ListTasksResult> {
    const scanParams: ConstructorParameters<typeof ScanCommand>[0] = {
      TableName: this.tableName,
    };
    if (options.status && options.status !== "all") {
      scanParams.FilterExpression = "#status = :status";
      scanParams.ExpressionAttributeNames = { "#status": "status" };
      scanParams.ExpressionAttributeValues = { ":status": options.status };
    }

    const result = await this.doc.send(new ScanCommand(scanParams));
    const all = ((result.Items ?? []) as Task[]).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );

    const page = all.slice(options.offset, options.offset + options.limit);
    return { tasks: page, total: all.length };
  }

  async completeTask(id: string): Promise<Task | undefined> {
    const existing = await this.getTask(id);
    if (!existing) return undefined;

    const completedAt = new Date().toISOString();
    await this.doc.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: "SET #status = :status, completedAt = :completedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":status": "completed", ":completedAt": completedAt },
      })
    );
    return { ...existing, status: "completed", completedAt };
  }

  async deleteTask(id: string): Promise<boolean> {
    const existing = await this.getTask(id);
    if (!existing) return false;
    await this.doc.send(
      new DeleteCommand({ TableName: this.tableName, Key: { id } })
    );
    return true;
  }
}
