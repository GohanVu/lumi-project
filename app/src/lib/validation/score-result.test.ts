import assert from "node:assert/strict";
import test from "node:test";
import {
  createScoreResultSchema,
  overrideScoreFormSchema,
  overrideScoreSchema,
  scoreFormSchema,
} from "./score-result";

test("score submission accepts partial manual scores", () => {
  const result = createScoreResultSchema.safeParse({
    templateId: "template-1",
    missingDataPolicy: "EXCLUDE",
    details: [
      { criteriaId: "criteria-1", score: 8, note: "Dữ liệu hồ sơ" },
      { criteriaId: "criteria-2", score: null },
    ],
  });

  assert.equal(result.success, true);
});

test("score submission rejects a result without any score", () => {
  const result = createScoreResultSchema.safeParse({
    templateId: "template-1",
    details: [{ criteriaId: "criteria-1", score: null }],
  });

  assert.equal(result.success, false);
});

test("score submission rejects duplicated criteria", () => {
  const result = createScoreResultSchema.safeParse({
    templateId: "template-1",
    details: [
      { criteriaId: "criteria-1", score: 5 },
      { criteriaId: "criteria-1", score: 7 },
    ],
  });

  assert.equal(result.success, false);
});

test("score form rejects negative and non-numeric values", () => {
  const negative = scoreFormSchema.safeParse({
    missingDataPolicy: "ZERO",
    details: [{ criteriaId: "criteria-1", score: "-1", note: "" }],
  });
  const text = scoreFormSchema.safeParse({
    missingDataPolicy: "ZERO",
    details: [{ criteriaId: "criteria-1", score: "abc", note: "" }],
  });

  assert.equal(negative.success, false);
  assert.equal(text.success, false);
});

test("score override accepts boundary values with a reason", () => {
  const zero = overrideScoreSchema.safeParse({
    score: 0,
    reason: "Điều chỉnh theo phê duyệt",
  });
  const hundred = overrideScoreSchema.safeParse({
    score: 100,
    reason: "Đủ hồ sơ bổ sung",
  });

  assert.equal(zero.success, true);
  assert.equal(hundred.success, true);
});

test("score override rejects an out-of-range score", () => {
  assert.equal(
    overrideScoreSchema.safeParse({ score: 101, reason: "Điểm vượt ngưỡng" }).success,
    false
  );
  assert.equal(
    overrideScoreSchema.safeParse({ score: -1, reason: "Điểm dưới ngưỡng" }).success,
    false
  );
});

test("score override requires a meaningful reason", () => {
  const result = overrideScoreSchema.safeParse({ score: 80, reason: "  " });
  assert.equal(result.success, false);
});

test("score override form does not treat an empty score as zero", () => {
  const result = overrideScoreFormSchema.safeParse({
    score: "",
    reason: "Điều chỉnh theo phê duyệt",
  });
  assert.equal(result.success, false);
});
