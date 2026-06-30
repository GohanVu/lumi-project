/**
 * So sánh hai lần chấm điểm của một NPP (T23).
 * Thuần (không phụ thuộc Prisma/React) để dễ test và tái sử dụng ở UI.
 *
 * Hai lần chấm có thể dùng mẫu/phiên bản khác nhau nên điểm thô không cùng thang.
 * Vì vậy delta theo từng tiêu chí được tính trên tỉ lệ chuẩn hóa
 * (score / maxScore × 100) — đơn vị "điểm %". Tiêu chí được ghép theo criteriaId,
 * lấy hợp của cả hai lần chấm; tiêu chí chỉ có ở một bên được đánh dấu presence.
 */

export interface ComparableCriterionDetail {
  criteriaId: string;
  name: string;
  /** Điểm thô đã chấm cho tiêu chí. */
  score: number;
  /** Điểm tối đa của tiêu chí (> 0). */
  maxScore: number;
}

export interface ComparableScoreResult {
  id: string;
  /** Điểm tổng 0-100 (điểm hiệu lực, có thể đã ghi đè). */
  totalScore: number;
  /** Độ hoàn thiện dữ liệu %. */
  dataCompleteness: number;
  /** Thời điểm chấm (ISO). Dùng để xác định lần trước / lần sau. */
  scoredAt: string;
  details: ComparableCriterionDetail[];
}

export interface ComparisonSide {
  id: string;
  scoredAt: string;
  totalScore: number;
  dataCompleteness: number;
}

export interface CriterionComparisonRow {
  criteriaId: string;
  name: string;
  /** Điểm thô + tối đa của tiêu chí ở lần trước (null nếu không có). */
  earlier: { score: number; maxScore: number } | null;
  /** Điểm thô + tối đa của tiêu chí ở lần sau (null nếu không có). */
  later: { score: number; maxScore: number } | null;
  /**
   * Chênh lệch tỉ lệ chuẩn hóa (điểm %) = later% − earlier%.
   * null nếu tiêu chí chỉ xuất hiện ở một lần chấm.
   */
  delta: number | null;
  presence: "both" | "earlier-only" | "later-only";
}

export interface ScoreComparison {
  earlier: ComparisonSide;
  later: ComparisonSide;
  /** Chênh lệch điểm tổng = later.totalScore − earlier.totalScore. */
  totalScoreDelta: number;
  /** Chênh lệch độ hoàn thiện = later − earlier. */
  completenessDelta: number;
  rows: CriterionComparisonRow[];
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Tỉ lệ chuẩn hóa của một tiêu chí về thang 100 (0 nếu maxScore <= 0). */
function normalizedPercent(score: number, maxScore: number): number {
  return maxScore > 0 ? (score / maxScore) * 100 : 0;
}

function toSide(result: ComparableScoreResult): ComparisonSide {
  return {
    id: result.id,
    scoredAt: result.scoredAt,
    totalScore: result.totalScore,
    dataCompleteness: result.dataCompleteness,
  };
}

/**
 * So sánh hai kết quả chấm điểm. Lần có `scoredAt` sớm hơn là "earlier",
 * lần muộn hơn là "later"; delta dương nghĩa là cải thiện.
 * Khi `scoredAt` bằng nhau, `a` được coi là earlier để kết quả ổn định.
 */
export function compareScoreResults(
  a: ComparableScoreResult,
  b: ComparableScoreResult,
): ScoreComparison {
  const aTime = new Date(a.scoredAt).getTime();
  const bTime = new Date(b.scoredAt).getTime();
  const [earlier, later] = aTime <= bTime ? [a, b] : [b, a];

  const earlierMap = new Map(earlier.details.map((d) => [d.criteriaId, d] as const));
  const laterMap = new Map(later.details.map((d) => [d.criteriaId, d] as const));

  // Hợp các tiêu chí, giữ thứ tự: theo lần sau trước, rồi bổ sung tiêu chí chỉ có ở lần trước.
  const orderedIds: string[] = [];
  const seen = new Set<string>();
  for (const d of [...later.details, ...earlier.details]) {
    if (!seen.has(d.criteriaId)) {
      seen.add(d.criteriaId);
      orderedIds.push(d.criteriaId);
    }
  }

  const rows: CriterionComparisonRow[] = orderedIds.map((criteriaId) => {
    const e = earlierMap.get(criteriaId) ?? null;
    const l = laterMap.get(criteriaId) ?? null;
    const name = l?.name ?? e?.name ?? "";

    let delta: number | null = null;
    let presence: CriterionComparisonRow["presence"];
    if (e && l) {
      presence = "both";
      delta = round2(
        normalizedPercent(l.score, l.maxScore) - normalizedPercent(e.score, e.maxScore),
      );
    } else if (l) {
      presence = "later-only";
    } else {
      presence = "earlier-only";
    }

    return {
      criteriaId,
      name,
      earlier: e ? { score: e.score, maxScore: e.maxScore } : null,
      later: l ? { score: l.score, maxScore: l.maxScore } : null,
      delta,
      presence,
    };
  });

  return {
    earlier: toSide(earlier),
    later: toSide(later),
    totalScoreDelta: round2(later.totalScore - earlier.totalScore),
    completenessDelta: round2(later.dataCompleteness - earlier.dataCompleteness),
    rows,
  };
}
