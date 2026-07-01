import assert from "node:assert/strict";
import test from "node:test";
import { gradeThresholdSchema } from "./validation/score-template";

test("concurrency: gradeThresholdSchema accepts A > B", () => {
  const result = gradeThresholdSchema.safeParse({
    gradeAMin: 80,
    gradeBMin: 60,
  });
  assert.equal(result.success, true);
});

test("concurrency: gradeThresholdSchema rejects A <= B", () => {
  const result = gradeThresholdSchema.safeParse({
    gradeAMin: 60,
    gradeBMin: 60,
  });
  assert.equal(result.success, false);

  const result2 = gradeThresholdSchema.safeParse({
    gradeAMin: 50,
    gradeBMin: 70,
  });
  assert.equal(result2.success, false);
});
