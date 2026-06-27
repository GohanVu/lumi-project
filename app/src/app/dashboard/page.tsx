"use client";

import { AppLayout } from "@/components/layout";

export default function DashboardPage() {
  return (
    <AppLayout title="Dashboard" userName="Admin" userRole="admin">
      <div>
        <h2>Chào mừng đến LUMI CRM</h2>
        <p>Hệ thống quản lý Nhà Phân Phối.</p>
      </div>
    </AppLayout>
  );
}
