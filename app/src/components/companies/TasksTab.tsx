"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  taskFormSchema,
  type TaskFormData,
  type TaskFormInput,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/validation/task";
import { queryKeys } from "@/lib/query-keys";
import styles from "./TasksTab.module.css";

interface TaskUser {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: TaskUser;
  createdBy: TaskUser;
}

interface TasksTabProps {
  companyId: string;
}

const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

const STATUS_MAP: Record<TaskStatus, { label: string; className: string }> = {
  TODO: { label: "Cần làm", className: styles.statusTodo },
  IN_PROGRESS: { label: "Đang làm", className: styles.statusInProgress },
  DONE: { label: "Hoàn thành", className: styles.statusDone },
  CANCELLED: { label: "Huỷ", className: styles.statusCancelled },
};

const PRIORITY_MAP: Record<TaskPriority, { label: string; className: string }> = {
  LOW: { label: "Thấp", className: styles.priorityLow },
  MEDIUM: { label: "TB", className: styles.priorityMedium },
  HIGH: { label: "Cao", className: styles.priorityHigh },
  URGENT: { label: "Khẩn", className: styles.priorityUrgent },
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VIETNAM_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function isOverdue(dueDate: string, status: TaskStatus): boolean {
  if (status === "DONE" || status === "CANCELLED") return false;
  return new Date(dueDate) < new Date();
}

/** Chuyển ISO string sang format datetime-local (YYYY-MM-DDTHH:mm) */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type FilterType = "all" | "active" | "done";

function filterTasks(tasks: Task[], filter: FilterType): Task[] {
  switch (filter) {
    case "active":
      return tasks.filter((t) => t.status === "TODO" || t.status === "IN_PROGRESS");
    case "done":
      return tasks.filter((t) => t.status === "DONE" || t.status === "CANCELLED");
    default:
      return tasks;
  }
}

export function TasksTab({ companyId }: TasksTabProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.companies.tasks(companyId),
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/tasks`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Lỗi tải danh sách nhiệm vụ" }));
        throw new Error(body.error);
      }
      return res.json() as Promise<{ data: Task[] }>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: TaskFormData) => {
      const res = await fetch(`/api/companies/${companyId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          status: formData.status,
          priority: formData.priority,
          dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Lỗi tạo nhiệm vụ" }));
        throw new Error(body.error);
      }
      return res.json() as Promise<{ data: Task }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.tasks(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(companyId) });
      handleCloseForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<TaskFormData> & { status?: TaskStatus } }) => {
      const body: Record<string, unknown> = {};
      if (payload.title !== undefined) body.title = payload.title;
      if (payload.description !== undefined) body.description = payload.description || null;
      if (payload.status !== undefined) body.status = payload.status;
      if (payload.priority !== undefined) body.priority = payload.priority;
      if ("dueDate" in payload) {
        body.dueDate = payload.dueDate ? new Date(payload.dueDate).toISOString() : null;
      }
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "Lỗi cập nhật nhiệm vụ" }));
        throw new Error(errBody.error);
      }
      return res.json() as Promise<{ data: Task }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.tasks(companyId) });
      handleCloseForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Lỗi xóa nhiệm vụ" }));
        throw new Error(body.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.tasks(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(companyId) });
    },
  });

  const handleOpenCreate = () => {
    setEditingTask(null);
    createMutation.reset();
    updateMutation.reset();
    setShowForm(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    createMutation.reset();
    updateMutation.reset();
    setShowForm(true);
  };

  const handleCloseForm = () => {
    if (!createMutation.isPending && !updateMutation.isPending) {
      setShowForm(false);
      setEditingTask(null);
    }
  };

  const handleStatusToggle = (task: Task) => {
    const nextStatus: TaskStatus = task.status === "DONE" ? "TODO" : "DONE";
    updateMutation.mutate({ id: task.id, payload: { status: nextStatus } });
  };

  const handleDelete = (task: Task) => {
    if (window.confirm(`Xóa nhiệm vụ "${task.title}"?`)) {
      deleteMutation.mutate(task.id);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Đang tải nhiệm vụ...</div>;
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

  const allTasks = data?.data ?? [];
  const visibleTasks = filterTasks(allTasks, filter);
  const activeCnt = allTasks.filter((t) => t.status === "TODO" || t.status === "IN_PROGRESS").length;

  return (
    <section aria-labelledby="tasks-title">
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h3 id="tasks-title" className={styles.title}>
            Nhiệm vụ
          </h3>
          <p className={styles.subtitle}>
            {allTasks.length} nhiệm vụ · {activeCnt} đang thực hiện
          </p>
        </div>
        <button type="button" className={styles.addButton} onClick={handleOpenCreate}>
          + Thêm nhiệm vụ
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters} role="tablist" aria-label="Lọc nhiệm vụ">
        {(
          [
            { key: "all", label: "Tất cả" },
            { key: "active", label: "Đang thực hiện" },
            { key: "done", label: "Hoàn thành / Huỷ" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={filter === key}
            type="button"
            className={`${styles.filterBtn} ${filter === key ? styles.filterBtnActive : ""}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Empty */}
      {visibleTasks.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon} aria-hidden="true">
            ✅
          </div>
          <h3>
            {filter === "all"
              ? "Chưa có nhiệm vụ"
              : filter === "active"
                ? "Không có nhiệm vụ đang thực hiện"
                : "Chưa có nhiệm vụ hoàn thành"}
          </h3>
          {filter === "all" && <p>Thêm nhiệm vụ để theo dõi công việc với NPP.</p>}
        </div>
      )}

      {/* Task list */}
      {visibleTasks.length > 0 && (
        <ol className={styles.taskList}>
          {visibleTasks.map((task) => {
            const isDone = task.status === "DONE";
            const isCancelled = task.status === "CANCELLED";
            const statusInfo = STATUS_MAP[task.status];
            const priorityInfo = PRIORITY_MAP[task.priority];
            const overdue = task.dueDate ? isOverdue(task.dueDate, task.status) : false;

            return (
              <li key={task.id} className={`${styles.taskCard} ${isDone ? styles.taskCardDone : ""}`}>
                {/* Status toggle (checkbox) */}
                <button
                  type="button"
                  aria-label={isDone ? "Đánh dấu chưa xong" : "Đánh dấu hoàn thành"}
                  className={`${styles.statusToggle} ${isDone ? styles.statusToggleDone : task.status === "IN_PROGRESS" ? styles.statusToggleInProgress : ""}`}
                  onClick={() => handleStatusToggle(task)}
                  disabled={isCancelled || updateMutation.isPending}
                >
                  {isDone && "✓"}
                  {task.status === "IN_PROGRESS" && "…"}
                </button>

                {/* Body */}
                <div className={styles.taskBody}>
                  <p className={`${styles.taskTitle} ${isDone ? styles.taskTitleDone : ""}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className={styles.taskDescription}>{task.description}</p>
                  )}
                  <div className={styles.taskMeta}>
                    <span className={`${styles.priorityBadge} ${priorityInfo.className}`}>
                      {priorityInfo.label}
                    </span>
                    <span className={`${styles.statusBadge} ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                    {task.dueDate && (
                      <span className={`${styles.deadline} ${overdue ? styles.deadlineOverdue : ""}`}>
                        {overdue ? "⚠ Quá hạn · " : "📅 "}
                        {dateFormatter.format(new Date(task.dueDate))}
                      </span>
                    )}
                    <span className={styles.assignee}>{task.assignedTo.name}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className={styles.taskActions}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => handleOpenEdit(task)}
                    disabled={updateMutation.isPending}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                    onClick={() => handleDelete(task)}
                    disabled={deleteMutation.isPending}
                  >
                    Xóa
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Modal form */}
      {showForm && (
        <TaskForm
          key={editingTask?.id ?? "new"}
          initialData={editingTask}
          isPending={createMutation.isPending || updateMutation.isPending}
          submitError={
            (createMutation.error as Error | null)?.message ??
            (updateMutation.error as Error | null)?.message ??
            null
          }
          onClose={handleCloseForm}
          onSubmit={(formData) => {
            if (editingTask) {
              updateMutation.mutate({ id: editingTask.id, payload: formData });
            } else {
              createMutation.mutate(formData);
            }
          }}
        />
      )}
    </section>
  );
}

// ─── TaskForm modal ────────────────────────────────────────────────────────────

interface TaskFormProps {
  initialData: Task | null;
  isPending: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
}

function TaskForm({ initialData, isPending, submitError, onClose, onSubmit }: TaskFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormInput, unknown, TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      status: initialData?.status ?? "TODO",
      priority: initialData?.priority ?? "MEDIUM",
      dueDate: initialData?.dueDate ? toDatetimeLocal(initialData.dueDate) : "",
    },
  });

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="task-form-title">
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 id="task-form-title" className={styles.modalTitle}>
            {initialData ? "Chỉnh sửa nhiệm vụ" : "Thêm nhiệm vụ mới"}
          </h2>
          <button
            type="button"
            className={styles.modalClose}
            aria-label="Đóng"
            onClick={onClose}
            disabled={isPending}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className={styles.modalBody}>
            {/* Tiêu đề */}
            <div className={styles.field}>
              <label htmlFor="task-title" className={styles.label}>
                Tiêu đề<span className={styles.required}>*</span>
              </label>
              <input
                id="task-title"
                type="text"
                className={`${styles.input} ${errors.title ? styles.inputError : ""}`}
                placeholder="Nhập tiêu đề nhiệm vụ..."
                {...register("title")}
              />
              {errors.title && <span className={styles.fieldError}>{errors.title.message}</span>}
            </div>

            {/* Mô tả */}
            <div className={styles.field}>
              <label htmlFor="task-description" className={styles.label}>
                Mô tả
              </label>
              <textarea
                id="task-description"
                className={styles.textarea}
                placeholder="Chi tiết nhiệm vụ (tùy chọn)..."
                {...register("description")}
              />
            </div>

            {/* Status + Priority */}
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label htmlFor="task-status" className={styles.label}>
                  Trạng thái
                </label>
                <select id="task-status" className={styles.select} {...register("status")}>
                  <option value="TODO">Cần làm</option>
                  <option value="IN_PROGRESS">Đang làm</option>
                  <option value="DONE">Hoàn thành</option>
                  <option value="CANCELLED">Huỷ</option>
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="task-priority" className={styles.label}>
                  Ưu tiên
                </label>
                <select id="task-priority" className={styles.select} {...register("priority")}>
                  <option value="LOW">Thấp</option>
                  <option value="MEDIUM">Trung bình</option>
                  <option value="HIGH">Cao</option>
                  <option value="URGENT">Khẩn cấp</option>
                </select>
              </div>
            </div>

            {/* Deadline */}
            <div className={styles.field}>
              <label htmlFor="task-dueDate" className={styles.label}>
                Deadline
              </label>
              <input
                id="task-dueDate"
                type="datetime-local"
                className={`${styles.input} ${errors.dueDate ? styles.inputError : ""}`}
                {...register("dueDate")}
              />
              {errors.dueDate && <span className={styles.fieldError}>{errors.dueDate.message}</span>}
            </div>

            {/* Submit error */}
            {submitError && (
              <div className={styles.submitError} role="alert">
                {submitError}
              </div>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={onClose}
              disabled={isPending}
            >
              Huỷ
            </button>
            <button type="submit" className={styles.btnSubmit} disabled={isPending}>
              {isPending ? "Đang lưu..." : initialData ? "Lưu thay đổi" : "Thêm nhiệm vụ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
