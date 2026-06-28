import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { updateTemplateSchema } from "@/lib/validation/score-template";

/**
 * GET /api/score-templates/[id] — Chi tiết mẫu kèm tiêu chí. Admin only.
 */
export async function GET(
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
  const template = await prisma.scoreTemplate.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      version: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { results: true } },
      criteria: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          maxScore: true,
          weight: true,
          sortOrder: true,
        },
      },
    },
  });

  if (!template) {
    return NextResponse.json(
      { error: "Không tìm thấy mẫu chấm điểm", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: template });
}

/**
 * PUT /api/score-templates/[id] — Sửa mẫu (chỉ khi DRAFT). Admin only.
 */
export async function PUT(
  request: NextRequest,
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

  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      {
        error: "Chỉ được sửa mẫu ở trạng thái Nháp. Hãy nhân bản để tạo phiên bản mới.",
        code: "TEMPLATE_LOCKED",
      },
      { status: 409 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body không hợp lệ", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const result = updateTemplateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error.errors[0]?.message ?? "Dữ liệu không hợp lệ",
        code: "VALIDATION_ERROR",
      },
      { status: 422 }
    );
  }

  const user = session.user as { id: string };
  const { name, description } = result.data;

  const updated = await prisma.scoreTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      updatedBy: user.id,
    },
    select: {
      id: true,
      name: true,
      description: true,
      version: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ data: updated });
}

/**
 * DELETE /api/score-templates/[id] — Xóa mẫu (chỉ DRAFT chưa phát sinh kết quả).
 * Admin only. Mẫu đã có kết quả không được xóa cứng (spec 7.7).
 */
export async function DELETE(
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
    select: {
      id: true,
      status: true,
      _count: { select: { results: true } },
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Không tìm thấy mẫu chấm điểm", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (existing.status !== "DRAFT" || existing._count.results > 0) {
    return NextResponse.json(
      {
        error: "Không thể xóa mẫu đã ban hành hoặc đã phát sinh kết quả chấm điểm.",
        code: "TEMPLATE_HAS_RESULTS",
      },
      { status: 409 }
    );
  }

  // DRAFT chưa có kết quả: xóa cứng kèm criteria (cascade onDelete)
  await prisma.scoreTemplate.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
