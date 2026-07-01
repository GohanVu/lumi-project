import assert from "node:assert/strict";
import test from "node:test";
import {
  companyListQuerySchema,
  createCompanySchema,
  updateCompanySchema,
} from "./company";

test("company schema trims text and rejects whitespace-only names", () => {
  const invalid = createCompanySchema.safeParse({ name: "   " });
  const valid = createCompanySchema.safeParse({
    name: "  Công ty LUMI  ",
    taxCode: " 0123456789 ",
  });

  assert.equal(invalid.success, false);
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.name, "Công ty LUMI");
    assert.equal(valid.data.taxCode, "0123456789");
  }
});

test("company list rejects unknown status before it reaches Prisma", () => {
  assert.equal(companyListQuerySchema.safeParse({ status: "UNKNOWN" }).success, false);
  assert.equal(companyListQuerySchema.safeParse({ status: "ACTIVE" }).success, true);
});

test("company update rejects empty payload and blank assignee", () => {
  assert.equal(updateCompanySchema.safeParse({}).success, false);
  assert.equal(updateCompanySchema.safeParse({ assignedToId: "   " }).success, false);
  assert.equal(updateCompanySchema.safeParse({ phone: "" }).success, true);
});
