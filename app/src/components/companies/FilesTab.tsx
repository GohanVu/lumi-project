"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { humanFileSize } from "@/lib/attachments";
import styles from "./FilesTab.module.css";

interface Attachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploadedBy: { id: string; name: string };
}

interface FilesTabProps {
  companyId: string;
}

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("word")) return "📝";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "📊";
  return "📎";
}

export function FilesTab({ companyId }: FilesTabProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.companies.attachments(companyId),
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/attachments`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Lỗi tải danh sách file" }));
        throw new Error(body.error);
      }
      return res.json() as Promise<{ data: Attachment[] }>;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.companies.attachments(companyId),
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(companyId) });
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/companies/${companyId}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Lỗi tải file lên" }));
        throw new Error(body.error);
      }
      return res.json() as Promise<{ data: Attachment }>;
    },
    onSuccess: () => {
      invalidate();
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const res = await fetch(
        `/api/companies/${companyId}/attachments/${attachmentId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Lỗi xóa file" }));
        throw new Error(body.error);
      }
      return res.json() as Promise<{ data: { id: string } }>;
    },
    onSuccess: () => {
      invalidate();
      setDeletingId(null);
    },
    onError: () => setDeletingId(null),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  const handleDelete = (attachmentId: string) => {
    if (!window.confirm("Xóa file này?")) return;
    setDeletingId(attachmentId);
    deleteMutation.mutate(attachmentId);
  };

  if (isLoading) {
    return <div className={styles.loading}>Đang tải danh sách file...</div>;
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

  const files = data?.data ?? [];

  return (
    <section aria-labelledby="files-title">
      <div className={styles.header}>
        <div>
          <h3 id="files-title" className={styles.title}>Tệp đính kèm</h3>
          <p className={styles.subtitle}>Ảnh, PDF, Word, Excel · tối đa 10MB.</p>
        </div>
        <label className={styles.uploadButton}>
          {uploadMutation.isPending ? "Đang tải lên..." : "+ Tải file lên"}
          <input
            ref={fileInputRef}
            type="file"
            className={styles.fileInput}
            onChange={handleFileChange}
            disabled={uploadMutation.isPending}
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
          />
        </label>
      </div>

      {uploadMutation.isError && (
        <div className={styles.error} role="alert">
          {(uploadMutation.error as Error).message}
        </div>
      )}

      {files.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon} aria-hidden="true">📎</div>
          <p>Chưa có file đính kèm nào.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {files.map((file) => (
            <li key={file.id} className={styles.item}>
              <span className={styles.icon} aria-hidden="true">
                {fileIcon(file.mimeType)}
              </span>
              <div className={styles.info}>
                <a
                  href={`/api/companies/${companyId}/attachments/${file.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.fileName}
                >
                  {file.originalName}
                </a>
                <div className={styles.meta}>
                  <span>{humanFileSize(file.size)}</span>
                  <span>· {file.uploadedBy.name}</span>
                  <span>· {dateTimeFormatter.format(new Date(file.createdAt))}</span>
                </div>
              </div>
              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => handleDelete(file.id)}
                disabled={deletingId === file.id}
              >
                {deletingId === file.id ? "Đang xóa..." : "Xóa"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
