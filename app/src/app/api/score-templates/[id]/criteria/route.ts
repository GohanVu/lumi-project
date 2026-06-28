import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { createCriteriaSchema } from "@/lib/validation/score-template";

/**
 * POST /api/score-templates/[id]/criteria — Thêm tiêu chí vào mẫu (chỉ DRAFT).
 * Admin only.
 */
export async function POST(
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
  const template = await prisma.scoreTemplate.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!template) {
    return NextResponse.json(
      { error: "Không tìm thấy mẫu chấm điểm", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (template.status !== "DRAFT") {
    return NextResponse.json(
      {
        error: "Chỉ được thêm tiêu chí khi mẫu ở trạng thái Nháp.",
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

  const result = createCriteriaSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error.errors[0]?.message ?? "Dữ liệu không hợp lệ",
        code: "VALIDATION_ERROR",
      },
      { status: 422 }
    );
  }

  // sortOrder mặc định = max hiện tại + 1
  const last = await prisma.scoreCriteria.findFirst({
    where: { templateId: id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const nextSortOrder = (last?.sortOrder ?? -1) + 1;

  const criteria = await prisma.scoreCriteria.create({
    data: {
      templateId: id,
      name: result.data.name,
      description: result.data.description ?? null,
      maxScore: result.data.maxScore,
      weight: result.data.weight,
      sortOrder: nextSortOrder,
    },
    select: {
      id: true,
      name: true,
      description: true,
      maxScore: true,
      weight: true,
      sortOrder: true,
    },
  });

  return NextResponse.json({ data: criteria }, { status: 201 });
}
