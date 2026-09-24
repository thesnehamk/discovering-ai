import assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryTaskRepository } from "../src/repository/InMemoryTaskRepository.js";

test("createTask returns an open task with an id", async () => {
  const repo = new InMemoryTaskRepository();
  const task = await repo.createTask({ title: "Write tests" });

  assert.equal(task.title, "Write tests");
  assert.equal(task.status, "open");
  assert.ok(task.id);
  assert.ok(task.createdAt);
});

test("listTasks filters by status and paginates", async () => {
  const repo = new InMemoryTaskRepository();
  const a = await repo.createTask({ title: "A" });
  await repo.createTask({ title: "B" });
  const c = await repo.createTask({ title: "C" });
  await repo.completeTask(a.id);

  const openOnly = await repo.listTasks({ status: "open", limit: 20, offset: 0 });
  assert.equal(openOnly.total, 2);
  assert.deepEqual(
    openOnly.tasks.map((t) => t.title),
    ["B", "C"]
  );

  const paged = await repo.listTasks({ status: "all", limit: 1, offset: 1 });
  assert.equal(paged.total, 3);
  assert.equal(paged.tasks.length, 1);
  assert.equal(paged.tasks[0]?.title, "B");

  assert.ok(c.id);
});

test("completeTask sets status and completedAt, returns undefined for unknown id", async () => {
  const repo = new InMemoryTaskRepository();
  const task = await repo.createTask({ title: "Ship it" });

  const completed = await repo.completeTask(task.id);
  assert.equal(completed?.status, "completed");
  assert.ok(completed?.completedAt);

  const missing = await repo.completeTask("00000000-0000-0000-0000-000000000000");
  assert.equal(missing, undefined);
});

test("deleteTask removes the task and reports whether it existed", async () => {
  const repo = new InMemoryTaskRepository();
  const task = await repo.createTask({ title: "Temp" });

  assert.equal(await repo.deleteTask(task.id), true);
  assert.equal(await repo.getTask(task.id), undefined);
  assert.equal(await repo.deleteTask(task.id), false);
});
