"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { formatAuditLogChanges } from "@/lib/audit-logs";
import styles from "./AuditLogsTab.module.css";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  changes: string | null;
  userId: string;
  userName: string;
  createdAt: string;
}

interface AuditLogsTabProps {
  companyId: string;
}

export function AuditLogsTab({ companyId }: AuditLogsTabProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.companies.auditLogs(companyId),
    queryFn: async () => {
      const res = await fetch(`/api/companies/${companyId}/audit-logs`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Lỗi tải lịch sử" }));
        throw new Error(err.error);
      }
      return res.json() as Promise<{ data: AuditLog[] }>;
    },
    enabled: !!companyId,
  });

  const logs = data?.data ?? [];

  if (isLoading) {
    return <div className={styles.loading}>Đang tải lịch sử...</div>;
  }

  if (isError) {
    return (
      <div className={styles.error} role="alert">
        {(error as Error)?.message || "Không thể tải lịch sử thay đổi."}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Lịch sử hoạt động</h3>
      </div>

      {logs.length === 0 ? (
        <div className={styles.empty}>Chưa có lịch sử thay đổi nào cho NPP này.</div>
      ) : (
        <div className={styles.timeline}>
          {logs.map((log) => {
            const formattedTime = new Date(log.createdAt).toLocaleString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            // Action branding
            let actionLabel = log.action;
            let markerClass = styles.markerDefault;
            let badgeClass = styles.badgeDefault;
            let detailsClass = "";

            if (log.action === "SCORE") {
              actionLabel = "Chấm điểm";
              markerClass = styles.markerScore;
              badgeClass = styles.badgeScore;
              detailsClass = styles.detailsScore;
            } else if (log.action === "OVERRIDE") {
              actionLabel = "Ghi đè điểm";
              markerClass = styles.markerOverride;
              badgeClass = styles.badgeOverride;
              detailsClass = styles.detailsOverride;
            }

            return (
              <div key={log.id} className={styles.timelineItem}>
                <div className={`${styles.timelineMarker} ${markerClass}`} />
                <div className={styles.logCard}>
                  <div className={styles.logHeader}>
                    <div className={styles.logTitle}>
                      <span className={`${styles.actionBadge} ${badgeClass}`}>
                        {actionLabel}
                      </span>
                    </div>
                    <span className={styles.logTime}>{formattedTime}</span>
                  </div>

                  <div className={`${styles.logDetails} ${detailsClass}`}>
                    {formatAuditLogChanges(log.action, log.changes)}
                  </div>

                  <div className={styles.logUser}>
                    👤 Thực hiện bởi: <strong>{log.userName}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
