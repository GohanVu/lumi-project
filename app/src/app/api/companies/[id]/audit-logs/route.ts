import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

/**
 * GET /api/companies/[id]/audit-logs — Danh sách lịch sử thay đổi của một NPP
 * Admin xem tất cả; User (ASM) chỉ xem NPP được phân công cho mình.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json(
      { error: "Chưa đăng nhập", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const user = session.user as { id: string; role: string };

  const company = await prisma.company.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(user.role !== "ADMIN" ? { assignedToId: user.id } : {}),
    },
    select: { id: true },
  });

  if (!company) {
    return NextResponse.json(
      { error: "Không tìm thấy NPP hoặc không có quyền truy cập", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const logs = await prisma.auditLog.findMany({
    where: { companyId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      action: true,
      entity: true,
      entityId: true,
      changes: true,
      userId: true,
      userName: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: logs });
}
