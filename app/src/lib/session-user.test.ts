import assert from "node:assert/strict";
import test from "node:test";
import { resolveActiveSessionUser } from "./session-user";

test("inactive or deleted users cannot keep using an authenticated session", () => {
  const sessionUser = { id: "user-1", role: "ADMIN", isActive: true };

  assert.equal(
    resolveActiveSessionUser(sessionUser, { id: "user-1", role: "USER", isActive: false }),
    null
  );
  assert.equal(resolveActiveSessionUser(sessionUser, null), null);
});

test("database role overrides stale role stored in session", () => {
  const result = resolveActiveSessionUser(
    { id: "user-1", name: "ASM", role: "ADMIN" },
    { id: "user-1", role: "USER", isActive: true }
  );

  assert.equal(result?.role, "USER");
  assert.equal(result?.name, "ASM");
});
