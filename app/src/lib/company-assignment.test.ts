import assert from "node:assert/strict";
import test from "node:test";
import { resolveCompanyAssigneeId } from "./company-assignment";

test("regular user is assigned to their own company when form value is missing", () => {
  const result = resolveCompanyAssigneeId({ id: "user-1", role: "USER" });

  assert.equal(result, "user-1");
});

test("regular user cannot assign a company to another user", () => {
  const result = resolveCompanyAssigneeId(
    { id: "user-1", role: "USER" },
    "user-2"
  );

  assert.equal(result, "user-1");
});

test("admin can choose an active assignee", () => {
  const result = resolveCompanyAssigneeId(
    { id: "admin-1", role: "ADMIN" },
    "user-2"
  );

  assert.equal(result, "user-2");
});

test("admin must provide an assignee", () => {
  const result = resolveCompanyAssigneeId(
    { id: "admin-1", role: "ADMIN" },
    ""
  );

  assert.equal(result, null);
});
