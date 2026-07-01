import assert from "node:assert/strict";
import test from "node:test";
import { taskListQuerySchema } from "./task";

test("taskListQuerySchema parses page and limit correctly", () => {
  const result = taskListQuerySchema.parse({
    page: "2",
    limit: "10",
  });

  assert.equal(result.page, 2);
  assert.equal(result.limit, 10);
});

test("taskListQuerySchema uses default page and limit values", () => {
  const result = taskListQuerySchema.parse({});

  assert.equal(result.page, 1);
  assert.equal(result.limit, 50);
});

test("taskListQuerySchema filters status and priority correctly", () => {
  const result = taskListQuerySchema.parse({
    status: "IN_PROGRESS",
    priority: "HIGH",
  });

  assert.equal(result.status, "IN_PROGRESS");
  assert.equal(result.priority, "HIGH");
});

test("taskListQuerySchema rejects invalid status and priority", () => {
  const invalidStatus = taskListQuerySchema.safeParse({ status: "INVALID_STATUS" });
  const invalidPriority = taskListQuerySchema.safeParse({ priority: "INVALID_PRIORITY" });

  assert.equal(invalidStatus.success, false);
  assert.equal(invalidPriority.success, false);
});
