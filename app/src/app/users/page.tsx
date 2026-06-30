"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "@/lib/auth-client";
import { AppLayout } from "@/components/layout";
import { queryKeys } from "@/lib/query-keys";
import {
  userFormSchema,
  type UserFormData,
  type UserFormInput,
  type UserRole,
} from "@/lib/validation/user";
import styles from "./users.module.css";

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  _count: { assignedCompanies: number };
}

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Quản trị",
  USER: "ASM",
};

export default function UsersPage() {
  const { data: sessionData, isPending } = useSession();
  const user = sessionData?.user as { name?: string; role?: string } | undefined;
  const isAdmin = user?.role === "ADMIN";

  return (
    <AppLayout
      title="Người dùng"
      userName={user?.name || "User"}
      userRole={user?.role || "USER"}
    >
      {!isPending && !isAdmin ? (
        <div className={styles.accessDenied}>
          <div className={styles.deniedIcon} aria-hidden="true">🔒</div>
          <h2>Chỉ Admin được phép quản lý người dùng</h2>
          <p>Liên hệ quản trị viên nếu bạn cần quyền truy cập.</p>
        </div>
      ) : (
        <UsersAdmin />
      )}
    </AppLayout>
  );
}

function UsersAdmin() {
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession();
  const currentUserId = (sessionData?.user as { id?: string } | undefined)?.id;
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.users.manage,
    queryFn: async () => {
      const res = await fetch("/api/users?scope=all");
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Lỗi tải danh sách" }));
        throw new Error(body.error);
      }
      return res.json() as Promise<{ data: ManagedUser[] }>;
    },
  });

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.manage });
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
  };

  const createMutation = useMutation({
    mutationFn: async (formData: UserFormData) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Lỗi tạo người dùng" }));
        throw new Error(body.error);
      }
      return res.json() as Promise<{ data: ManagedUser }>;
    },
    onSuccess: () => {
      invalidateUsers();
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: { role?: UserRole; isActive?: boolean };
    }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Lỗi cập nhật" }));
        throw new Error(body.error);
      }
      return res.json() as Promise<{ data: ManagedUser }>;
    },
    onSuccess: invalidateUsers,
  });

  if (isLoading) {
    return <div className={styles.loading}>Đang tải danh sách người dùng...</div>;
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

  const users = data?.data ?? [];

  return (
    <section>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý người dùng</h1>
          <p className={styles.subtitle}>Tạo tài khoản, phân quyền và vô hiệu hóa.</p>
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => {
            createMutation.reset();
            setShowForm(true);
          }}
        >
          + Thêm người dùng
        </button>
      </div>

      {updateMutation.isError && (
        <div className={styles.error} role="alert">
          {(updateMutation.error as Error).message}
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>NPP phụ trách</th>
              <th>Ngày tạo</th>
              <th aria-label="Hành động" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              const busy = updateMutation.isPending;
              return (
                <tr key={u.id} className={u.isActive ? "" : styles.rowInactive}>
                  <td>
                    {u.name}
                    {isSelf && <span className={styles.selfTag}> (bạn)</span>}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        u.role === "ADMIN" ? styles.badgeAdmin : styles.badgeUser
                      }`}
                    >
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        u.isActive ? styles.badgeActive : styles.badgeDisabled
                      }`}
                    >
                      {u.isActive ? "Hoạt động" : "Vô hiệu"}
                    </span>
                  </td>
                  <td>{u._count.assignedCompanies}</td>
                  <td>{dateFormatter.format(new Date(u.createdAt))}</td>
                  <td className={styles.actionsCell}>
                    <button
                      type="button"
                      className={styles.linkButton}
                      disabled={busy || isSelf}
                      title={isSelf ? "Không thể tự đổi quyền" : undefined}
                      onClick={() =>
                        updateMutation.mutate({
                          id: u.id,
                          patch: { role: u.role === "ADMIN" ? "USER" : "ADMIN" },
                        })
                      }
                    >
                      {u.role === "ADMIN" ? "Hạ quyền ASM" : "Nâng quyền Admin"}
                    </button>
                    <button
                      type="button"
                      className={`${styles.linkButton} ${
                        u.isActive ? styles.linkDanger : ""
                      }`}
                      disabled={busy || isSelf}
                      title={isSelf ? "Không thể tự vô hiệu hóa" : undefined}
                      onClick={() =>
                        updateMutation.mutate({
                          id: u.id,
                          patch: { isActive: !u.isActive },
                        })
                      }
                    >
                      {u.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <UserFormModal
          isLoading={createMutation.isPending}
          error={createMutation.error instanceof Error ? createMutation.error : null}
          onSubmit={(formData) => createMutation.mutate(formData)}
          onClose={() => {
            if (!createMutation.isPending) setShowForm(false);
          }}
        />
      )}
    </section>
  );
}

function UserFormModal({
  isLoading,
  error,
  onSubmit,
  onClose,
}: {
  isLoading: boolean;
  error: Error | null;
  onSubmit: (formData: UserFormData) => void;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormInput, unknown, UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { name: "", email: "", password: "", role: "USER" },
  });

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 id="user-form-title" className={styles.modalTitle}>Thêm người dùng</h3>
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
          <div className={styles.field}>
            <label htmlFor="user-name">Họ tên</label>
            <input id="user-name" type="text" {...register("name")} />
            {errors.name && <span className={styles.fieldError}>{errors.name.message}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="user-email">Email</label>
            <input id="user-email" type="email" {...register("email")} />
            {errors.email && <span className={styles.fieldError}>{errors.email.message}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="user-password">Mật khẩu</label>
            <input id="user-password" type="password" {...register("password")} />
            {errors.password && (
              <span className={styles.fieldError}>{errors.password.message}</span>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="user-role">Vai trò</label>
            <select id="user-role" {...register("role")}>
              <option value="USER">ASM</option>
              <option value="ADMIN">Quản trị</option>
            </select>
            {errors.role && <span className={styles.fieldError}>{errors.role.message}</span>}
          </div>

          {error && <div className={styles.formError} role="alert">{error.message}</div>}

          <div className={styles.modalActions}>
            <button type="submit" className={styles.primaryButton} disabled={isLoading}>
              {isLoading ? "Đang tạo..." : "Tạo người dùng"}
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
