"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { AppLayout } from "@/components/layout";
import styles from "./dashboard.module.css";

const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

type CompanyStatus =
  | "PROSPECT"
  | "CONTACTING"
  | "NEGOTIATING"
  | "ACTIVE"
  | "INACTIVE"
  | "REJECTED";

type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type InteractionType = "CALL" | "VISIT" | "EMAIL" | "MEETING" | "ZALO" | "OTHER";

interface DashboardData {
  totalCompanies: number;
  companiesByStatus: { status: CompanyStatus; count: number }[];
  taskStats: { todo: number; inProgress: number; done: number };
  overdueTasks: {
    id: string;
    title: string;
    priority: TaskPriority;
    status: string;
    dueDate: string | null;
    company: { id: string; name: string };
  }[];
  todayFollowUps: {
    id: string;
    type: InteractionType;
    content: string;
    followUpAt: string | null;
    contactName: string | null;
    company: { id: string; name: string };
  }[];
}

const STATUS_LABEL: Record<CompanyStatus, string> = {
  PROSPECT: "Tiềm năng",
  CONTACTING: "Đang liên hệ",
  NEGOTIATING: "Đàm phán",
  ACTIVE: "Hợp tác",
  INACTIVE: "Ngừng HT",
  REJECTED: "Từ chối",
};

const PRIORITY_MAP: Record<TaskPriority, { label: string; className: string }> = {
  LOW: { label: "Thấp", className: styles.priorityLow },
  MEDIUM: { label: "TB", className: styles.priorityMedium },
  HIGH: { label: "Cao", className: styles.priorityHigh },
  URGENT: { label: "Khẩn", className: styles.priorityUrgent },
};

const TYPE_LABEL: Record<InteractionType, string> = {
  CALL: "Gọi điện",
  VISIT: "Ghé thăm",
  EMAIL: "Email",
  MEETING: "Họp",
  ZALO: "Zalo",
  OTHER: "Khác",
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VIETNAM_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VIETNAM_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

export default function DashboardPage() {
  const { data: sessionData } = useSession();
  const user = sessionData?.user as { name?: string; role?: string } | undefined;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ error: "Lỗi tải dữ liệu dashboard" }));
        throw new Error(body.error);
      }
      return res.json() as Promise<{ data: DashboardData }>;
    },
  });

  const stats = data?.data;

  return (
    <AppLayout
      title="Dashboard"
      userName={user?.name || "User"}
      userRole={user?.role || "USER"}
    >
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Tổng quan</h1>
        <p className={styles.pageSubtitle}>
          {user?.role === "ADMIN"
            ? "Toàn bộ hệ thống NPP"
            : "NPP được phân công cho bạn"}
        </p>
      </div>

      {isLoading && <div className={styles.loading}>Đang tải dữ liệu...</div>}

      {isError && (
        <div className={styles.error} role="alert">
          <span>{(error as Error).message}</span>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => refetch()}
          >
            Thử lại
          </button>
        </div>
      )}

      {stats && (
        <>
          {/* KPI cards */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Tổng số NPP</div>
              <div className={styles.kpiValue}>{stats.totalCompanies}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Task quá hạn</div>
              <div className={`${styles.kpiValue} ${styles.kpiValueDanger}`}>
                {stats.overdueTasks.length}
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Follow-up hôm nay</div>
              <div className={`${styles.kpiValue} ${styles.kpiValueWarning}`}>
                {stats.todayFollowUps.length}
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Task đang thực hiện</div>
              <div className={styles.kpiValue}>
                {stats.taskStats.todo + stats.taskStats.inProgress}
              </div>
            </div>
          </div>

          {/* Status distribution */}
          <section className={styles.statusSection}>
            <h2 className={styles.sectionTitle}>NPP theo trạng thái</h2>
            <div className={styles.statusGrid}>
              {stats.companiesByStatus.map((item) => (
                <div key={item.status} className={styles.statusItem}>
                  <span className={styles.statusLabel}>
                    {STATUS_LABEL[item.status]}
                  </span>
                  <span className={styles.statusCount}>{item.count}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Two columns: overdue tasks + today follow-ups */}
          <div className={styles.columns}>
            {/* Overdue tasks */}
            <section className={styles.panel} aria-labelledby="overdue-title">
              <div className={styles.panelHeader}>
                <h2 id="overdue-title" className={styles.panelTitle}>
                  Task quá hạn
                </h2>
                <span
                  className={`${styles.panelBadge} ${
                    stats.overdueTasks.length > 0 ? styles.panelBadgeDanger : ""
                  }`}
                >
                  {stats.overdueTasks.length}
                </span>
              </div>
              {stats.overdueTasks.length === 0 ? (
                <div className={styles.empty}>Không có task nào quá hạn 🎉</div>
              ) : (
                <ul className={styles.list}>
                  {stats.overdueTasks.map((task) => {
                    const priority = PRIORITY_MAP[task.priority];
                    return (
                      <li key={task.id}>
                        <Link
                          href={`/companies/${task.company.id}`}
                          className={styles.listItem}
                        >
                          <div className={styles.itemTop}>
                            <span className={styles.itemTitle}>{task.title}</span>
                            <span
                              className={`${styles.priorityBadge} ${priority.className}`}
                            >
                              {priority.label}
                            </span>
                          </div>
                          <div className={styles.itemMeta}>
                            <span className={styles.itemCompany}>
                              {task.company.name}
                            </span>
                            {task.dueDate && (
                              <span className={styles.dueDanger}>
                                ⚠ {dateFormatter.format(new Date(task.dueDate))}
                              </span>
                            )}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Today follow-ups */}
            <section className={styles.panel} aria-labelledby="followup-title">
              <div className={styles.panelHeader}>
                <h2 id="followup-title" className={styles.panelTitle}>
                  Follow-up hôm nay
                </h2>
                <span className={styles.panelBadge}>
                  {stats.todayFollowUps.length}
                </span>
              </div>
              {stats.todayFollowUps.length === 0 ? (
                <div className={styles.empty}>Không có follow-up nào hôm nay</div>
              ) : (
                <ul className={styles.list}>
                  {stats.todayFollowUps.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/companies/${item.company.id}`}
                        className={styles.listItem}
                      >
                        <div className={styles.itemTop}>
                          <span className={styles.itemTitle}>
                            {item.content}
                          </span>
                          <span className={styles.typeBadge}>
                            {TYPE_LABEL[item.type]}
                          </span>
                        </div>
                        <div className={styles.itemMeta}>
                          <span className={styles.itemCompany}>
                            {item.company.name}
                          </span>
                          {item.followUpAt && (
                            <span>
                              🕐 {timeFormatter.format(new Date(item.followUpAt))}
                            </span>
                          )}
                          {item.contactName && <span>· {item.contactName}</span>}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </AppLayout>
  );
}
