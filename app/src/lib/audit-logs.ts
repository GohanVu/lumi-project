export interface AuditLogChanges {
  // SCORE action
  templateId?: string;
  templateVersion?: number;
  missingDataPolicy?: string;
  totalScore?: number;
  grade?: string;
  dataCompleteness?: number;

  // OVERRIDE action
  systemScore?: number | null;
  previousEffectiveScore?: number;
  adjustedScore?: number;
  previousGrade?: string | null;
  adjustedGrade?: string;
  reason?: string;
  wasAlreadyOverridden?: boolean;
}

const POLICY_MAP: Record<string, string> = {
  EXCLUDE: "Loại bỏ tiêu chí thiếu",
  ZERO: "Tính điểm 0 cho tiêu chí thiếu",
  BLOCK: "Chặn khi thiếu dữ liệu",
};

/**
 * Định dạng chuỗi JSON thay đổi thành văn bản tiếng Việt dễ đọc.
 */
export function formatAuditLogChanges(action: string, changesJson: string | null): string {
  if (!changesJson) return "Không có chi tiết thay đổi.";

  try {
    const changes = JSON.parse(changesJson) as AuditLogChanges;

    if (action === "SCORE") {
      const versionStr = changes.templateVersion !== undefined ? ` phiên bản v${changes.templateVersion}` : "";
      const policyStr = changes.missingDataPolicy ? POLICY_MAP[changes.missingDataPolicy] || changes.missingDataPolicy : "Mặc định";
      const scoreStr = changes.totalScore !== undefined ? `${changes.totalScore.toFixed(1)} điểm` : "—";
      const gradeStr = changes.grade ? `hạng ${changes.grade}` : "—";
      const completenessStr = changes.dataCompleteness !== undefined ? `${(changes.dataCompleteness * 100).toFixed(0)}%` : "—";

      return `Hoàn tất chấm điểm: đạt ${scoreStr} (${gradeStr}). Mẫu chấm${versionStr}, xử lý dữ liệu thiếu: "${policyStr}", mức độ hoàn thiện dữ liệu: ${completenessStr}.`;
    }

    if (action === "OVERRIDE") {
      const prevScore = changes.previousEffectiveScore !== undefined ? changes.previousEffectiveScore.toFixed(1) : "—";
      const newScore = changes.adjustedScore !== undefined ? changes.adjustedScore.toFixed(1) : "—";
      const prevGrade = changes.previousGrade || "—";
      const newGrade = changes.adjustedGrade || "—";
      const reasonStr = changes.reason ? ` Lý do: "${changes.reason}"` : "";

      return `Admin điều chỉnh điểm: ${prevScore} → ${newScore} (Xếp hạng: ${prevGrade} → ${newGrade}).${reasonStr}`;
    }

    // Fallback cho các action khác
    return Object.entries(changes)
      .map(([key, val]) => `${key}: ${typeof val === "object" ? JSON.stringify(val) : val}`)
      .join(", ");
  } catch {
    return changesJson;
  }
}
