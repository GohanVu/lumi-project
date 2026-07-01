"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { AppLayout } from "@/components/layout";
import { queryKeys } from "@/lib/query-keys";
import Link from "next/link";
import styles from "./tasks.module.css";

interface TaskUser {
  id: string;
  name: string;
}

interface TaskCompany {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  company: TaskCompany;
  assignedTo: TaskUser;
}

const STATUS_MAP = {
  TODO: { label: "Cần làm", className: styles.statusTODO },
  IN_PROGRESS: { label: "Đang làm", className: styles.statusIN_PROGRESS },
  DONE: { label: "Hoàn thành", className: styles.statusDONE },
  CANCELLED: { label: "Huỷ", className: styles.statusCANCELLED },
};

const PRIORITY_MAP = {
  LOW: { label: "Thấp", className: styles.priorityLOW },
  MEDIUM: { label: "Trung bình", className: styles.priorityMEDIUM },
  HIGH: { label: "Cao", className: styles.priorityHIGH },
  URGENT: { label: "Khẩn cấp", className: styles.priorityURGENT },
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function isOverdue(dueDate: string, status: string): boolean {
  if (status === "DONE" || status === "CANCELLED") return false;
  return new Date(dueDate) < new Date();
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession();
  const user = sessionData?.user as { name?: string; role?: string } | undefined;
  const isAdmin = user?.role === "ADMIN";

  // Filter states
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");

  // Debounced search term
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch Tasks
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.tasks.list({ page, limit: 20, search: debouncedSearch, status, priority, companyId, assignedToId }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (status) params.append("status", status);
      if (priority) params.append("priority", priority);
      if (companyId) params.append("companyId", companyId);
      if (isAdmin && assignedToId) params.append("assignedToId", assignedToId);

      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Lỗi tải nhiệm vụ" }));
        throw new Error(err.error);
      }
      return res.json() as Promise<{
        data: Task[];
        pagination: { total: number; totalPages: number };
      }>;
    },
    enabled: !!user,
  });

  // Fetch Companies for filter dropdown
  const { data: companiesData } = useQuery({
    queryKey: queryKeys.companies.lists,
    queryFn: async () => {
      const res = await fetch("/api/companies?limit=100");
      if (!res.ok) throw new Error("Lỗi tải NPP");
      return res.json() as Promise<{ data: { id: string; name: string }[] }>;
    },
    enabled: !!user,
  });

  // Fetch Users/ASMs for filter dropdown (Admin only)
  const { data: usersData } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Lỗi tải danh sách người dùng");
      return res.json() as Promise<{ data: { id: string; name: string; role: string }[] }>;
    },
    enabled: !!user && isAdmin,
  });

  // Toggle status mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: string }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Lỗi cập nhật trạng thái" }));
        throw new Error(err.error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });

  const handleStatusToggle = (task: Task) => {
    const nextStatus = task.status === "DONE" ? "TODO" : "DONE";
    toggleMutation.mutate({ id: task.id, nextStatus });
  };

  const tasks = data?.data ?? [];
  const pagination = data?.pagination;
  const companies = companiesData?.data ?? [];
  const asms = (usersData?.data ?? []).filter((u) => u.role !== "ADMIN");

  return (
    <AppLayout
      title="Nhiệm vụ"
      userName={user?.name || "User"}
      userRole={user?.role || "USER"}
    >
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Nhiệm vụ được giao</h1>
      </div>

      {/* Filters bar */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Tìm kiếm tiêu đề, mô tả..."
          className={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Status Filter */}
        <select
          className={styles.filterSelect}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="TODO">Cần làm</option>
          <option value="IN_PROGRESS">Đang làm</option>
          <option value="DONE">Hoàn thành</option>
          <option value="CANCELLED">Đã huỷ</option>
        </select>

        {/* Priority Filter */}
        <select
          className={styles.filterSelect}
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả độ ưu tiên</option>
          <option value="LOW">Ưu tiên Thấp</option>
          <option value="MEDIUM">Ưu tiên Trung bình</option>
          <option value="HIGH">Ưu tiên Cao</option>
          <option value="URGENT">Ưu tiên Khẩn cấp</option>
        </select>

        {/* Company Filter */}
        <select
          className={styles.filterSelect}
          value={companyId}
          onChange={(e) => {
            setCompanyId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả NPP</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* ASM Filter (Admin Only) */}
        {isAdmin && (
          <select
            className={styles.filterSelect}
            value={assignedToId}
            onChange={(e) => {
              setAssignedToId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả ASM phụ trách</option>
            {asms.map((asm) => (
              <option key={asm.id} value={asm.id}>
                {asm.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Main content table */}
      {isLoading ? (
        <div className={styles.loading}>Đang tải danh sách nhiệm vụ...</div>
      ) : isError ? (
        <div className={styles.error} role="alert">
          <p>{error?.message || "Không thể tải danh sách nhiệm vụ."}</p>
          <button className={styles.retryButton} onClick={() => refetch()}>
            Thử lại
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✅</div>
          <h3 className={styles.emptyTitle}>Tuyệt vời, không có nhiệm vụ nào!</h3>
          <p className={styles.emptyDesc}>Hãy tận hưởng hoặc tạo thêm nhiệm vụ tại trang chi tiết Nhà phân phối.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: "40px" }} aria-label="Hoàn thành"></th>
                <th>Tiêu đề & Mô tả</th>
                <th>Nhà phân phối</th>
                {isAdmin && <th>ASM phụ trách</th>}
                <th>Hạn chót</th>
                <th>Độ ưu tiên</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const isCompleted = task.status === "DONE";
                const isCancelled = task.status === "CANCELLED";
                const overdue = task.dueDate ? isOverdue(task.dueDate, task.status) : false;
                const statusInfo = STATUS_MAP[task.status] || { label: task.status, className: "" };
                const priorityInfo = PRIORITY_MAP[task.priority] || { label: task.priority, className: "" };

                return (
                  <tr
                    key={task.id}
                    className={isCompleted ? styles.completedRow : ""}
                  >
                    <td className={styles.checkboxCell}>
                      <input
                        type="checkbox"
                        className={styles.checkboxInput}
                        checked={isCompleted}
                        disabled={isCancelled || toggleMutation.isPending}
                        onChange={() => handleStatusToggle(task)}
                        aria-label="Đánh dấu hoàn thành"
                      />
                    </td>
                    <td>
                      <div className={isCompleted ? styles.completedTitle : ""}>
                        <strong>{task.title}</strong>
                      </div>
                      {task.description && (
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                          {task.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/companies/${task.company.id}`}
                        className={styles.companyLink}
                      >
                        {task.company.name}
                      </Link>
                    </td>
                    {isAdmin && (
                      <td>
                        <strong>{task.assignedTo.name}</strong>
                      </td>
                    )}
                    <td>
                      {task.dueDate ? (
                        <span className={overdue ? styles.overdueText : styles.normalDate}>
                          {overdue ? "⚠ Quá hạn: " : "📅 "}
                          {dateFormatter.format(new Date(task.dueDate))}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span className={`${styles.priorityBadge} ${priorityInfo.className}`}>
                        {priorityInfo.label}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <span className={styles.paginationInfo}>
                Trang {page} / {pagination.totalPages} (Tổng số {pagination.total} nhiệm vụ)
              </span>
              <div className={styles.paginationButtons}>
                <button
                  className={styles.paginationBtn}
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                >
                  Trước
                </button>
                <button
                  className={styles.paginationBtn}
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
