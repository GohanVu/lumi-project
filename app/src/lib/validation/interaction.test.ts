import assert from "node:assert/strict";
import test from "node:test";
import {
  createInteractionSchema,
  interactionFormSchema,
} from "./interaction";

test("interaction form accepts all supported interaction types", () => {
  const supportedTypes = ["CALL", "VISIT", "EMAIL", "MEETING", "ZALO", "OTHER"];

  for (const type of supportedTypes) {
    assert.equal(
      interactionFormSchema.safeParse({
        type,
        content: "Đã trao đổi",
        followUpAt: "",
      }).success,
      true
    );
  }
});

test("interaction form rejects blank content", () => {
  const result = interactionFormSchema.safeParse({
    type: "CALL",
    content: "   ",
    followUpAt: "",
  });

  assert.equal(result.success, false);
});

test("interaction API requires an ISO follow-up timestamp", () => {
  const invalid = createInteractionSchema.safeParse({
    type: "MEETING",
    content: "Chốt lịch demo",
    followUpAt: "2026-06-30T09:00",
  });
  const valid = createInteractionSchema.safeParse({
    type: "MEETING",
    content: "Chốt lịch demo",
    followUpAt: "2026-06-30T02:00:00.000Z",
  });

  assert.equal(invalid.success, false);
  assert.equal(valid.success, true);
});

test("interaction schemas trim text fields", () => {
  const result = createInteractionSchema.parse({
    type: "EMAIL",
    content: "  Đã gửi báo giá  ",
    result: "  Chờ phản hồi  ",
    contactName: "  Nguyễn Văn A  ",
  });

  assert.equal(result.content, "Đã gửi báo giá");
  assert.equal(result.result, "Chờ phản hồi");
  assert.equal(result.contactName, "Nguyễn Văn A");
});
