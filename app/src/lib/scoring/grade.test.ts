import assert from "node:assert/strict";
import test from "node:test";
import { determineGrade } from "./grade";

const thresholds = { gradeAMin: 80, gradeBMin: 60 };

test("grade uses inclusive A and B boundaries", () => {
  assert.equal(determineGrade(100, thresholds), "A");
  assert.equal(determineGrade(80, thresholds), "A");
  assert.equal(determineGrade(79.99, thresholds), "B");
  assert.equal(determineGrade(60, thresholds), "B");
  assert.equal(determineGrade(59.99, thresholds), "C");
  assert.equal(determineGrade(0, thresholds), "C");
});

test("grade follows custom template thresholds", () => {
  const custom = { gradeAMin: 90, gradeBMin: 75 };
  assert.equal(determineGrade(85, custom), "B");
  assert.equal(determineGrade(70, custom), "C");
});
