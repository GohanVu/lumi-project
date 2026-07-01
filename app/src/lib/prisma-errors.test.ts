import assert from "node:assert/strict";
import test from "node:test";
import { hasPrismaErrorCode } from "./prisma-errors";

test("Prisma error guard recognizes unique constraint races", () => {
  assert.equal(hasPrismaErrorCode({ code: "P2002" }, "P2002"), true);
  assert.equal(hasPrismaErrorCode({ code: "P2025" }, "P2002"), false);
  assert.equal(hasPrismaErrorCode(new Error("database failed"), "P2002"), false);
});
