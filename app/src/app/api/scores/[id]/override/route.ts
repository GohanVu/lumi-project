import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { determineGrade } from "@/lib/scoring/grade";
import { overrideScoreSchema } from "@/lib/validation/score-result";

/**
 * PUT /api/scores/[id]/override — Admin điều chỉnh điểm tổng và lưu audit.
 * Điểm hệ thống luôn được giữ riêng để giao diện không che mất kết quả gốc.
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
      { error: "Chỉ Admin được phép ghi đè điểm", code: "FORBIDDEN" },
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

  const parsed = overrideScoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ",
        code: "VALIDATION_ERROR",
      },
      { status: 422 }
    );
  }

  const { id } = await params;
  const user = session.user as { id: string; name: string };

  const updated = await prisma.$transaction(async (transaction) => {
    const existing = await transaction.scoreResult.findUnique({
      where: { id },
      select: {
        id: true,
        companyId: true,
        systemScore: true,
        totalScore: true,
        grade: true,
        isOverridden: true,
        template: { select: { gradeAMin: true, gradeBMin: true } },
        company: { select: { deletedAt: true } },
      },
    });

    if (!existing || existing.company.deletedAt !== null) return null;

    const systemScore = existing.systemScore ?? existing.totalScore;
    const grade = determineGrade(parsed.data.score, existing.template);
    const scoreResult = await transaction.scoreResult.update({
      where: { id },
      data: {
        systemScore,
        totalScore: parsed.data.score,
        grade,
        isOverridden: true,
        overrideNote: parsed.data.reason,
      },
      select: {
        id: true,
        companyId: true,
        systemScore: true,
        totalScore: true,
        grade: true,
        isOverridden: true,
        overrideNote: true,
      },
    });

    await transaction.auditLog.create({
      data: {
        companyId: existing.companyId,
        action: "OVERRIDE",
        entity: "score_result",
        entityId: existing.id,
        userId: user.id,
        userName: user.name,
        changes: JSON.stringify({
          systemScore,
          previousEffectiveScore: existing.totalScore,
          adjustedScore: parsed.data.score,
          previousGrade: existing.grade,
          adjustedGrade: grade,
          reason: parsed.data.reason,
          wasAlreadyOverridden: existing.isOverridden,
        }),
      },
    });

    return scoreResult;
  });

  if (!updated) {
    return NextResponse.json(
      { error: "Không tìm thấy kết quả chấm điểm", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: updated });
}
