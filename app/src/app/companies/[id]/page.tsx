"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { AppLayout } from "@/components/layout";
import Link from "next/link";
import { ContactsTab } from "@/components/companies/ContactsTab";
import { TimelineTab } from "@/components/companies/TimelineTab";
import { TasksTab } from "@/components/companies/TasksTab";
import { ScoresTab } from "@/components/companies/ScoresTab";
import { FilesTab } from "@/components/companies/FilesTab";
import { AuditLogsTab } from "@/components/companies/AuditLogsTab";
import { queryKeys } from "@/lib/query-keys";
import styles from "./company-detail.module.css";

// Types
interface CompanyDetail {
  id: string;
  name: string;
  taxCode: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  ward: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    contacts: number;
    interactions: number;
    tasks: number;
    scoreResults: number;
    attachments: number;
  };
}

// Status display
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PROSPECT: { label: "Tiềm năng", className: styles.statusProspect },
  CONTACTING: { label: "Đang liên hệ", className: styles.statusContacting },
  NEGOTIATING: { label: "Đàm phán", className: styles.statusNegotiating },
  ACTIVE: { label: "Hợp tác", className: styles.statusActive },
  INACTIVE: { label: "Ngừng HT", className: styles.statusInactive },
  REJECTED: { label: "Từ chối", className: styles.statusRejected },
};

// Tab definitions
const TABS = [
  { key: "overview", label: "Tổng quan", icon: "📋" },
  { key: "contacts", label: "Liên hệ", icon: "👤", countKey: "contacts" },
  { key: "timeline", label: "Timeline", icon: "📅", countKey: "interactions" },
  { key: "tasks", label: "Nhiệm vụ", icon: "✅", countKey: "tasks" },
  { key: "scores", label: "Chấm điểm", icon: "⭐", countKey: "scoreResults" },
  { key: "files", label: "Tệp", icon: "📎", countKey: "attachments" },
  { key: "logs", label: "Lịch sử", icon: "🕐" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: sessionData } = useSession();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.companies.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/companies/${id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Lỗi tải thông tin NPP" }));
        throw new Error(err.error);
      }
      return res.json() as Promise<{ data: CompanyDetail }>;
    },
    enabled: !!id,
  });

  const company = data?.data;
  const user = sessionData?.user as { name?: string; role?: string } | undefined;

  if (isLoading) {
    return (
      <AppLayout title="NPP" userName={user?.name || "User"} userRole={user?.role || "USER"}>
        <div className={styles.loading}>Đang tải...</div>
      </AppLayout>
    );
  }

  if (isError || !company) {
    return (
      <AppLayout title="NPP" userName={user?.name || "User"} userRole={user?.role || "USER"}>
        <div className={styles.error}>
          {(error as Error)?.message || "Không tìm thấy NPP"}
        </div>
      </AppLayout>
    );
  }

  const statusInfo = STATUS_MAP[company.status] || { label: company.status, className: "" };

  return (
    <AppLayout
      title={company.name}
      userName={user?.name || "User"}
      userRole={user?.role || "USER"}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.companyName}>{company.name}</h1>
          <div className={styles.companyMeta}>
            <span className={`${styles.statusBadge} ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
            {company.taxCode && <span>MST: {company.taxCode}</span>}
            {company.phone && <span>📞 {company.phone}</span>}
            <span>ASM: {company.assignedTo.name}</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Link href="/companies" className={styles.backLink}>
            ← Danh sách
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs} role="tablist">
        {TABS.map((tab) => {
          const count = "countKey" in tab
            ? company._count[tab.countKey as keyof typeof company._count]
            : undefined;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {count !== undefined && (
                <span className={styles.tabCount}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className={styles.tabContent}>
        {activeTab === "overview" && <OverviewTab company={company} />}
        {activeTab === "contacts" && (
          <ContactsTab companyId={company.id} />
        )}
        {activeTab === "timeline" && (
          <TimelineTab companyId={company.id} />
        )}
        {activeTab === "tasks" && (
          <TasksTab companyId={company.id} />
        )}
        {activeTab === "scores" && (
          <ScoresTab companyId={company.id} canOverride={user?.role === "ADMIN"} />
        )}
        {activeTab === "files" && (
          <FilesTab companyId={company.id} />
        )}
        {activeTab === "logs" && (
          <AuditLogsTab companyId={company.id} />
        )}
      </div>
    </AppLayout>
  );
}

// Overview Tab component
function OverviewTab({ company }: { company: CompanyDetail }) {
  return (
    <div className={styles.overviewGrid}>
      {/* Thông tin cơ bản */}
      <div className={styles.infoCard}>
        <h3 className={styles.infoCardTitle}>Thông tin cơ bản</h3>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Tên NPP</span>
          <span className={styles.infoValue}>{company.name}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>MST</span>
          <span className={styles.infoValue}>{company.taxCode || "—"}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>SĐT</span>
          <span className={styles.infoValue}>{company.phone || "—"}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Email</span>
          <span className={styles.infoValue}>{company.email || "—"}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Nguồn</span>
          <span className={styles.infoValue}>{company.source || "—"}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Trạng thái</span>
          <span className={styles.infoValue}>
            {STATUS_MAP[company.status]?.label || company.status}
          </span>
        </div>
      </div>

      {/* Địa chỉ */}
      <div className={styles.infoCard}>
        <h3 className={styles.infoCardTitle}>Địa chỉ & Phụ trách</h3>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Địa chỉ</span>
          <span className={styles.infoValue}>{company.address || "—"}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Phường/Xã</span>
          <span className={styles.infoValue}>{company.ward || "—"}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Quận/Huyện</span>
          <span className={styles.infoValue}>{company.district || "—"}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Tỉnh/TP</span>
          <span className={styles.infoValue}>{company.province || "—"}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>ASM phụ trách</span>
          <span className={styles.infoValue}>{company.assignedTo.name}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Ngày tạo</span>
          <span className={styles.infoValue}>
            {new Date(company.createdAt).toLocaleDateString("vi-VN")}
          </span>
        </div>
      </div>

      {/* Ghi chú */}
      {company.notes && (
        <div className={styles.infoCard} style={{ gridColumn: "1 / -1" }}>
          <h3 className={styles.infoCardTitle}>Ghi chú</h3>
          <p className={styles.infoValue}>{company.notes}</p>
        </div>
      )}
    </div>
  );
}

// Placeholder for tabs not yet implemented
function PlaceholderTab({ icon, label }: { icon: string; label: string }) {
  return (
    <div className={styles.placeholder}>
      <div className={styles.placeholderIcon}>{icon}</div>
      <p>{label}</p>
    </div>
  );
}
