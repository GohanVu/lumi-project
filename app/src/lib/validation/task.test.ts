import assert from "node:assert/strict";
import test from "node:test";
import {
  taskFormSchema,
  createTaskSchema,
  updateTaskSchema,
} from "./task";

test("task form rejects empty title", () => {
  const result = taskFormSchema.safeParse({
    title: "   ",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    dueDate: "",
  });
  assert.equal(result.success, false);
  assert.ok(result.error?.errors[0]?.message?.includes("Tiêu đề"));
});

test("task form accepts all valid status and priority values", () => {
  const statuses = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"];
  const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

  for (const status of statuses) {
    for (const priority of priorities) {
      const result = taskFormSchema.safeParse({
        title: "Kiểm tra định kỳ",
        description: "",
        status,
        priority,
        dueDate: "",
      });
      assert.equal(result.success, true, `status=${status} priority=${priority} phải hợp lệ`);
    }
  }
});

test("task API requires ISO datetime for dueDate", () => {
  const invalidDueDate = createTaskSchema.safeParse({
    title: "Gặp mặt",
    dueDate: "2026-07-01T09:00",
  });
  const validDueDate = createTaskSchema.safeParse({
    title: "Gặp mặt",
    dueDate: "2026-07-01T02:00:00.000Z",
  });
  const noDueDate = createTaskSchema.safeParse({
    title: "Gặp mặt",
  });

  assert.equal(invalidDueDate.success, false, "datetime-local không có offset phải bị từ chối");
  assert.equal(validDueDate.success, true, "ISO string hợp lệ phải được chấp nhận");
  assert.equal(noDueDate.success, true, "không có deadline phải hợp lệ");
});

test("update task schema requires at least one field", () => {
  const empty = updateTaskSchema.safeParse({});
  const withStatus = updateTaskSchema.safeParse({ status: "DONE" });
  const withTitle = updateTaskSchema.safeParse({ title: "Tiêu đề mới" });

  assert.equal(empty.success, false, "object rỗng phải bị từ chối");
  assert.equal(withStatus.success, true, "chỉ cập nhật status phải hợp lệ");
  assert.equal(withTitle.success, true, "chỉ cập nhật title phải hợp lệ");
});
