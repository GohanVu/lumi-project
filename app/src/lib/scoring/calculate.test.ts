import assert from "node:assert/strict";
import test from "node:test";
import { calculateScore, type ScoringCriterion, type CriterionInput } from "./calculate";

const criteria: ScoringCriterion[] = [
  { id: "c1", maxScore: 10, weight: 2 },
  { id: "c2", maxScore: 5, weight: 1 },
  { id: "c3", maxScore: 20, weight: 3 },
];

test("đủ dữ liệu — chuẩn hóa về thang 100 không phụ thuộc tổng trọng số", () => {
  const inputs: CriterionInput[] = [
    { criteriaId: "c1", rawScore: 10 }, // ratio 1 × 2 = 2
    { criteriaId: "c2", rawScore: 5 }, //  ratio 1 × 1 = 1
    { criteriaId: "c3", rawScore: 10 }, // ratio 0.5 × 3 = 1.5
  ];
  // tổng quy đổi 4.5 / tổng trọng số 6 × 100 = 75
  const r = calculateScore(criteria, inputs);
  assert.equal(r.totalScore, 75);
  assert.equal(r.dataCompleteness, 100);
  assert.equal(r.isComplete, true);
  assert.equal(r.canFinalize, true);
});

test("điểm tuyệt đối — tất cả maxScore → 100 điểm", () => {
  const inputs: CriterionInput[] = [
    { criteriaId: "c1", rawScore: 10 },
    { criteriaId: "c2", rawScore: 5 },
    { criteriaId: "c3", rawScore: 20 },
  ];
  assert.equal(calculateScore(criteria, inputs).totalScore, 100);
});

test("policy EXCLUDE — tiêu chí thiếu bị loại khỏi mẫu số", () => {
  const inputs: CriterionInput[] = [
    { criteriaId: "c1", rawScore: 10 }, // 2/2
    { criteriaId: "c2", rawScore: 5 }, //  1/1
    // c3 thiếu → loại khỏi mẫu số
  ];
  // (2 + 1) / (2 + 1) × 100 = 100
  const r = calculateScore(criteria, inputs, "EXCLUDE");
  assert.equal(r.totalScore, 100);
  assert.equal(r.isComplete, false);
  assert.equal(r.canFinalize, true);
  // độ hoàn thiện = (2+1)/6 × 100 = 50
  assert.equal(r.dataCompleteness, 50);
});

test("policy ZERO — tiêu chí thiếu vẫn cộng trọng số nhưng 0 điểm", () => {
  const inputs: CriterionInput[] = [
    { criteriaId: "c1", rawScore: 10 }, // 2
    { criteriaId: "c2", rawScore: 5 }, //  1
    // c3 thiếu → weightCounted 3, converted 0
  ];
  // 3 / 6 × 100 = 50
  const r = calculateScore(criteria, inputs, "ZERO");
  assert.equal(r.totalScore, 50);
  assert.equal(r.canFinalize, true);
});

test("policy BLOCK — chưa đủ dữ liệu thì không cho hoàn tất", () => {
  const inputs: CriterionInput[] = [
    { criteriaId: "c1", rawScore: 10 },
    { criteriaId: "c2", rawScore: 5 },
  ];
  const partial = calculateScore(criteria, inputs, "BLOCK");
  assert.equal(partial.canFinalize, false);

  const full = calculateScore(
    criteria,
    [
      { criteriaId: "c1", rawScore: 10 },
      { criteriaId: "c2", rawScore: 5 },
      { criteriaId: "c3", rawScore: 20 },
    ],
    "BLOCK",
  );
  assert.equal(full.canFinalize, true);
});

test("kẹp điểm thô vào [0, maxScore]", () => {
  const r = calculateScore(
    [{ id: "c1", maxScore: 10, weight: 1 }],
    [{ criteriaId: "c1", rawScore: 15 }],
  );
  assert.equal(r.totalScore, 100); // 15 bị kẹp về 10
  assert.equal(r.details[0].effectiveRawScore, 10);

  const neg = calculateScore(
    [{ id: "c1", maxScore: 10, weight: 1 }],
    [{ criteriaId: "c1", rawScore: -5 }],
  );
  assert.equal(neg.totalScore, 0); // -5 bị kẹp về 0
});

test("không có tiêu chí nào có dữ liệu — trả 0, không chia cho 0", () => {
  const r = calculateScore(criteria, [], "EXCLUDE");
  assert.equal(r.totalScore, 0);
  assert.equal(r.dataCompleteness, 0);
  assert.equal(r.isComplete, false);
});

test("mẫu rỗng (không tiêu chí) — an toàn", () => {
  const r = calculateScore([], []);
  assert.equal(r.totalScore, 0);
  assert.equal(r.dataCompleteness, 0);
  assert.equal(r.details.length, 0);
});
