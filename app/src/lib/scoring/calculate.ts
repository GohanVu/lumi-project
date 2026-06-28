/**
 * Logic tính điểm chấm NPP — công thức chuẩn hóa về thang 100.
 * Thuần (không phụ thuộc Prisma) để dễ test và tái sử dụng ở API chấm điểm (T21).
 *
 * Đặc tả 7.5:
 *   Điểm quy đổi tiêu chí = (Điểm thô / Điểm tối đa) × Trọng số
 *   Điểm tổng = [Tổng điểm quy đổi / Tổng trọng số được tính] × 100
 *   Độ hoàn thiện dữ liệu = Tổng trọng số đã có câu trả lời / Tổng trọng số × 100%
 */

/** Chính sách xử lý tiêu chí thiếu dữ liệu (đặc tả 7.5). */
export type MissingDataPolicy =
  | "EXCLUDE" // Loại khỏi mẫu số — trọng số không cộng vào tổng trọng số được tính
  | "ZERO" // Tính 0 điểm — vẫn cộng trọng số nhưng nhận 0 điểm
  | "BLOCK"; // Không cho hoàn tất — kết quả ở trạng thái Nháp/Chưa đủ dữ liệu

export interface ScoringCriterion {
  id: string;
  /** Điểm tối đa của tiêu chí (> 0). */
  maxScore: number;
  /** Trọng số của tiêu chí (> 0). */
  weight: number;
}

export interface CriterionInput {
  criteriaId: string;
  /** Điểm thô đã chấm; `null` nghĩa là chưa có dữ liệu. */
  rawScore: number | null;
}

export interface CriterionResult {
  criteriaId: string;
  rawScore: number | null;
  /** Điểm thô sau khi kẹp về [0, maxScore]. */
  effectiveRawScore: number | null;
  /** Điểm quy đổi = (rawScore / maxScore) × weight. */
  convertedScore: number;
  /** Trọng số thực sự cộng vào mẫu số (0 nếu bị loại). */
  weightCounted: number;
  hasData: boolean;
}

export interface ScoringResult {
  /** Điểm tổng chuẩn hóa 0-100 (làm tròn 2 chữ số thập phân). */
  totalScore: number;
  /** Độ hoàn thiện dữ liệu theo % (làm tròn 2 chữ số thập phân). */
  dataCompleteness: number;
  /** Tất cả tiêu chí đều đã có dữ liệu. */
  isComplete: boolean;
  /** Có được phép hoàn tất / xếp hạng chính thức không (theo policy). */
  canFinalize: boolean;
  details: CriterionResult[];
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Tính điểm tổng chuẩn hóa 0-100 cho một lần chấm.
 *
 * @param criteria  Danh sách tiêu chí của mẫu (đã snapshot theo version).
 * @param inputs    Điểm thô từng tiêu chí; thiếu hoặc rawScore=null = chưa có dữ liệu.
 * @param policy    Chính sách xử lý tiêu chí thiếu dữ liệu. Mặc định "EXCLUDE".
 */
export function calculateScore(
  criteria: ScoringCriterion[],
  inputs: CriterionInput[],
  policy: MissingDataPolicy = "EXCLUDE",
): ScoringResult {
  const inputMap = new Map<string, number | null>();
  for (const input of inputs) {
    inputMap.set(input.criteriaId, input.rawScore);
  }

  const details: CriterionResult[] = [];
  let totalConverted = 0;
  let totalWeightCounted = 0;
  let totalWeightAll = 0;
  let totalWeightAnswered = 0;

  for (const criterion of criteria) {
    const weight = criterion.weight;
    totalWeightAll += weight;

    const rawScore = inputMap.has(criterion.id) ? inputMap.get(criterion.id)! : null;
    const hasData = rawScore !== null && Number.isFinite(rawScore);

    if (hasData) {
      const effective = clamp(rawScore, 0, criterion.maxScore);
      const ratio = criterion.maxScore > 0 ? effective / criterion.maxScore : 0;
      const converted = ratio * weight;

      totalConverted += converted;
      totalWeightCounted += weight;
      totalWeightAnswered += weight;

      details.push({
        criteriaId: criterion.id,
        rawScore,
        effectiveRawScore: effective,
        convertedScore: round2(converted),
        weightCounted: weight,
        hasData: true,
      });
      continue;
    }

    // Thiếu dữ liệu — xử lý theo policy
    // EXCLUDE: không cộng trọng số. ZERO/BLOCK: cộng trọng số nhưng 0 điểm.
    const weightCounted = policy === "EXCLUDE" ? 0 : weight;
    totalWeightCounted += weightCounted;

    details.push({
      criteriaId: criterion.id,
      rawScore: null,
      effectiveRawScore: null,
      convertedScore: 0,
      weightCounted,
      hasData: false,
    });
  }

  const totalScore =
    totalWeightCounted > 0 ? round2((totalConverted / totalWeightCounted) * 100) : 0;
  const dataCompleteness =
    totalWeightAll > 0 ? round2((totalWeightAnswered / totalWeightAll) * 100) : 0;
  const isComplete = totalWeightAll > 0 && totalWeightAnswered === totalWeightAll;

  // Policy BLOCK: chỉ được hoàn tất khi đã đủ dữ liệu.
  const canFinalize = policy === "BLOCK" ? isComplete : true;

  return {
    totalScore,
    dataCompleteness,
    isComplete,
    canFinalize,
    details,
  };
}
