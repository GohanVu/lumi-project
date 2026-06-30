import assert from "node:assert/strict";
import test from "node:test";
import { compareScoreResults, type ComparableScoreResult } from "./compare";

function makeResult(
  overrides: Partial<ComparableScoreResult> & Pick<ComparableScoreResult, "id" | "scoredAt">,
): ComparableScoreResult {
  return {
    totalScore: 0,
    dataCompleteness: 100,
    details: [],
    ...overrides,
  };
}

test("xác định lần trước / lần sau theo scoredAt và tính delta điểm tổng", () => {
  const newer = makeResult({ id: "b", scoredAt: "2026-02-01T00:00:00.000Z", totalScore: 80 });
  const older = makeResult({ id: "a", scoredAt: "2026-01-01T00:00:00.000Z", totalScore: 60 });

  // Thứ tự tham số không quan trọng — luôn xác định theo thời gian.
  const cmp = compareScoreResults(newer, older);

  assert.equal(cmp.earlier.id, "a");
  assert.equal(cmp.later.id, "b");
  assert.equal(cmp.totalScoreDelta, 20);
});

test("delta tiêu chí tính trên tỉ lệ chuẩn hóa, không phải điểm thô", () => {
  const earlier = makeResult({
    id: "a",
    scoredAt: "2026-01-01T00:00:00.000Z",
    details: [{ criteriaId: "c1", name: "Doanh số", score: 5, maxScore: 10 }], // 50%
  });
  const later = makeResult({
    id: "b",
    scoredAt: "2026-02-01T00:00:00.000Z",
    details: [{ criteriaId: "c1", name: "Doanh số", score: 4, maxScore: 5 }], // 80%
  });

  const row = compareScoreResults(earlier, later).rows[0];
  assert.equal(row.presence, "both");
  assert.equal(row.delta, 30); // 80% - 50%
});

test("tiêu chí chỉ có ở một lần chấm được đánh dấu presence và delta null", () => {
  const earlier = makeResult({
    id: "a",
    scoredAt: "2026-01-01T00:00:00.000Z",
    details: [{ criteriaId: "c1", name: "Cũ", score: 5, maxScore: 10 }],
  });
  const later = makeResult({
    id: "b",
    scoredAt: "2026-02-01T00:00:00.000Z",
    details: [{ criteriaId: "c2", name: "Mới", score: 8, maxScore: 10 }],
  });

  const cmp = compareScoreResults(earlier, later);
  const byId = new Map(cmp.rows.map((r) => [r.criteriaId, r]));

  assert.equal(byId.get("c1")?.presence, "earlier-only");
  assert.equal(byId.get("c1")?.delta, null);
  assert.equal(byId.get("c2")?.presence, "later-only");
  assert.equal(byId.get("c2")?.delta, null);
});

test("scoredAt bằng nhau: tham số đầu được coi là lần trước (ổn định)", () => {
  const a = makeResult({ id: "a", scoredAt: "2026-01-01T00:00:00.000Z", totalScore: 70 });
  const b = makeResult({ id: "b", scoredAt: "2026-01-01T00:00:00.000Z", totalScore: 75 });

  const cmp = compareScoreResults(a, b);
  assert.equal(cmp.earlier.id, "a");
  assert.equal(cmp.later.id, "b");
  assert.equal(cmp.totalScoreDelta, 5);
});

test("maxScore <= 0 không gây chia 0, tỉ lệ coi như 0%", () => {
  const earlier = makeResult({
    id: "a",
    scoredAt: "2026-01-01T00:00:00.000Z",
    details: [{ criteriaId: "c1", name: "X", score: 0, maxScore: 0 }],
  });
  const later = makeResult({
    id: "b",
    scoredAt: "2026-02-01T00:00:00.000Z",
    details: [{ criteriaId: "c1", name: "X", score: 5, maxScore: 10 }], // 50%
  });

  const row = compareScoreResults(earlier, later).rows[0];
  assert.equal(row.delta, 50); // 50% - 0%
});
