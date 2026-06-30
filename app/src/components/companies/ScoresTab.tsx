"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { calculateScore } from "@/lib/scoring/calculate";
import {
  compareScoreResults,
  type ComparableScoreResult,
} from "@/lib/scoring/compare";
import { queryKeys } from "@/lib/query-keys";
import { invalidateScoreOverride } from "@/lib/score-queries";
import {
  overrideScoreFormSchema,
  scoreFormSchema,
  type MissingDataPolicy,
  type OverrideScoreFormData,
  type OverrideScoreFormInput,
  type ScoreFormData,
  type ScoreFormInput,
} from "@/lib/validation/score-result";
import styles from "./ScoresTab.module.css";

interface ScoreCriteria {
  id: string;
  name: string;
  description: string | null;
  maxScore: number;
  weight: number;
  sortOrder: number;
}

interface ScoreTemplate {
  id: string;
  name: string;
  description: string | null;
  version: number;
  criteria: ScoreCriteria[];
}

interface ScoreDetail {
  id: string;
  score: number;
  note: string | null;
  criteria: ScoreCriteria;
}

interface ScoreResult {
  id: string;
  systemScore: number;
  totalScore: number;
  grade: string | null;
  dataCompleteness: number;
  isOverridden: boolean;
  overrideNote: string | null;
  scoredAt: string;
  scoredBy: { id: string; name: string };
  template: ScoreTemplate;
  details: ScoreDetail[];
}

interface ScoresResponse {
  data: ScoreResult[];
  availableTemplates: ScoreTemplate[];
}

interface ScoresTabProps {
  companyId: string;
  canOverride: boolean;
}

const POLICY_OPTIONS: Array<{
  value: MissingDataPolicy;
  label: string;
  description: string;
}> = [
  {
    value: "EXCLUDE",
    label: "Loại tiêu chí thiếu khỏi mẫu số",
    description: "Điểm tổng chỉ tính trên các tiêu chí đã nhập.",
  },
  {
    value: "ZERO",
    label: "Tiêu chí thiếu nhận 0 điểm",
    description: "Tiêu chí chưa nhập vẫn được tính trọng số với điểm 0.",
  },
  {
    value: "BLOCK",
    label: "Không cho hoàn tất nếu thiếu",
    description: "Phải nhập đầy đủ tất cả tiêu chí trước khi lưu.",
  },
];

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function ScoresTab({ companyId, canOverride }: ScoresTabProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<ScoreResult | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.companies.scores(companyId),
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}/scores`);
      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({ error: "Lỗi tải dữ liệu chấm điểm" }));
        throw new Error(body.error);
      }
      return response.json() as Promise<ScoresResponse>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({
      templateId,
      formData,
    }: {
      templateId: string;
      formData: ScoreFormData;
    }) => {
      const response = await fetch(`/api/companies/${companyId}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          missingDataPolicy: formData.missingDataPolicy,
          details: formData.details.map((detail) => ({
            criteriaId: detail.criteriaId,
            score: detail.score === "" ? null : Number(detail.score),
            note: detail.note || null,
          })),
        }),
      });

      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({ error: "Lỗi lưu kết quả chấm điểm" }));
        throw new Error(body.error);
      }

      return response.json() as Promise<{ data: { id: string } }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.scores(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(companyId) });
      setSelectedResultId(result.data.id);
      setShowForm(false);
    },
  });

  const overrideMutation = useMutation({
    mutationFn: async ({
      resultId,
      formData,
    }: {
      resultId: string;
      formData: OverrideScoreFormData;
    }) => {
      const response = await fetch(`/api/scores/${resultId}/override`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: Number(formData.score),
          reason: formData.reason,
        }),
      });

      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({ error: "Lỗi ghi đè điểm" }));
        throw new Error(body.error);
      }

      return response.json() as Promise<{ data: { id: string } }>;
    },
    onSuccess: async (result) => {
      await invalidateScoreOverride(queryClient, companyId);
      setSelectedResultId(result.data.id);
      setOverrideTarget(null);
    },
  });

  const comparison = useMemo(() => {
    if (compareIds.length !== 2) return null;
    const all = data?.data ?? [];
    const first = all.find((r) => r.id === compareIds[0]);
    const second = all.find((r) => r.id === compareIds[1]);
    if (!first || !second) return null;
    return compareScoreResults(toComparable(first), toComparable(second));
  }, [compareIds, data]);

  if (isLoading) {
    return <div className={styles.loading}>Đang tải dữ liệu chấm điểm...</div>;
  }

  if (isError) {
    return (
      <div className={styles.error} role="alert">
        <span>{(error as Error).message}</span>
        <button type="button" className={styles.retryButton} onClick={() => refetch()}>
          Thử lại
        </button>
      </div>
    );
  }

  const results = data?.data ?? [];
  const templates = data?.availableTemplates ?? [];
  const latest = results[0] ?? null;
  const selectedResult =
    results.find((result) => result.id === selectedResultId) ?? latest;

  const openForm = () => {
    createMutation.reset();
    setShowForm(true);
  };

  const toggleCompareMode = () => {
    setCompareMode((prev) => {
      if (prev) setCompareIds([]);
      return !prev;
    });
  };

  const handleHistoryClick = (resultId: string) => {
    if (!compareMode) {
      setSelectedResultId(resultId);
      return;
    }
    setCompareIds((prev) => {
      if (prev.includes(resultId)) return prev.filter((id) => id !== resultId);
      if (prev.length >= 2) return [prev[1], resultId]; // giữ lựa chọn mới nhất
      return [...prev, resultId];
    });
  };

  return (
    <section aria-labelledby="scores-title">
      <div className={styles.header}>
        <div>
          <h3 id="scores-title" className={styles.title}>Chấm điểm NPP</h3>
          <p className={styles.subtitle}>Đánh giá theo mẫu đã ban hành và xem cách tính.</p>
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={openForm}
          disabled={templates.length === 0}
        >
          + Chấm điểm
        </button>
      </div>

      {templates.length === 0 && (
        <div className={styles.notice}>
          Chưa có mẫu chấm điểm được ban hành. Admin cần ban hành một mẫu trước.
        </div>
      )}

      {latest ? (
        <>
          <div className={styles.summaryCard}>
            <div className={styles.scoreValue}>{latest.totalScore.toFixed(2)}</div>
            <div className={styles.summaryContent}>
              <div className={styles.summaryTitle}>
                Kết quả gần nhất · {latest.template.name} v{latest.template.version}
              </div>
              <div className={styles.summaryMeta}>
                <span>Hoàn thiện dữ liệu: {latest.dataCompleteness.toFixed(2)}%</span>
                <span>Người chấm: {latest.scoredBy.name}</span>
                <span>{dateTimeFormatter.format(new Date(latest.scoredAt))}</span>
                {latest.isOverridden && (
                  <span>Điểm hệ thống: {latest.systemScore.toFixed(2)}</span>
                )}
              </div>
            </div>
            <div className={styles.gradeBadge}>{latest.grade || "Chưa phân loại"}</div>
          </div>

          <div className={styles.contentGrid}>
            <div className={styles.historyPanel}>
              <div className={styles.historyHeader}>
                <h4 className={styles.panelTitle}>Các lần chấm</h4>
                {results.length >= 2 && (
                  <button
                    type="button"
                    className={`${styles.compareToggle} ${
                      compareMode ? styles.compareToggleActive : ""
                    }`}
                    onClick={toggleCompareMode}
                    aria-pressed={compareMode}
                  >
                    {compareMode ? "Hủy so sánh" : "So sánh"}
                  </button>
                )}
              </div>
              {compareMode && (
                <p className={styles.compareHint}>
                  Chọn 2 lần chấm để so sánh ({compareIds.length}/2)
                </p>
              )}
              <div className={styles.historyList}>
                {results.map((result) => {
                  const isActive = compareMode
                    ? compareIds.includes(result.id)
                    : selectedResult?.id === result.id;
                  return (
                    <button
                      key={result.id}
                      type="button"
                      className={`${styles.historyItem} ${
                        isActive ? styles.historyItemActive : ""
                      }`}
                      onClick={() => handleHistoryClick(result.id)}
                      aria-pressed={compareMode ? isActive : undefined}
                    >
                      <span className={styles.historyScore}>{result.totalScore.toFixed(2)}</span>
                      <span className={styles.historyInfo}>
                        <strong>{result.template.name} v{result.template.version}</strong>
                        <small>{dateTimeFormatter.format(new Date(result.scoredAt))}</small>
                        {result.isOverridden && <small>Đã điều chỉnh</small>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {compareMode ? (
              comparison ? (
                <ScoreComparisonPanel comparison={comparison} />
              ) : (
                <div className={styles.detailPanel}>
                  <div className={styles.comparePlaceholder}>
                    Chọn 2 lần chấm ở danh sách bên trái để xem chênh lệch.
                  </div>
                </div>
              )
            ) : (
              selectedResult && (
                <ScoreDetailPanel
                  result={selectedResult}
                  canOverride={canOverride}
                  onOverride={() => {
                    overrideMutation.reset();
                    setOverrideTarget(selectedResult);
                  }}
                />
              )
            )}
          </div>
        </>
      ) : (
        <div className={styles.empty}>
          <div className={styles.emptyIcon} aria-hidden="true">☆</div>
          <h4>Chưa có kết quả chấm điểm</h4>
          <p>Chọn một mẫu đã ban hành để bắt đầu đánh giá NPP.</p>
        </div>
      )}

      {showForm && templates.length > 0 && (
        <ScoreFormModal
          templates={templates}
          isLoading={createMutation.isPending}
          error={createMutation.error instanceof Error ? createMutation.error : null}
          onSubmit={(templateId, formData) =>
            createMutation.mutate({ templateId, formData })
          }
          onClose={() => {
            if (!createMutation.isPending) setShowForm(false);
          }}
        />
      )}

      {overrideTarget && (
        <OverrideScoreModal
          result={overrideTarget}
          isLoading={overrideMutation.isPending}
          error={overrideMutation.error instanceof Error ? overrideMutation.error : null}
          onSubmit={(formData) =>
            overrideMutation.mutate({ resultId: overrideTarget.id, formData })
          }
          onClose={() => {
            if (!overrideMutation.isPending) setOverrideTarget(null);
          }}
        />
      )}
    </section>
  );
}

function toComparable(result: ScoreResult): ComparableScoreResult {
  return {
    id: result.id,
    totalScore: result.totalScore,
    dataCompleteness: result.dataCompleteness,
    scoredAt: result.scoredAt,
    details: result.details.map((detail) => ({
      criteriaId: detail.criteria.id,
      name: detail.criteria.name,
      score: detail.score,
      maxScore: detail.criteria.maxScore,
    })),
  };
}

function formatDelta(value: number, suffix = ""): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}${suffix}`;
}

function deltaClass(value: number | null): string {
  if (value === null || value === 0) return styles.deltaNeutral;
  return value > 0 ? styles.deltaUp : styles.deltaDown;
}

function ScoreComparisonPanel({
  comparison,
}: {
  comparison: ReturnType<typeof compareScoreResults>;
}) {
  const { earlier, later, totalScoreDelta, completenessDelta, rows } = comparison;

  return (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <h4 className={styles.panelTitle}>So sánh hai lần chấm</h4>
      </div>

      <div className={styles.compareSummary}>
        <div className={styles.compareCol}>
          <span className={styles.compareColLabel}>Lần trước</span>
          <strong>{earlier.totalScore.toFixed(2)}</strong>
          <small>{dateTimeFormatter.format(new Date(earlier.scoredAt))}</small>
        </div>
        <div className={styles.compareCol}>
          <span className={styles.compareColLabel}>Lần sau</span>
          <strong>{later.totalScore.toFixed(2)}</strong>
          <small>{dateTimeFormatter.format(new Date(later.scoredAt))}</small>
        </div>
        <div className={styles.compareCol}>
          <span className={styles.compareColLabel}>Chênh lệch</span>
          <strong className={deltaClass(totalScoreDelta)}>
            {formatDelta(totalScoreDelta)}
          </strong>
          <small className={deltaClass(completenessDelta)}>
            Hoàn thiện {formatDelta(completenessDelta, "%")}
          </small>
        </div>
      </div>

      <div className={styles.criteriaList}>
        {rows.map((row) => (
          <div key={row.criteriaId} className={styles.criteriaDetail}>
            <div className={styles.criteriaDetailTop}>
              <span className={styles.criteriaName}>{row.name}</span>
              {row.presence === "both" ? (
                <span className={deltaClass(row.delta)}>{formatDelta(row.delta!, "%")}</span>
              ) : (
                <span className={styles.missingScore}>
                  {row.presence === "later-only" ? "Chỉ có lần sau" : "Chỉ có lần trước"}
                </span>
              )}
            </div>
            <div className={styles.criteriaMeta}>
              <span>
                Trước:{" "}
                {row.earlier ? `${row.earlier.score}/${row.earlier.maxScore}` : "—"}
              </span>
              <span>
                {" · "}Sau:{" "}
                {row.later ? `${row.later.score}/${row.later.maxScore}` : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreDetailPanel({
  result,
  canOverride,
  onOverride,
}: {
  result: ScoreResult;
  canOverride: boolean;
  onOverride: () => void;
}) {
  const detailMap = new Map(
    result.details.map((detail) => [detail.criteria.id, detail] as const)
  );

  return (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <div>
          <h4 className={styles.panelTitle}>Chi tiết cách tính</h4>
          <p className={styles.detailSubtitle}>
            {result.template.name} · phiên bản {result.template.version}
          </p>
        </div>
        <div className={styles.detailActions}>
          {result.isOverridden ? (
            <div className={styles.scoreComparison}>
              <span>Hệ thống {result.systemScore.toFixed(2)}</span>
              <strong>Điều chỉnh {result.totalScore.toFixed(2)}</strong>
            </div>
          ) : (
            <span className={styles.detailTotal}>{result.totalScore.toFixed(2)}/100</span>
          )}
          {canOverride && (
            <button type="button" className={styles.secondaryButton} onClick={onOverride}>
              Ghi đè điểm
            </button>
          )}
        </div>
      </div>

      {result.isOverridden && result.overrideNote && (
        <div className={styles.overrideNotice}>
          <strong>Lý do điều chỉnh:</strong> {result.overrideNote}
        </div>
      )}

      <div className={styles.criteriaList}>
        {result.template.criteria.map((criterion) => {
          const detail = detailMap.get(criterion.id);
          const converted = detail
            ? (detail.score / criterion.maxScore) * criterion.weight
            : 0;
          return (
            <div key={criterion.id} className={styles.criteriaDetail}>
              <div className={styles.criteriaDetailTop}>
                <span className={styles.criteriaName}>{criterion.name}</span>
                <span className={detail ? styles.criteriaScore : styles.missingScore}>
                  {detail ? `${detail.score}/${criterion.maxScore}` : "Thiếu dữ liệu"}
                </span>
              </div>
              <div className={styles.criteriaMeta}>
                Trọng số {criterion.weight} · Điểm quy đổi {converted.toFixed(2)}
              </div>
              {detail?.note && <div className={styles.criteriaNote}>{detail.note}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OverrideScoreModal({
  result,
  isLoading,
  error,
  onSubmit,
  onClose,
}: {
  result: ScoreResult;
  isLoading: boolean;
  error: Error | null;
  onSubmit: (formData: OverrideScoreFormData) => void;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OverrideScoreFormInput, unknown, OverrideScoreFormData>({
    resolver: zodResolver(overrideScoreFormSchema),
    defaultValues: {
      score: String(result.totalScore),
      reason: "",
    },
  });

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.overrideModal}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="override-score-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h3 id="override-score-title" className={styles.modalTitle}>Ghi đè điểm</h3>
            <p className={styles.modalSubtitle}>
              Điểm hệ thống {result.systemScore.toFixed(2)} sẽ được giữ nguyên để đối chiếu.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Đóng"
            onClick={onClose}
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className={styles.overrideField}>
            <label htmlFor="override-score">Điểm sau điều chỉnh (0–100)</label>
            <input
              id="override-score"
              type="number"
              min="0"
              max="100"
              step="any"
              {...register("score")}
            />
            {errors.score && <span className={styles.fieldError}>{errors.score.message}</span>}
          </div>

          <div className={styles.overrideField}>
            <label htmlFor="override-reason">Lý do điều chỉnh</label>
            <textarea
              id="override-reason"
              rows={4}
              placeholder="Nêu rõ căn cứ điều chỉnh điểm..."
              {...register("reason")}
            />
            {errors.reason && <span className={styles.fieldError}>{errors.reason.message}</span>}
          </div>

          {error && <div className={styles.formError} role="alert">{error.message}</div>}

          <div className={styles.modalActions}>
            <button type="submit" className={styles.primaryButton} disabled={isLoading}>
              {isLoading ? "Đang lưu..." : "Xác nhận ghi đè"}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onClose}
              disabled={isLoading}
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ScoreFormModal({
  templates,
  isLoading,
  error,
  onSubmit,
  onClose,
}: {
  templates: ScoreTemplate[];
  isLoading: boolean;
  error: Error | null;
  onSubmit: (templateId: string, formData: ScoreFormData) => void;
  onClose: () => void;
}) {
  const [templateId, setTemplateId] = useState(templates[0].id);
  const template = templates.find((item) => item.id === templateId) ?? templates[0];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="score-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h3 id="score-form-title" className={styles.modalTitle}>Chấm điểm NPP</h3>
            <p className={styles.modalSubtitle}>Điểm tổng được tự động chuẩn hóa về 100.</p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Đóng"
            onClick={onClose}
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <div className={styles.templateField}>
          <label htmlFor="score-template">Mẫu chấm điểm</label>
          <select
            id="score-template"
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
            disabled={isLoading}
          >
            {templates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · v{item.version}
              </option>
            ))}
          </select>
        </div>

        <ScoringCriteriaForm
          key={template.id}
          template={template}
          isLoading={isLoading}
          error={error}
          onSubmit={(formData) => onSubmit(template.id, formData)}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

function ScoringCriteriaForm({
  template,
  isLoading,
  error,
  onSubmit,
  onCancel,
}: {
  template: ScoreTemplate;
  isLoading: boolean;
  error: Error | null;
  onSubmit: (formData: ScoreFormData) => void;
  onCancel: () => void;
}) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ScoreFormInput, unknown, ScoreFormData>({
    resolver: zodResolver(scoreFormSchema),
    defaultValues: {
      missingDataPolicy: "EXCLUDE",
      details: template.criteria.map((criterion) => ({
        criteriaId: criterion.id,
        score: "",
        note: "",
      })),
    },
  });

  const watchedDetails = useWatch({ control, name: "details" });
  const watchedPolicy = useWatch({ control, name: "missingDataPolicy" });
  const preview = calculateScore(
    template.criteria,
    template.criteria.map((criterion, index) => {
      const value = watchedDetails?.[index]?.score ?? "";
      return {
        criteriaId: criterion.id,
        rawScore: value === "" || !Number.isFinite(Number(value)) ? null : Number(value),
      };
    }),
    watchedPolicy ?? "EXCLUDE"
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className={styles.policyField}>
        <label htmlFor="missing-policy">Xử lý tiêu chí thiếu dữ liệu</label>
        <select id="missing-policy" {...register("missingDataPolicy")}>
          {POLICY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <small>
          {POLICY_OPTIONS.find((option) => option.value === watchedPolicy)?.description}
        </small>
      </div>

      <div className={styles.formCriteriaList}>
        {template.criteria.map((criterion, index) => (
          <div key={criterion.id} className={styles.formCriteria}>
            <input
              type="hidden"
              {...register(`details.${index}.criteriaId` as const)}
            />
            <div className={styles.formCriteriaHeader}>
              <div>
                <label htmlFor={`score-${criterion.id}`}>{criterion.name}</label>
                {criterion.description && <p>{criterion.description}</p>}
              </div>
              <span>Trọng số {criterion.weight}</span>
            </div>
            <div className={styles.scoreInputRow}>
              <div className={styles.scoreInputWrap}>
                <input
                  id={`score-${criterion.id}`}
                  type="number"
                  min="0"
                  max={criterion.maxScore}
                  step="any"
                  placeholder="—"
                  {...register(`details.${index}.score` as const)}
                />
                <span>/ {criterion.maxScore}</span>
              </div>
              <input
                type="text"
                className={styles.noteInput}
                placeholder="Ghi chú / minh chứng"
                {...register(`details.${index}.note` as const)}
              />
            </div>
            {errors.details?.[index]?.score && (
              <span className={styles.fieldError}>
                {errors.details[index]?.score?.message}
              </span>
            )}
          </div>
        ))}
      </div>

      {errors.details?.root?.message && (
        <div className={styles.formError}>{errors.details.root.message}</div>
      )}

      <div className={styles.preview}>
        <div>
          <span>Điểm tạm tính</span>
          <strong>{preview.totalScore.toFixed(2)}</strong>
        </div>
        <div>
          <span>Độ hoàn thiện</span>
          <strong>{preview.dataCompleteness.toFixed(2)}%</strong>
        </div>
        {!preview.canFinalize && (
          <p>Chính sách hiện tại yêu cầu nhập đủ tất cả tiêu chí.</p>
        )}
      </div>

      {error && <div className={styles.formError} role="alert">{error.message}</div>}

      <div className={styles.modalActions}>
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={isLoading || !preview.canFinalize}
        >
          {isLoading ? "Đang lưu..." : "Lưu kết quả"}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onCancel}
          disabled={isLoading}
        >
          Hủy
        </button>
      </div>
    </form>
  );
}
