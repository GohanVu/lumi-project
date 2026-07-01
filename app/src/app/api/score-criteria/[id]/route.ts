import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { updateCriteriaSchema } from "@/lib/validation/score-template";

/**
 * PUT /api/score-criteria/[id] — Sửa tiêu chí (chỉ khi mẫu DRAFT). Admin only.
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
  const criteria = await prisma.scoreCriteria.findUnique({
    where: { id },
    select: { id: true, template: { select: { status: true } } },
  });

  if (!criteria) {
    return NextResponse.json(
      { error: "Không tìm thấy tiêu chí", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (criteria.template.status !== "DRAFT") {
    return NextResponse.json(
      {
        error: "Chỉ được sửa tiêu chí khi mẫu ở trạng thái Nháp.",
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

  const result = updateCriteriaSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error.errors[0]?.message ?? "Dữ liệu không hợp lệ",
        code: "VALIDATION_ERROR",
      },
      { status: 422 }
    );
  }

  const { name, description, maxScore, weight, sortOrder } = result.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const criteria = await tx.scoreCriteria.findUnique({
        where: { id },
        select: { id: true, template: { select: { status: true } } },
      });

      if (!criteria) {
        throw new Error("NOT_FOUND");
      }

      if (criteria.template.status !== "DRAFT") {
        throw new Error("TEMPLATE_LOCKED");
      }

      return tx.scoreCriteria.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(maxScore !== undefined && { maxScore }),
          ...(weight !== undefined && { weight }),
          ...(sortOrder !== undefined && { sortOrder }),
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
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Không tìm thấy tiêu chí", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    if (error.message === "TEMPLATE_LOCKED") {
      return NextResponse.json(
        {
          error: "Chỉ được sửa tiêu chí khi mẫu ở trạng thái Nháp.",
          code: "TEMPLATE_LOCKED",
        },
        { status: 409 }
      );
    }
    throw error;
  }
}

/**
 * DELETE /api/score-criteria/[id] — Xóa tiêu chí (chỉ khi mẫu DRAFT). Admin only.
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
  try {
    await prisma.$transaction(async (tx) => {
      const criteria = await tx.scoreCriteria.findUnique({
        where: { id },
        select: { id: true, template: { select: { status: true } } },
      });

      if (!criteria) {
        throw new Error("NOT_FOUND");
      }

      if (criteria.template.status !== "DRAFT") {
        throw new Error("TEMPLATE_LOCKED");
      }

      await tx.scoreCriteria.delete({ where: { id } });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Không tìm thấy tiêu chí", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
    if (error.message === "TEMPLATE_LOCKED") {
      return NextResponse.json(
        {
          error: "Chỉ được xóa tiêu chí khi mẫu ở trạng thái Nháp.",
          code: "TEMPLATE_LOCKED",
        },
        { status: 409 }
      );
    }
    throw error;
  }
}
