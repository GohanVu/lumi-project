"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "@/lib/auth-client";
import { AppLayout } from "@/components/layout";
import { queryKeys } from "@/lib/query-keys";
import { invalidateScoreTemplateAvailability } from "@/lib/score-queries";
import {
  templateFormSchema,
  criteriaFormSchema,
  type TemplateFormInput,
  type TemplateFormData,
  type CriteriaFormInput,
  type CriteriaFormData,
} from "@/lib/validation/score-template";
import styles from "./scoring.module.css";

type TemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

interface TemplateListItem {
  id: string;
  name: string;
  description: string | null;
  version: number;
  status: TemplateStatus;
  gradeAMin: number;
  gradeBMin: number;
  createdAt: string;
  updatedAt: string;
  _count: { criteria: number; results: number };
}

interface Criteria {
  id: string;
  name: string;
  description: string | null;
  maxScore: number;
  weight: number;
  sortOrder: number;
}

interface TemplateDetail {
  id: string;
  name: string;
  description: string | null;
  version: number;
  status: TemplateStatus;
  gradeAMin: number;
  gradeBMin: number;
  createdAt: string;
  updatedAt: string;
  _count: { results: number };
  criteria: Criteria[];
}

const STATUS_MAP: Record<TemplateStatus, { label: string; className: string }> = {
  DRAFT: { label: "Nháp", className: styles.statusDraft },
  PUBLISHED: { label: "Đã ban hành", className: styles.statusPublished },
  ARCHIVED: { label: "Lưu trữ", className: styles.statusArchived },
};

export default function ScoringPage() {
  const { data: sessionData, isPending } = useSession();
  const user = sessionData?.user as { name?: string; role?: string } | undefined;
  const isAdmin = user?.role === "ADMIN";

  return (
    <AppLayout
      title="Chấm điểm"
      userName={user?.name || "User"}
      userRole={user?.role || "USER"}
    >
      {!isPending && !isAdmin ? (
        <div className={styles.accessDenied}>
          <div className={styles.placeholderIcon} aria-hidden="true">🔒</div>
          <h2>Chỉ Admin được phép cấu hình mẫu chấm điểm</h2>
          <p>Liên hệ quản trị viên nếu bạn cần quyền truy cập.</p>
        </div>
      ) : (
        <ScoringAdmin />
      )}
    </AppLayout>
  );
}

function ScoringAdmin() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateDetail | null>(null);

  const {
    data: listData,
    isLoading: listLoading,
    isError: listError,
    error: listErr,
    refetch: refetchList,
  } = useQuery({
    queryKey: queryKeys.scoreTemplates.all,
    queryFn: async () => {
      const res = await fetch("/api/score-templates");
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Lỗi tải danh sách mẫu" }));
        throw new Error(body.error);
      }
      return res.json() as Promise<{ data: TemplateListItem[] }>;
    },
  });

  const templates = listData?.data ?? [];
  const effectiveId = selectedId ?? templates[0]?.id ?? null;

  const createTemplateMutation = useMutation({
    mutationFn: async (formData: TemplateFormData) => {
      const res = await fetch("/api/score-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          gradeAMin: formData.gradeAMin,
          gradeBMin: formData.gradeBMin,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Lỗi tạo mẫu" }));
        throw new Error(body.error);
      }
      return res.json() as Promise<{ data: TemplateListItem }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scoreTemplates.all });
      setSelectedId(result.data.id);
      setShowTemplateForm(false);
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: TemplateFormData }) => {
      const res = await fetch(`/api/score-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          gradeAMin: formData.gradeAMin,
          gradeBMin: formData.gradeBMin,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Lỗi cập nhật mẫu" }));
        throw new Error(body.error);
      }
      return res.json() as Promise<{ data: TemplateListItem }>;
    },
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scoreTemplates.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.scoreTemplates.detail(vars.id) });
      setShowTemplateForm(false);
      setEditingTemplate(null);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/score-templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Lỗi xóa mẫu" }));
        throw new Error(body.error);
      }
    },
    onSuccess: (_r, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scoreTemplates.all });
      if (selectedId === id) setSelectedId(null);
    },
  });

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    createTemplateMutation.reset();
    updateTemplateMutation.reset();
    setShowTemplateForm(true);
  };

  const handleOpenEditTemplate = (template: TemplateDetail) => {
    setEditingTemplate(template);
    createTemplateMutation.reset();
    updateTemplateMutation.reset();
    setShowTemplateForm(true);
  };

  const handleDeleteTemplate = (template: TemplateDetail) => {
    if (window.confirm(`Xóa mẫu "${template.name}"? Hành động không thể hoàn tác.`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Cấu hình chấm điểm</h1>
          <p className={styles.pageSubtitle}>
            Quản lý mẫu chấm điểm và tiêu chí đánh giá NPP
          </p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={handleOpenCreate}>
          + Tạo mẫu mới
        </button>
      </div>

      {listLoading && <div className={styles.loading}>Đang tải...</div>}

      {listError && (
        <div className={styles.error} role="alert">
          <span>{(listErr as Error).message}</span>
          <button type="button" className={styles.retryButton} onClick={() => refetchList()}>
            Thử lại
          </button>
        </div>
      )}

      {!listLoading && !listError && (
        <div className={styles.layout}>
          <div className={styles.templateList}>
            {templates.length === 0 ? (
              <div className={styles.empty}>Chưa có mẫu chấm điểm nào.</div>
            ) : (
              templates.map((t) => {
                const status = STATUS_MAP[t.status];
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`${styles.templateCard} ${
                      effectiveId === t.id ? styles.templateCardActive : ""
                    }`}
                    onClick={() => setSelectedId(t.id)}
                  >
                    <div className={styles.templateCardTop}>
                      <span className={styles.templateName}>{t.name}</span>
                      <span className={`${styles.statusBadge} ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className={styles.templateMeta}>
                      v{t.version} · {t._count.criteria} tiêu chí · {t._count.results} lần chấm
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {effectiveId ? (
            <TemplateDetailPanel
              templateId={effectiveId}
              onEditTemplate={handleOpenEditTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              onCloned={(newId) => setSelectedId(newId)}
            />
          ) : (
            <div className={styles.detail}>
              <div className={styles.placeholder}>
                <div className={styles.placeholderIcon} aria-hidden="true">⭐</div>
                <p>Chọn một mẫu để xem chi tiết, hoặc tạo mẫu mới.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {showTemplateForm && (
        <TemplateForm
          key={editingTemplate?.id ?? "new"}
          initialData={editingTemplate}
          isPending={createTemplateMutation.isPending || updateTemplateMutation.isPending}
          submitError={
            (createTemplateMutation.error as Error | null)?.message ??
            (updateTemplateMutation.error as Error | null)?.message ??
            null
          }
          onClose={() => {
            if (!createTemplateMutation.isPending && !updateTemplateMutation.isPending) {
              setShowTemplateForm(false);
              setEditingTemplate(null);
            }
          }}
          onSubmit={(formData) => {
            if (editingTemplate) {
              updateTemplateMutation.mutate({ id: editingTemplate.id, formData });
            } else {
              createTemplateMutation.mutate(formData);
            }
          }}
        />
      )}
    </>
  );
}

interface DetailPanelProps {
  templateId: string;
  onEditTemplate: (t: TemplateDetail) => void;
  onDeleteTemplate: (t: TemplateDetail) => void;
  onCloned: (newId: string) => void;
}

function TemplateDetailPanel({
  templateId,
  onEditTemplate,
  onDeleteTemplate,
  onCloned,
}: DetailPanelProps) {
  const queryClient = useQueryClient();
  const [showCriteriaForm, setShowCriteriaForm] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<Criteria | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.scoreTemplates.detail(templateId),
    queryFn: async () => {
      const res = await fetch(`/api/score-templates/${templateId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Lỗi tải chi tiết mẫu" }));
        throw new Error(body.error);
      }
      return res.json() as Promise<{ data: TemplateDetail }>;
    },
  });

  const template = data?.data;
  const isDraft = template?.status === "DRAFT";

  const createCriteriaMutation = useMutation({
    mutationFn: async (formData: CriteriaFormData) => {
      const res = await fetch(`/api/score-templates/${templateId}/criteria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          maxScore: formData.maxScore,
          weight: formData.weight,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Lỗi thêm tiêu chí" }));
        throw new Error(body.error);
      }
      return res.json() as Promise<{ data: Criteria }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scoreTemplates.detail(templateId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.scoreTemplates.all });
      handleCloseCriteria();
    },
  });

  const updateCriteriaMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: CriteriaFormData }) => {
      const res = await fetch(`/api/score-criteria/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          maxScore: formData.maxScore,
          weight: formData.weight,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Lỗi cập nhật tiêu chí" }));
        throw new Error(body.error);
      }
      return res.json() as Promise<{ data: Criteria }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scoreTemplates.detail(templateId) });
      handleCloseCriteria();
    },
  });

  const deleteCriteriaMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/score-criteria/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Lỗi xóa tiêu chí" }));
        throw new Error(body.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scoreTemplates.detail(templateId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.scoreTemplates.all });
    },
  });

  const handleOpenAddCriteria = () => {
    setEditingCriteria(null);
    createCriteriaMutation.reset();
    updateCriteriaMutation.reset();
    setShowCriteriaForm(true);
  };

  const handleOpenEditCriteria = (c: Criteria) => {
    setEditingCriteria(c);
    createCriteriaMutation.reset();
    updateCriteriaMutation.reset();
    setShowCriteriaForm(true);
  };

  const handleCloseCriteria = () => {
    if (!createCriteriaMutation.isPending && !updateCriteriaMutation.isPending) {
      setShowCriteriaForm(false);
      setEditingCriteria(null);
    }
  };

  const handleDeleteCriteria = (c: Criteria) => {
    if (window.confirm(`Xóa tiêu chí "${c.name}"?`)) {
      deleteCriteriaMutation.mutate(c.id);
    }
  };

  const transitionMutation = useMutation({
    mutationFn: async (action: "publish" | "archive") => {
      const res = await fetch(`/api/score-templates/${templateId}/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Lỗi chuyển trạng thái" }));
        throw new Error(body.error);
      }
      return res.json();
    },
    onSuccess: async () => {
      await invalidateScoreTemplateAvailability(queryClient, templateId);
    },
  });

  const cloneMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/score-templates/${templateId}/clone`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Lỗi nhân bản" }));
        throw new Error(body.error);
      }
      return res.json() as Promise<{ data: { id: string } }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scoreTemplates.all });
      onCloned(result.data.id);
    },
  });

  const handlePublish = () => {
    if (window.confirm("Ban hành mẫu này? Cấu hình sẽ bị khóa, muốn sửa phải nhân bản.")) {
      transitionMutation.mutate("publish");
    }
  };

  const handleArchive = () => {
    if (window.confirm("Lưu trữ (ngừng áp dụng) mẫu này?")) {
      transitionMutation.mutate("archive");
    }
  };

  const transitionError =
    (transitionMutation.error as Error | null)?.message ??
    (cloneMutation.error as Error | null)?.message ??
    null;

  if (isLoading) {
    return (
      <div className={styles.detail}>
        <div className={styles.loading}>Đang tải chi tiết...</div>
      </div>
    );
  }

  if (isError || !template) {
    return (
      <div className={styles.detail}>
        <div className={styles.error} role="alert">
          <span>{(error as Error)?.message || "Không tìm thấy mẫu"}</span>
          <button type="button" className={styles.retryButton} onClick={() => refetch()}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const totalWeight = template.criteria.reduce((sum, c) => sum + c.weight, 0);

  return (
    <div className={styles.detail}>
      <div className={styles.detailHeader}>
        <div className={styles.detailHeaderTop}>
          <div>
            <div className={styles.detailName}>{template.name}</div>
            {template.description && (
              <p className={styles.detailDescription}>{template.description}</p>
            )}
          </div>
          <div className={styles.detailActions}>
            {isDraft && (
              <>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => onEditTemplate(template)}
                >
                  Sửa mẫu
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handlePublish}
                  disabled={transitionMutation.isPending || template.criteria.length === 0}
                  title={template.criteria.length === 0 ? "Mẫu chấm điểm cần ít nhất 1 tiêu chí mới được ban hành" : undefined}
                >
                  Ban hành
                </button>
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                  onClick={() => onDeleteTemplate(template)}
                  disabled={template._count.results > 0}
                >
                  Xóa
                </button>
              </>
            )}
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => cloneMutation.mutate()}
              disabled={cloneMutation.isPending}
            >
              {cloneMutation.isPending ? "Đang nhân bản..." : "Nhân bản"}
            </button>
            {template.status === "PUBLISHED" && (
              <button
                type="button"
                className={styles.iconBtn}
                onClick={handleArchive}
                disabled={transitionMutation.isPending}
              >
                Lưu trữ
              </button>
            )}
          </div>
        </div>
        {transitionError && (
          <div className={styles.submitError} role="alert">{transitionError}</div>
        )}
        <div className={styles.gradeThresholds}>
          <span><strong>A</strong> từ {template.gradeAMin} điểm</span>
          <span><strong>B</strong> từ {template.gradeBMin} đến dưới {template.gradeAMin}</span>
          <span><strong>C</strong> dưới {template.gradeBMin} điểm</span>
        </div>
        {isDraft && template.criteria.length === 0 && (
          <div className={styles.lockNotice} style={{ backgroundColor: "var(--color-danger-light)", color: "var(--color-danger)" }}>
            ⚠️ Mẫu chưa có tiêu chí. Bạn cần thêm ít nhất 1 tiêu chí ở mục bên dưới để có thể ban hành mẫu này.
          </div>
        )}
        {!isDraft && (
          <div className={styles.lockNotice}>
            Mẫu đã {STATUS_MAP[template.status].label.toLowerCase()} — cấu hình đã bị khóa.
            Nhấn &quot;Nhân bản&quot; để tạo phiên bản mới (DRAFT) và chỉnh sửa.
          </div>
        )}
      </div>

      <div className={styles.criteriaSection}>
        <div className={styles.criteriaSectionHeader}>
          <div>
            <div className={styles.criteriaTitle}>Tiêu chí đánh giá</div>
            <div className={styles.criteriaTitleSub}>
              {template.criteria.length} tiêu chí · tổng trọng số {totalWeight}
            </div>
          </div>
          {isDraft && (
            <button type="button" className={styles.primaryButton} onClick={handleOpenAddCriteria}>
              + Thêm tiêu chí
            </button>
          )}
        </div>

        {template.criteria.length === 0 ? (
          <div className={styles.empty}>
            Chưa có tiêu chí nào. {isDraft && "Thêm tiêu chí để hoàn thiện mẫu."}
          </div>
        ) : (
          <table className={styles.criteriaTable}>
            <thead>
              <tr>
                <th>Tiêu chí</th>
                <th className={styles.numCol}>Điểm tối đa</th>
                <th className={styles.numCol}>Trọng số</th>
                {isDraft && <th aria-label="Thao tác" />}
              </tr>
            </thead>
            <tbody>
              {template.criteria.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className={styles.criteriaNameCell}>{c.name}</div>
                    {c.description && <div className={styles.criteriaDesc}>{c.description}</div>}
                  </td>
                  <td className={styles.numCol}>{c.maxScore}</td>
                  <td className={styles.numCol}>{c.weight}</td>
                  {isDraft && (
                    <td className={styles.numCol}>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => handleOpenEditCriteria(c)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                          onClick={() => handleDeleteCriteria(c)}
                          disabled={deleteCriteriaMutation.isPending}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCriteriaForm && (
        <CriteriaForm
          key={editingCriteria?.id ?? "new"}
          initialData={editingCriteria}
          isPending={createCriteriaMutation.isPending || updateCriteriaMutation.isPending}
          submitError={
            (createCriteriaMutation.error as Error | null)?.message ??
            (updateCriteriaMutation.error as Error | null)?.message ??
            null
          }
          onClose={handleCloseCriteria}
          onSubmit={(formData) => {
            if (editingCriteria) {
              updateCriteriaMutation.mutate({ id: editingCriteria.id, formData });
            } else {
              createCriteriaMutation.mutate(formData);
            }
          }}
        />
      )}
    </div>
  );
}

interface TemplateFormProps {
  initialData: TemplateDetail | null;
  isPending: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (data: TemplateFormData) => void;
}

function TemplateForm({ initialData, isPending, submitError, onClose, onSubmit }: TemplateFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TemplateFormInput, unknown, TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      gradeAMin: initialData?.gradeAMin ?? 80,
      gradeBMin: initialData?.gradeBMin ?? 60,
    },
  });

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="tpl-form-title">
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 id="tpl-form-title" className={styles.modalTitle}>
            {initialData ? "Chỉnh sửa mẫu" : "Tạo mẫu chấm điểm"}
          </h2>
          <button type="button" className={styles.modalClose} aria-label="Đóng" onClick={onClose} disabled={isPending}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className={styles.modalBody}>
            <div className={styles.field}>
              <label htmlFor="tpl-name" className={styles.label}>
                Tên mẫu<span className={styles.required}>*</span>
              </label>
              <input
                id="tpl-name"
                type="text"
                className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
                placeholder="VD: Đánh giá NPP 2026"
                {...register("name")}
              />
              {errors.name && <span className={styles.fieldError}>{errors.name.message}</span>}
            </div>
            <div className={styles.field}>
              <label htmlFor="tpl-desc" className={styles.label}>Mô tả</label>
              <textarea
                id="tpl-desc"
                className={styles.textarea}
                placeholder="Mô tả mục đích của mẫu (tùy chọn)..."
                {...register("description")}
              />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="tpl-grade-a" className={styles.label}>
                  Hạng A từ<span className={styles.required}>*</span>
                </label>
                <input
                  id="tpl-grade-a"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className={`${styles.input} ${errors.gradeAMin ? styles.inputError : ""}`}
                  {...register("gradeAMin")}
                />
                {errors.gradeAMin && <span className={styles.fieldError}>{errors.gradeAMin.message}</span>}
              </div>
              <div className={styles.field}>
                <label htmlFor="tpl-grade-b" className={styles.label}>
                  Hạng B từ<span className={styles.required}>*</span>
                </label>
                <input
                  id="tpl-grade-b"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className={`${styles.input} ${errors.gradeBMin ? styles.inputError : ""}`}
                  {...register("gradeBMin")}
                />
                {errors.gradeBMin && <span className={styles.fieldError}>{errors.gradeBMin.message}</span>}
              </div>
            </div>
            <p className={styles.hint}>Hạng C áp dụng cho điểm thấp hơn ngưỡng B.</p>
            {submitError && <div className={styles.submitError} role="alert">{submitError}</div>}
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnCancel} onClick={onClose} disabled={isPending}>
              Huỷ
            </button>
            <button type="submit" className={styles.btnSubmit} disabled={isPending}>
              {isPending ? "Đang lưu..." : initialData ? "Lưu thay đổi" : "Tạo mẫu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CriteriaFormProps {
  initialData: Criteria | null;
  isPending: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (data: CriteriaFormData) => void;
}

function CriteriaForm({ initialData, isPending, submitError, onClose, onSubmit }: CriteriaFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CriteriaFormInput, unknown, CriteriaFormData>({
    resolver: zodResolver(criteriaFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      maxScore: initialData?.maxScore ?? 10,
      weight: initialData?.weight ?? 1,
    },
  });

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="crit-form-title">
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 id="crit-form-title" className={styles.modalTitle}>
            {initialData ? "Chỉnh sửa tiêu chí" : "Thêm tiêu chí"}
          </h2>
          <button type="button" className={styles.modalClose} aria-label="Đóng" onClick={onClose} disabled={isPending}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className={styles.modalBody}>
            <div className={styles.field}>
              <label htmlFor="crit-name" className={styles.label}>
                Tên tiêu chí<span className={styles.required}>*</span>
              </label>
              <input
                id="crit-name"
                type="text"
                className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
                placeholder="VD: Năng lực tài chính"
                {...register("name")}
              />
              {errors.name && <span className={styles.fieldError}>{errors.name.message}</span>}
            </div>
            <div className={styles.field}>
              <label htmlFor="crit-desc" className={styles.label}>Mô tả</label>
              <textarea
                id="crit-desc"
                className={styles.textarea}
                placeholder="Giải thích tiêu chí (tùy chọn)..."
                {...register("description")}
              />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="crit-max" className={styles.label}>
                  Điểm tối đa<span className={styles.required}>*</span>
                </label>
                <input
                  id="crit-max"
                  type="number"
                  step="0.1"
                  min="0"
                  className={`${styles.input} ${errors.maxScore ? styles.inputError : ""}`}
                  {...register("maxScore")}
                />
                {errors.maxScore && <span className={styles.fieldError}>{errors.maxScore.message}</span>}
              </div>
              <div className={styles.field}>
                <label htmlFor="crit-weight" className={styles.label}>
                  Trọng số<span className={styles.required}>*</span>
                </label>
                <input
                  id="crit-weight"
                  type="number"
                  step="0.1"
                  min="0"
                  className={`${styles.input} ${errors.weight ? styles.inputError : ""}`}
                  {...register("weight")}
                />
                {errors.weight && <span className={styles.fieldError}>{errors.weight.message}</span>}
              </div>
            </div>
            <p className={styles.hint}>
              Trọng số chỉ cần là số dương; hệ thống tự chuẩn hóa khi tính điểm.
            </p>
            {submitError && <div className={styles.submitError} role="alert">{submitError}</div>}
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnCancel} onClick={onClose} disabled={isPending}>
              Huỷ
            </button>
            <button type="submit" className={styles.btnSubmit} disabled={isPending}>
              {isPending ? "Đang lưu..." : initialData ? "Lưu thay đổi" : "Thêm tiêu chí"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
