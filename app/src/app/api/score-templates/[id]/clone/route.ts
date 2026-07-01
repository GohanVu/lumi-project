import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";

/**
 * POST /api/score-templates/[id]/clone — Nhân bản thành phiên bản mới (DRAFT).
 * Sao chép toàn bộ tiêu chí; version = max version cùng tên + 1. Admin only. (spec 7.7)
 * Dùng để chỉnh sửa mẫu đã ban hành mà không động vào lịch sử đã chấm.
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
  const source = await prisma.scoreTemplate.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      version: true,
      gradeAMin: true,
      gradeBMin: true,
      criteria: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          name: true,
          description: true,
          maxScore: true,
          weight: true,
          sortOrder: true,
        },
      },
    },
  });

  if (!source) {
    return NextResponse.json(
      { error: "Không tìm thấy mẫu chấm điểm", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const user = session.user as { id: string };

  // version mới = version cao nhất trong các mẫu cùng tên + 1
  const latest = await prisma.scoreTemplate.findFirst({
    where: { name: source.name },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (latest?.version ?? source.version) + 1;

  const clone = await prisma.scoreTemplate.create({
    data: {
      name: source.name,
      description: source.description,
      version: nextVersion,
      status: "DRAFT",
      gradeAMin: source.gradeAMin,
      gradeBMin: source.gradeBMin,
      createdById: user.id,
      criteria: {
        create: source.criteria.map((c) => ({
          name: c.name,
          description: c.description,
          maxScore: c.maxScore,
          weight: c.weight,
          sortOrder: c.sortOrder,
        })),
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      version: true,
      status: true,
      gradeAMin: true,
      gradeBMin: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { criteria: true, results: true } },
    },
  });

  return NextResponse.json({ data: clone }, { status: 201 });
}
