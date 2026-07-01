import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { createTemplateSchema } from "@/lib/validation/score-template";

/**
 * GET /api/score-templates — Danh sách mẫu chấm điểm (Admin only).
 */
export async function GET() {
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

  const templates = await prisma.scoreTemplate.findMany({
    orderBy: [{ createdAt: "desc" }],
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
      _count: {
        select: { criteria: true, results: true },
      },
    },
  });

  return NextResponse.json({ data: templates });
}

/**
 * POST /api/score-templates — Tạo mẫu chấm điểm mới (DRAFT). Admin only.
 */
export async function POST(request: NextRequest) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body không hợp lệ", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const result = createTemplateSchema.safeParse(body);
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
  const template = await prisma.scoreTemplate.create({
    data: {
      name: result.data.name,
      description: result.data.description ?? null,
      gradeAMin: result.data.gradeAMin,
      gradeBMin: result.data.gradeBMin,
      createdById: user.id,
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

  return NextResponse.json({ data: template }, { status: 201 });
}
