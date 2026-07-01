export type ScoreGrade = "A" | "B" | "C";

export interface GradeThresholds {
  gradeAMin: number;
  gradeBMin: number;
}

export const DEFAULT_GRADE_THRESHOLDS: GradeThresholds = {
  gradeAMin: 80,
  gradeBMin: 60,
};

/** Xếp hạng theo điểm hiệu lực và ngưỡng của đúng phiên bản mẫu chấm điểm. */
export function determineGrade(
  score: number,
  thresholds: GradeThresholds
): ScoreGrade {
  if (score >= thresholds.gradeAMin) return "A";
  if (score >= thresholds.gradeBMin) return "B";
  return "C";
}
