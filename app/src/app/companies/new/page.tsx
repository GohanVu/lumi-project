"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { AppLayout } from "@/components/layout";
import { invalidateCompanyLists } from "@/lib/company-queries";
import { queryKeys } from "@/lib/query-keys";
import Link from "next/link";
import styles from "./new-company.module.css";

// Form schema
const companyFormSchema = z.object({
  name: z.string().min(1, "Tên NPP không được để trống").max(255),
  taxCode: z.string().max(20).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  province: z.string().max(100).optional().or(z.literal("")),
  district: z.string().max(100).optional().or(z.literal("")),
  ward: z.string().max(100).optional().or(z.literal("")),
  status: z.string().min(1),
  source: z.string().max(255).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  assignedToId: z.string().min(1, "Phải chọn ASM phụ trách"),
});

type CompanyFormData = z.infer<typeof companyFormSchema>;

// Duplicate check types
interface DuplicateInfo {
  field: string;
  company: { id: string; name: string };
}

export default function NewCompanyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession();
  const [serverError, setServerError] = useState("");
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);

  const user = sessionData?.user as {
    id: string;
    name: string;
    email: string;
    role?: string;
  } | undefined;
  const currentUserId = user?.id;
  const isAdmin = user?.role === "ADMIN";

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      status: "PROSPECT",
      assignedToId: "",
    },
  });

  // Session được tải bất đồng bộ; user thường luôn tự nhận NPP của mình.
  useEffect(() => {
    if (currentUserId && !isAdmin) {
      setValue("assignedToId", currentUserId, { shouldValidate: true });
    }
  }, [currentUserId, isAdmin, setValue]);

  // Chỉ Admin cần tải danh sách để chọn ASM khác.
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    isError: isUsersError,
  } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Lỗi tải danh sách users");
      return res.json() as Promise<{ data: { id: string; name: string; email: string; role: string }[] }>;
    },
    enabled: isAdmin,
  });

  // Check duplicate (debounced on blur)
  const checkDuplicate = useCallback(async (phone?: string, taxCode?: string) => {
    if (!phone && !taxCode) {
      setDuplicates([]);
      return;
    }
    const params = new URLSearchParams();
    if (phone) params.set("phone", phone);
    if (taxCode) params.set("taxCode", taxCode);

    try {
      const res = await fetch(`/api/companies/check-duplicate?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setDuplicates(result.duplicates || []);
      }
    } catch {
      // Silently fail duplicate check
    }
  }, []);

  // Watch phone and taxCode for duplicate check
  const watchedPhone = watch("phone");
  const watchedTaxCode = watch("taxCode");

  const handleBlurDuplicate = () => {
    checkDuplicate(watchedPhone || undefined, watchedTaxCode || undefined);
  };

  // Submit mutation
  const createMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Lỗi tạo NPP" }));
        throw new Error(err.error);
      }
      return res.json();
    },
    onSuccess: async () => {
      await invalidateCompanyLists(queryClient);
      router.push("/companies");
    },
    onError: (err: Error) => {
      setServerError(err.message);
    },
  });

  const onSubmit = (data: CompanyFormData) => {
    setServerError("");
    createMutation.mutate(data);
  };

  // Get duplicate warning for a specific field
  const getDuplicate = (field: string) =>
    duplicates.find((d) => d.field === field);

  const phoneDuplicate = getDuplicate("phone");
  const taxCodeDuplicate = getDuplicate("taxCode");

  return (
    <AppLayout
      title="Thêm NPP"
      userName={user?.name || "User"}
      userRole={(sessionData?.user as { role?: string })?.role || "USER"}
    >
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Thêm Nhà phân phối mới</h1>
        <p className={styles.pageDesc}>
          Nhập thông tin NPP. Hệ thống sẽ cảnh báo nếu SĐT hoặc MST đã tồn tại.
        </p>
      </div>

      <div className={styles.formCard}>
        {serverError && (
          <div className={styles.serverError}>{serverError}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Thông tin cơ bản */}
          <div className={styles.formSection}>
            <h3 className={styles.formSectionTitle}>Thông tin cơ bản</h3>
            <div className={styles.formGrid}>
              {/* Tên NPP */}
              <div className={`${styles.field} ${styles.formGridFull}`}>
                <label className={styles.label} htmlFor="name">
                  Tên NPP<span className={styles.required}>*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
                  placeholder="VD: Công ty TNHH ABC"
                  {...register("name")}
                />
                {errors.name && (
                  <span className={styles.errorMessage}>{errors.name.message}</span>
                )}
              </div>

              {/* MST */}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="taxCode">
                  Mã số thuế
                </label>
                <input
                  id="taxCode"
                  type="text"
                  className={`${styles.input} ${errors.taxCode || taxCodeDuplicate ? styles.inputError : ""}`}
                  placeholder="VD: 0123456789"
                  {...register("taxCode")}
                  onBlur={handleBlurDuplicate}
                />
                {errors.taxCode && (
                  <span className={styles.errorMessage}>{errors.taxCode.message}</span>
                )}
                {taxCodeDuplicate && (
                  <div className={styles.duplicateWarning}>
                    ⚠️ MST đã tồn tại:{" "}
                    <Link href={`/companies/${taxCodeDuplicate.company.id}`}>
                      {taxCodeDuplicate.company.name}
                    </Link>
                  </div>
                )}
              </div>

              {/* SĐT */}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="phone">
                  Số điện thoại
                </label>
                <input
                  id="phone"
                  type="text"
                  className={`${styles.input} ${errors.phone || phoneDuplicate ? styles.inputError : ""}`}
                  placeholder="VD: 0901234567"
                  {...register("phone")}
                  onBlur={handleBlurDuplicate}
                />
                {errors.phone && (
                  <span className={styles.errorMessage}>{errors.phone.message}</span>
                )}
                {phoneDuplicate && (
                  <div className={styles.duplicateWarning}>
                    ⚠️ SĐT đã tồn tại:{" "}
                    <Link href={`/companies/${phoneDuplicate.company.id}`}>
                      {phoneDuplicate.company.name}
                    </Link>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                  placeholder="VD: info@abc.vn"
                  {...register("email")}
                />
                {errors.email && (
                  <span className={styles.errorMessage}>{errors.email.message}</span>
                )}
              </div>

              {/* Nguồn */}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="source">
                  Nguồn giới thiệu
                </label>
                <input
                  id="source"
                  type="text"
                  className={styles.input}
                  placeholder="VD: Website, giới thiệu, triển lãm..."
                  {...register("source")}
                />
              </div>
            </div>
          </div>

          {/* Địa chỉ */}
          <div className={styles.formSection}>
            <h3 className={styles.formSectionTitle}>Địa chỉ</h3>
            <div className={styles.formGrid}>
              <div className={`${styles.field} ${styles.formGridFull}`}>
                <label className={styles.label} htmlFor="address">
                  Địa chỉ
                </label>
                <input
                  id="address"
                  type="text"
                  className={styles.input}
                  placeholder="Số nhà, đường..."
                  {...register("address")}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="province">
                  Tỉnh/Thành phố
                </label>
                <input
                  id="province"
                  type="text"
                  className={styles.input}
                  placeholder="VD: Hà Nội"
                  {...register("province")}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="district">
                  Quận/Huyện
                </label>
                <input
                  id="district"
                  type="text"
                  className={styles.input}
                  placeholder="VD: Cầu Giấy"
                  {...register("district")}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="ward">
                  Phường/Xã
                </label>
                <input
                  id="ward"
                  type="text"
                  className={styles.input}
                  placeholder="VD: Dịch Vọng"
                  {...register("ward")}
                />
              </div>
            </div>
          </div>

          {/* Phân loại & Ghi chú */}
          <div className={styles.formSection}>
            <h3 className={styles.formSectionTitle}>Phân loại & Phụ trách</h3>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="status">
                  Trạng thái
                </label>
                <select
                  id="status"
                  className={styles.select}
                  {...register("status")}
                >
                  <option value="PROSPECT">Tiềm năng</option>
                  <option value="CONTACTING">Đang liên hệ</option>
                  <option value="NEGOTIATING">Đàm phán</option>
                  <option value="ACTIVE">Hợp tác</option>
                  <option value="INACTIVE">Ngừng HT</option>
                  <option value="REJECTED">Từ chối</option>
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="assignedToId">
                  ASM phụ trách<span className={styles.required}>*</span>
                </label>
                {isAdmin ? (
                  <select
                    id="assignedToId"
                    className={`${styles.select} ${errors.assignedToId ? styles.inputError : ""}`}
                    disabled={isLoadingUsers}
                    {...register("assignedToId")}
                  >
                    <option value="">
                      {isLoadingUsers ? "Đang tải ASM..." : "— Chọn ASM —"}
                    </option>
                    {usersData?.data.map((assignee) => (
                      <option key={assignee.id} value={assignee.id}>
                        {assignee.name} ({assignee.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input type="hidden" {...register("assignedToId")} />
                    <select
                      id="assignedToId"
                      className={styles.select}
                      value={currentUserId || ""}
                      disabled
                      aria-label="ASM phụ trách"
                    >
                      <option value={currentUserId || ""}>
                        {user ? `${user.name} (${user.email})` : "Đang tải tài khoản..."}
                      </option>
                    </select>
                  </>
                )}
                {isAdmin && isUsersError && (
                  <span className={styles.errorMessage}>
                    Không tải được danh sách ASM. Vui lòng tải lại trang.
                  </span>
                )}
                {errors.assignedToId && (
                  <span className={styles.errorMessage}>{errors.assignedToId.message}</span>
                )}
              </div>

              <div className={`${styles.field} ${styles.formGridFull}`}>
                <label className={styles.label} htmlFor="notes">
                  Ghi chú
                </label>
                <textarea
                  id="notes"
                  className={styles.textarea}
                  placeholder="Ghi chú về NPP..."
                  {...register("notes")}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Đang tạo..." : "Tạo NPP"}
            </button>
            <Link href="/companies">
              <button type="button" className={styles.cancelButton}>
                Hủy
              </button>
            </Link>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
