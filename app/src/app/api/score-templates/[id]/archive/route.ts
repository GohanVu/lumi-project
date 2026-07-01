import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

/**
 * POST /api/score-templates/[id]/archive — Ngừng áp dụng (PUBLISHED → ARCHIVED).
 * Không xóa cứng mẫu đã phát sinh kết quả, chỉ lưu trữ. Admin only. (spec 7.7)
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, isAdmin } = await requireAdmin();
  if (!session) {
    return NextResponse.json(
      { error: "Chưa đăng nhập", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Chỉ Admin được phép", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const existing = await prisma.scoreTemplate.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Không tìm thấy mẫu chấm điểm", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (existing.status !== "PUBLISHED") {
    return NextResponse.json(
      { error: "Chỉ lưu trữ được mẫu đang ban hành.", code: "INVALID_STATE" },
      { status: 409 }
    );
  }

  const user = session.user as { id: string };
  const updatedResult = await prisma.scoreTemplate.updateMany({
    where: { id, status: "PUBLISHED" },
    data: { status: "ARCHIVED", updatedBy: user.id },
  });

  if (updatedResult.count === 0) {
    const temp = await prisma.scoreTemplate.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!temp) {
      return NextResponse.json(
        { error: "Không tìm thấy mẫu chấm điểm", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Chỉ lưu trữ được mẫu đang ban hành.", code: "INVALID_STATE" },
      { status: 409 }
    );
  }

  const updated = await prisma.scoreTemplate.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      version: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { criteria: true, results: true } },
    },
  });

  return NextResponse.json({ data: updated });
}
