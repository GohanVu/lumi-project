"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  interactionFormSchema,
  type InteractionFormData,
  type InteractionFormInput,
  type InteractionType,
} from "@/lib/validation/interaction";
import { queryKeys } from "@/lib/query-keys";
import styles from "./TimelineTab.module.css";

interface Interaction {
  id: string;
  type: InteractionType;
  content: string;
  result: string | null;
  contactName: string | null;
  followUpAt: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
}

interface TimelineTabProps {
  companyId: string;
}

const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

const TYPE_MAP: Record<
  InteractionType,
  { label: string; icon: string; className: string }
> = {
  CALL: { label: "Gọi điện", icon: "☎", className: styles.typeCall },
  VISIT: { label: "Ghé thăm", icon: "⌂", className: styles.typeVisit },
  EMAIL: { label: "Email", icon: "✉", className: styles.typeEmail },
  MEETING: { label: "Cuộc họp", icon: "♟", className: styles.typeMeeting },
  ZALO: { label: "Zalo/Chat", icon: "●", className: styles.typeZalo },
  OTHER: { label: "Khác", icon: "•", className: styles.typeOther },
};

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: VIETNAM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateLabelFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VIETNAM_TIME_ZONE,
  weekday: "long",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VIETNAM_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VIETNAM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function groupInteractionsByDate(interactions: Interaction[]) {
  const groups = new Map<string, Interaction[]>();

  for (const interaction of interactions) {
    const key = dateKeyFormatter.format(new Date(interaction.createdAt));
    const group = groups.get(key) || [];
    group.push(interaction);
    groups.set(key, group);
  }

  return Array.from(groups.entries()).map(([dateKey, items]) => ({
    dateKey,
    label: dateLabelFormatter.format(new Date(items[0].createdAt)),
    items,
  }));
}

export function TimelineTab({ companyId }: TimelineTabProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.companies.interactions(companyId),
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}/interactions`);
      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({ error: "Lỗi tải timeline tương tác" }));
        throw new Error(body.error);
      }

      return response.json() as Promise<{ data: Interaction[] }>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: InteractionFormData) => {
      const response = await fetch(`/api/companies/${companyId}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.type,
          content: formData.content,
          result: formData.result || null,
          contactName: formData.contactName || null,
          followUpAt: formData.followUpAt
            ? new Date(formData.followUpAt).toISOString()
            : null,
        }),
      });

      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({ error: "Lỗi ghi nhận tương tác" }));
        throw new Error(body.error);
      }

      return response.json() as Promise<{ data: Interaction }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.interactions(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(companyId) });
      setShowForm(false);
    },
  });

  const handleOpenForm = () => {
    createMutation.reset();
    setShowForm(true);
  };

  const handleCloseForm = () => {
    if (!createMutation.isPending) {
      createMutation.reset();
      setShowForm(false);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Đang tải timeline...</div>;
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

  const interactions = data?.data || [];

  const groups = groupInteractionsByDate(interactions);

  return (
    <section aria-labelledby="timeline-title">
      <div className={styles.header}>
        <div>
          <h3 id="timeline-title" className={styles.title}>Timeline tương tác</h3>
          <p className={styles.subtitle}>{interactions.length} hoạt động đã ghi nhận</p>
        </div>
        <button type="button" className={styles.addButton} onClick={handleOpenForm}>
          + Thêm tương tác
        </button>
      </div>

      {interactions.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon} aria-hidden="true">◎</div>
          <h3>Chưa có tương tác</h3>
          <p>Hãy ghi nhận cuộc gọi, buổi gặp hoặc trao đổi đầu tiên với NPP.</p>
        </div>
      ) : (
        <div className={styles.groups}>
          {groups.map((group) => (
          <section key={group.dateKey} className={styles.group}>
            <h4 className={styles.dateHeading}>{group.label}</h4>
            <ol className={styles.timelineList}>
              {group.items.map((interaction) => {
                const type = TYPE_MAP[interaction.type];

                return (
                  <li key={interaction.id} className={styles.timelineItem}>
                    <div
                      className={`${styles.marker} ${type.className}`}
                      aria-hidden="true"
                    >
                      {type.icon}
                    </div>
                    <article className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardTitleRow}>
                          <span className={`${styles.typeBadge} ${type.className}`}>
                            {type.label}
                          </span>
                          {interaction.contactName && (
                            <span className={styles.contactName}>
                              với {interaction.contactName}
                            </span>
                          )}
                        </div>
                        <time dateTime={interaction.createdAt} className={styles.time}>
                          {timeFormatter.format(new Date(interaction.createdAt))}
                        </time>
                      </div>

                      <p className={styles.content}>{interaction.content}</p>

                      {interaction.result && (
                        <div className={styles.result}>
                          <span className={styles.detailLabel}>Kết quả</span>
                          <span>{interaction.result}</span>
                        </div>
                      )}

                      <div className={styles.cardFooter}>
                        <span>Ghi bởi {interaction.createdBy.name}</span>
                        {interaction.followUpAt && (
                          <span className={styles.followUp}>
                            Follow-up: {dateTimeFormatter.format(new Date(interaction.followUpAt))}
                          </span>
                        )}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>
          ))}
        </div>
      )}

      {showForm && (
        <InteractionFormModal
          onSubmit={(formData) => createMutation.mutate(formData)}
          onClose={handleCloseForm}
          isLoading={createMutation.isPending}
          error={createMutation.error instanceof Error ? createMutation.error : null}
        />
      )}
    </section>
  );
}

function InteractionFormModal({
  onSubmit,
  onClose,
  isLoading,
  error,
}: {
  onSubmit: (data: InteractionFormData) => void;
  onClose: () => void;
  isLoading: boolean;
  error: Error | null;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InteractionFormInput, unknown, InteractionFormData>({
    resolver: zodResolver(interactionFormSchema),
    defaultValues: {
      type: "CALL",
      content: "",
      result: "",
      contactName: "",
      followUpAt: "",
    },
  });

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="interaction-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 id="interaction-form-title" className={styles.modalTitle}>
            Thêm tương tác
          </h3>
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
          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="if-type">Loại tương tác *</label>
            <select id="if-type" className={styles.formSelect} {...register("type")}>
              <option value="CALL">Gọi điện</option>
              <option value="VISIT">Ghé thăm</option>
              <option value="EMAIL">Email</option>
              <option value="MEETING">Cuộc họp</option>
              <option value="ZALO">Zalo/Chat</option>
              <option value="OTHER">Khác</option>
            </select>
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="if-contactName">
              Người đã liên hệ
            </label>
            <input
              id="if-contactName"
              type="text"
              className={styles.formInput}
              placeholder="Nguyễn Văn A"
              {...register("contactName")}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="if-content">Nội dung *</label>
            <textarea
              id="if-content"
              className={styles.formTextarea}
              placeholder="Nội dung đã trao đổi..."
              rows={5}
              {...register("content")}
            />
            {errors.content && (
              <span className={styles.formError}>{errors.content.message}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="if-result">Kết quả</label>
            <textarea
              id="if-result"
              className={styles.formTextarea}
              placeholder="Kết quả sau tương tác..."
              rows={3}
              {...register("result")}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="if-followUpAt">
              Lịch follow-up
            </label>
            <input
              id="if-followUpAt"
              type="datetime-local"
              className={styles.formInput}
              {...register("followUpAt")}
            />
            {errors.followUpAt && (
              <span className={styles.formError}>{errors.followUpAt.message}</span>
            )}
          </div>

          {error && (
            <div className={styles.formSubmitError} role="alert">{error.message}</div>
          )}

          <div className={styles.modalActions}>
            <button type="submit" className={styles.submitButton} disabled={isLoading}>
              {isLoading ? "Đang lưu..." : "Lưu tương tác"}
            </button>
            <button
              type="button"
              className={styles.cancelButton}
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
