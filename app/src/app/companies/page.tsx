"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { AppLayout } from "@/components/layout";
import { companyQueryKeys } from "@/lib/company-queries";
import Link from "next/link";
import styles from "./companies.module.css";

// Types
interface Company {
  id: string;
  name: string;
  taxCode: string | null;
  phone: string | null;
  email: string | null;
  province: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  assignedTo: {
    id: string;
    name: string;
  };
  _count: {
    contacts: number;
    interactions: number;
  };
}

interface CompaniesResponse {
  data: Company[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Status labels & colors
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PROSPECT: { label: "Tiềm năng", className: styles.statusProspect },
  CONTACTING: { label: "Đang liên hệ", className: styles.statusContacting },
  NEGOTIATING: { label: "Đàm phán", className: styles.statusNegotiating },
  ACTIVE: { label: "Hợp tác", className: styles.statusActive },
  INACTIVE: { label: "Ngừng HT", className: styles.statusInactive },
  REJECTED: { label: "Từ chối", className: styles.statusRejected },
};

// Fetch function
async function fetchCompanies(params: {
  page: number;
  limit: number;
  search: string;
  status: string;
}): Promise<CompaniesResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("page", params.page.toString());
  searchParams.set("limit", params.limit.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status", params.status);

  const res = await fetch(`/api/companies?${searchParams.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Lỗi không xác định" }));
    throw new Error(err.error || "Lỗi tải danh sách NPP");
  }
  return res.json();
}

export default function CompaniesPage() {
  const { data: sessionData } = useSession();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: companyQueryKeys.list({ page, search, status: statusFilter }),
    queryFn: () =>
      fetchCompanies({ page, limit: 20, search, status: statusFilter }),
  });

  // Debounce search on Enter
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setSearch(searchInput);
      setPage(1);
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  return (
    <AppLayout
      title="Nhà phân phối"
      userName={sessionData?.user?.name || "User"}
      userRole={(sessionData?.user as { role?: string })?.role || "USER"}
    >
      {/* Page header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Danh sách NPP</h1>
        <Link href="/companies/new">
          <button className={styles.addButton} type="button">
            <span>+</span> Thêm NPP
          </button>
        </Link>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Tìm theo tên, MST, SĐT... (Enter để tìm)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          aria-label="Tìm kiếm NPP"
        />
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={handleStatusChange}
          aria-label="Lọc theo trạng thái"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="PROSPECT">Tiềm năng</option>
          <option value="CONTACTING">Đang liên hệ</option>
          <option value="NEGOTIATING">Đàm phán</option>
          <option value="ACTIVE">Hợp tác</option>
          <option value="INACTIVE">Ngừng HT</option>
          <option value="REJECTED">Từ chối</option>
        </select>
      </div>

      {/* Content */}
      {isLoading && (
        <div className={styles.loading}>Đang tải dữ liệu...</div>
      )}

      {isError && (
        <div className={styles.error}>
          <p>{(error as Error).message || "Có lỗi xảy ra"}</p>
          <button className={styles.retryButton} onClick={() => refetch()}>
            Thử lại
          </button>
        </div>
      )}

      {data && data.data.length === 0 && (
        <div className={styles.tableWrapper}>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🏢</div>
            <div className={styles.emptyTitle}>Chưa có NPP nào</div>
            <div className={styles.emptyDesc}>
              {search || statusFilter
                ? "Không tìm thấy NPP phù hợp với bộ lọc."
                : "Bắt đầu bằng cách thêm NPP đầu tiên."}
            </div>
          </div>
        </div>
      )}

      {data && data.data.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tên NPP</th>
                <th>MST</th>
                <th>SĐT</th>
                <th>Tỉnh/TP</th>
                <th>Trạng thái</th>
                <th>ASM</th>
                <th>Liên hệ</th>
                <th>Tương tác</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((company) => {
                const statusInfo = STATUS_MAP[company.status] || {
                  label: company.status,
                  className: "",
                };
                return (
                  <tr key={company.id}>
                    <td>
                      <Link
                        href={`/companies/${company.id}`}
                        className={styles.companyName}
                      >
                        {company.name}
                      </Link>
                    </td>
                    <td>{company.taxCode || "—"}</td>
                    <td>{company.phone || "—"}</td>
                    <td>{company.province || "—"}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className={styles.assignedUser}>
                      {company.assignedTo.name}
                    </td>
                    <td className={styles.metaCount}>
                      {company._count.contacts}
                    </td>
                    <td className={styles.metaCount}>
                      {company._count.interactions}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Hiển thị {(data.pagination.page - 1) * data.pagination.limit + 1}–
              {Math.min(
                data.pagination.page * data.pagination.limit,
                data.pagination.total
              )}{" "}
              / {data.pagination.total} NPP
            </div>
            <div className={styles.paginationButtons}>
              <button
                className={styles.paginationBtn}
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Trước
              </button>
              <button
                className={styles.paginationBtn}
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau →
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
