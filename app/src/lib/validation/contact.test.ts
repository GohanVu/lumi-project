import assert from "node:assert/strict";
import test from "node:test";
import {
  contactFormSchema,
  createContactSchema,
  updateContactSchema,
} from "./contact";

test("contact form requires an explicit primary-contact value", () => {
  const result = contactFormSchema.safeParse({ fullName: "Nguyễn Văn A" });

  assert.equal(result.success, false);
});

test("contact API defaults isPrimary to false", () => {
  const result = createContactSchema.parse({ fullName: "Nguyễn Văn A" });

  assert.equal(result.isPrimary, false);
});

test("contact schemas reject unsupported influence values", () => {
  const createResult = createContactSchema.safeParse({
    fullName: "Nguyễn Văn A",
    influence: "very-high",
  });
  const updateResult = updateContactSchema.safeParse({ influence: "very-high" });

  assert.equal(createResult.success, false);
  assert.equal(updateResult.success, false);
});

test("contact form trims user-entered text", () => {
  const result = contactFormSchema.parse({
    fullName: "  Nguyễn Văn A  ",
    position: "  Giám đốc  ",
    isPrimary: true,
  });

  assert.equal(result.fullName, "Nguyễn Văn A");
  assert.equal(result.position, "Giám đốc");
});
