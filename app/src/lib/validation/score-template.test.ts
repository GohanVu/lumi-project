import assert from "node:assert/strict";
import test from "node:test";
import {
  templateFormSchema,
  createCriteriaSchema,
  criteriaFormSchema,
  updateTemplateSchema,
} from "./score-template";

test("template form rejects empty name", () => {
  const result = templateFormSchema.safeParse({
    name: "   ",
    description: "",
    gradeAMin: "80",
    gradeBMin: "60",
  });
  assert.equal(result.success, false);
  assert.ok(result.error?.errors[0]?.message?.includes("Tên mẫu"));
});

test("template form accepts numeric threshold inputs and enforces their order", () => {
  const valid = templateFormSchema.safeParse({
    name: "Mẫu 2026",
    description: "",
    gradeAMin: "85",
    gradeBMin: "65",
  });
  const invalidOrder = templateFormSchema.safeParse({
    name: "Mẫu 2026",
    description: "",
    gradeAMin: "60",
    gradeBMin: "80",
  });

  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.gradeAMin, 85);
    assert.equal(valid.data.gradeBMin, 65);
  }
  assert.equal(invalidOrder.success, false);
});

test("template update rejects thresholds outside 0-100", () => {
  assert.equal(updateTemplateSchema.safeParse({ gradeAMin: 101 }).success, false);
  assert.equal(updateTemplateSchema.safeParse({ gradeBMin: -1 }).success, false);
});

test("criteria API rejects non-positive maxScore and weight", () => {
  const zeroMax = createCriteriaSchema.safeParse({ name: "X", maxScore: 0, weight: 1 });
  const negWeight = createCriteriaSchema.safeParse({ name: "X", maxScore: 10, weight: -2 });
  const valid = createCriteriaSchema.safeParse({ name: "X", maxScore: 10, weight: 1.5 });

  assert.equal(zeroMax.success, false, "maxScore = 0 phải bị từ chối");
  assert.equal(negWeight.success, false, "weight âm phải bị từ chối");
  assert.equal(valid.success, true, "giá trị dương hợp lệ");
});

test("criteria form coerces numeric strings from inputs", () => {
  const result = criteriaFormSchema.safeParse({
    name: "Tài chính",
    description: "",
    maxScore: "10",
    weight: "2.5",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.maxScore, 10);
    assert.equal(result.data.weight, 2.5);
  }
});

test("update template schema requires at least one field", () => {
  const empty = updateTemplateSchema.safeParse({});
  const withName = updateTemplateSchema.safeParse({ name: "Mẫu 2026" });

  assert.equal(empty.success, false, "object rỗng phải bị từ chối");
  assert.equal(withName.success, true);
});
