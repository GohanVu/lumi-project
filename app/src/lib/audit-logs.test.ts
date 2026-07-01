import assert from "node:assert/strict";
import test from "node:test";
import { formatAuditLogChanges } from "./audit-logs";

test("formatAuditLogChanges formats SCORE logs correctly", () => {
  const json = JSON.stringify({
    templateVersion: 2,
    missingDataPolicy: "EXCLUDE",
    totalScore: 78.53,
    grade: "B",
    dataCompleteness: 0.952,
  });

  const result = formatAuditLogChanges("SCORE", json);
  assert.match(result, /đạt 78\.5 điểm/);
  assert.match(result, /hạng B/);
  assert.match(result, /phiên bản v2/);
  assert.match(result, /Loại bỏ tiêu chí thiếu/);
  assert.match(result, /hoàn thiện dữ liệu: 95%/);
});

test("formatAuditLogChanges formats OVERRIDE logs correctly", () => {
  const json = JSON.stringify({
    previousEffectiveScore: 70,
    adjustedScore: 82.5,
    previousGrade: "B",
    adjustedGrade: "A",
    reason: "Điều chỉnh doanh số bổ sung",
  });

  const result = formatAuditLogChanges("OVERRIDE", json);
  assert.match(result, /điểm: 70\.0 → 82\.5/);
  assert.match(result, /Xếp hạng: B → A/);
  assert.match(result, /Lý do: "Điều chỉnh doanh số bổ sung"/);
});

test("formatAuditLogChanges falls back for unknown action", () => {
  const json = JSON.stringify({
    fieldName: "notes",
    oldValue: "Cũ",
    newValue: "Mới",
  });

  const result = formatAuditLogChanges("UPDATE", json);
  assert.match(result, /fieldName: notes/);
  assert.match(result, /oldValue: Cũ/);
  assert.match(result, /newValue: Mới/);
});

test("formatAuditLogChanges handles null and invalid JSON gracefully", () => {
  assert.equal(formatAuditLogChanges("SCORE", null), "Không có chi tiết thay đổi.");
  assert.equal(formatAuditLogChanges("SCORE", "invalid-json"), "invalid-json");
});
