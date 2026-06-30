"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { calculateScore } from "@/lib/scoring/calculate";
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

  // Hai lần chấm đang chọn để so sánh, sắp xếp cũ → mới để đọc thay đổi theo thời gian.
  const compareResults = compareIds
    .map((id) => results.find((result) => result.id === id))
    .filter((result): result is ScoreResult => Boolean(result))
    .sort(
      (a, b) => new Date(a.scoredAt).getTime() - new Date(b.scoredAt).getTime()
    );

  const openForm = () => {
    createMutation.reset();
    setShowForm(true);
  };

  const toggleCompareMode = () => {
    setCompareMode((prev) => !prev);
    setCompareIds([]);
  };

  const handleHistoryClick = (id: string) => {
    if (!compareMode) {
      setSelectedResultId(id);
      return;
    }
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((value) => value !== id);
      if (prev.length < 2) return [...prev, id];
      return [prev[1], id]; // bỏ lựa chọn cũ nhất, giữ tối đa 2
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
                  >
                    {compareMode ? "Hủy so sánh" : "So sánh"}
                  </button>
                )}
              </div>
              {compareMode && (
                <p className={styles.compareHint}>
                  Chọn 2 lần chấm để so sánh ({compareIds.length}/2).
                </p>
              )}
              <div className={styles.historyList}>
                {results.map((result) => {
                  const compareIndex = compareIds.indexOf(result.id);
                  const isActive = compareMode
                    ? compareIndex !== -1
                    : selectedResult?.id === result.id;
                  return (
                    <button
                      key={result.id}
                      type="button"
                      className={`${styles.historyItem} ${
                        isActive ? styles.historyItemActive : ""
                      }`}
                      onClick={() => handleHistoryClick(result.id)}
                    >
                      <span className={styles.historyScore}>{result.totalScore.toFixed(2)}</span>
                      <span className={styles.historyInfo}>
                        <strong>{result.template.name} v{result.template.version}</strong>
                        <small>{dateTimeFormatter.format(new Date(result.scoredAt))}</small>
                        {result.isOverridden && <small>Đã điều chỉnh</small>}
                      </span>
                      {compareMode && compareIndex !== -1 && (
                        <span className={styles.compareBadge}>{compareIndex + 1}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {compareMode ? (
              compareResults.length === 2 ? (
                <ScoreComparePanel
                  older={compareResults[0]}
                  newer={compareResults[1]}
                />
              ) : (
                <div className={styles.comparePrompt}>
                  Chọn đủ 2 lần chấm ở danh sách bên trái để xem bảng so sánh.
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

interface CriteriaCell {
  name: string;
  maxScore: number;
  score: number | null;
}

function buildCriteriaMap(result: ScoreResult): Map<string, CriteriaCell> {
  const map = new Map<string, CriteriaCell>();
  for (const criterion of result.template.criteria) {
    map.set(criterion.id, {
      name: criterion.name,
      maxScore: criterion.maxScore,
      score: null,
    });
  }
  for (const detail of result.details) {
    const existing = map.get(detail.criteria.id);
    if (existing) {
      existing.score = detail.score;
    } else {
      map.set(detail.criteria.id, {
        name: detail.criteria.name,
        maxScore: detail.criteria.maxScore,
        score: detail.score,
      });
    }
  }
  return map;
}

function formatDelta(value: number) {
  return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

function ScoreComparePanel({
  older,
  newer,
}: {
  older: ScoreResult;
  newer: ScoreResult;
}) {
  const olderMap = buildCriteriaMap(older);
  const newerMap = buildCriteriaMap(newer);

  // Union các tiêu chí của cả hai lần chấm (template có thể khác phiên bản).
  const criteriaIds: string[] = [];
  const seen = new Set<string>();
  for (const criterion of [...older.template.criteria, ...newer.template.criteria]) {
    if (!seen.has(criterion.id)) {
      seen.add(criterion.id);
      criteriaIds.push(criterion.id);
    }
  }

  const totalDelta = newer.totalScore - older.totalScore;
  const completenessDelta = newer.dataCompleteness - older.dataCompleteness;

  const deltaClass = (value: number) => {
    if (value > 0) return styles.deltaUp;
    if (value < 0) return styles.deltaDown;
    return styles.deltaFlat;
  };

  const renderCell = (cell: CriteriaCell | undefined) =>
    !cell
      ? "—"
      : cell.score === null
        ? "Thiếu"
        : `${cell.score}/${cell.maxScore}`;

  return (
    <div className={styles.detailPanel}>
      <h4 className={styles.panelTitle}>So sánh hai lần chấm</h4>

      <div className={styles.compareSummary}>
        <div className={styles.compareSummaryCol}>
          <span>Trước</span>
          <strong>{older.totalScore.toFixed(2)}</strong>
          <small>{dateTimeFormatter.format(new Date(older.scoredAt))}</small>
          <small>{older.template.name} v{older.template.version}</small>
        </div>
        <div className={styles.compareSummaryCol}>
          <span>Sau</span>
          <strong>{newer.totalScore.toFixed(2)}</strong>
          <small>{dateTimeFormatter.format(new Date(newer.scoredAt))}</small>
          <small>{newer.template.name} v{newer.template.version}</small>
        </div>
        <div className={styles.compareSummaryCol}>
          <span>Thay đổi</span>
          <strong className={deltaClass(totalDelta)}>{formatDelta(totalDelta)}</strong>
          <small>Hoàn thiện {formatDelta(completenessDelta)}%</small>
        </div>
      </div>

      <div className={styles.compareTable}>
        <div className={`${styles.compareRow} ${styles.compareHead}`}>
          <span>Tiêu chí</span>
          <span>Trước</span>
          <span>Sau</span>
          <span>Δ</span>
        </div>
        {criteriaIds.map((id) => {
          const olderCell = olderMap.get(id);
          const newerCell = newerMap.get(id);
          const name = olderCell?.name ?? newerCell?.name ?? "—";
          const delta =
            olderCell?.score != null && newerCell?.score != null
              ? newerCell.score - olderCell.score
              : null;
          return (
            <div key={id} className={styles.compareRow}>
              <span className={styles.compareCriteria}>{name}</span>
              <span>{renderCell(olderCell)}</span>
              <span>{renderCell(newerCell)}</span>
              <span className={delta != null ? deltaClass(delta) : undefined}>
                {delta != null ? formatDelta(delta) : "—"}
              </span>
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
