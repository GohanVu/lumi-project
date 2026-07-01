import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { calculateScore } from "@/lib/scoring/calculate";
import { determineGrade } from "@/lib/scoring/grade";
import { createScoreResultSchema } from "@/lib/validation/score-result";

async function findAccessibleCompany(id: string, userId: string, role: string) {
  return prisma.company.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(role !== "ADMIN" ? { assignedToId: userId } : {}),
    },
    select: { id: true },
  });
}

const criteriaSelect = {
  id: true,
  name: true,
  description: true,
  maxScore: true,
  weight: true,
  sortOrder: true,
} as const;

/**
 * GET /api/companies/[id]/scores — Lịch sử điểm và mẫu đang được ban hành.
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
  const company = await findAccessibleCompany(id, user.id, user.role);
  if (!company) {
    return NextResponse.json(
      { error: "Không tìm thấy NPP", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const [results, templates] = await Promise.all([
    prisma.scoreResult.findMany({
      where: { companyId: id },
      orderBy: [{ scoredAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        systemScore: true,
        totalScore: true,
        grade: true,
        isOverridden: true,
        overrideNote: true,
        scoredAt: true,
        scoredBy: { select: { id: true, name: true } },
        template: {
          select: {
            id: true,
            name: true,
            version: true,
            gradeAMin: true,
            gradeBMin: true,
            criteria: {
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              select: criteriaSelect,
            },
          },
        },
        details: {
          select: {
            id: true,
            score: true,
            note: true,
            criteria: { select: criteriaSelect },
          },
        },
      },
    }),
    prisma.scoreTemplate.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        description: true,
        version: true,
        gradeAMin: true,
        gradeBMin: true,
        criteria: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: criteriaSelect,
        },
      },
    }),
  ]);

  const resultsWithCompleteness = results.map((result) => {
    const calculation = calculateScore(
      result.template.criteria,
      result.details.map((detail) => ({
        criteriaId: detail.criteria.id,
        rawScore: detail.score,
      }))
    );

    return {
      ...result,
      systemScore: result.systemScore ?? result.totalScore,
      grade:
        result.grade ??
        determineGrade(result.totalScore, {
          gradeAMin: result.template.gradeAMin,
          gradeBMin: result.template.gradeBMin,
        }),
      dataCompleteness: calculation.dataCompleteness,
    };
  });

  return NextResponse.json({
    data: resultsWithCompleteness,
    availableTemplates: templates,
  });
}

/**
 * POST /api/companies/[id]/scores — Chấm điểm theo template PUBLISHED.
 */
export async function POST(
  request: NextRequest,
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
  const user = session.user as { id: string; name: string; role: string };
  const company = await findAccessibleCompany(id, user.id, user.role);
  if (!company) {
    return NextResponse.json(
      { error: "Không tìm thấy NPP", code: "NOT_FOUND" },
      { status: 404 }
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

  const parsed = createScoreResultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ",
        code: "VALIDATION_ERROR",
      },
      { status: 422 }
    );
  }

  const template = await prisma.scoreTemplate.findFirst({
    where: { id: parsed.data.templateId, status: "PUBLISHED" },
    select: {
      id: true,
      name: true,
      version: true,
      gradeAMin: true,
      gradeBMin: true,
      criteria: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: criteriaSelect,
      },
    },
  });

  if (!template) {
    return NextResponse.json(
      { error: "Mẫu chấm điểm không khả dụng", code: "TEMPLATE_NOT_AVAILABLE" },
      { status: 409 }
    );
  }

  const criteriaMap = new Map(template.criteria.map((criterion) => [criterion.id, criterion]));
  for (const detail of parsed.data.details) {
    const criterion = criteriaMap.get(detail.criteriaId);
    if (!criterion) {
      return NextResponse.json(
        { error: "Tiêu chí không thuộc mẫu đã chọn", code: "INVALID_CRITERIA" },
        { status: 422 }
      );
    }
    if (detail.score !== null && detail.score > criterion.maxScore) {
      return NextResponse.json(
        {
          error: `Điểm "${criterion.name}" không được vượt quá ${criterion.maxScore}`,
          code: "SCORE_EXCEEDS_MAX",
        },
        { status: 422 }
      );
    }
  }

  const inputMap = new Map(
    parsed.data.details.map((detail) => [detail.criteriaId, detail] as const)
  );
  const calculation = calculateScore(
    template.criteria,
    template.criteria.map((criterion) => ({
      criteriaId: criterion.id,
      rawScore: inputMap.get(criterion.id)?.score ?? null,
    })),
    parsed.data.missingDataPolicy
  );

  if (!calculation.canFinalize) {
    return NextResponse.json(
      {
        error: "Chưa đủ dữ liệu để hoàn tất theo chính sách đã chọn",
        code: "INCOMPLETE_SCORE",
      },
      { status: 422 }
    );
  }

  const grade = determineGrade(calculation.totalScore, {
    gradeAMin: template.gradeAMin,
    gradeBMin: template.gradeBMin,
  });

  const created = await prisma.$transaction(async (transaction) => {
    const scoreResult = await transaction.scoreResult.create({
      data: {
        companyId: id,
        templateId: template.id,
        systemScore: calculation.totalScore,
        totalScore: calculation.totalScore,
        grade,
        scoredById: user.id,
        details: {
          create: calculation.details
            .filter((detail) => detail.hasData && detail.effectiveRawScore !== null)
            .map((detail) => ({
              criteriaId: detail.criteriaId,
              score: detail.effectiveRawScore!,
              note: inputMap.get(detail.criteriaId)?.note || null,
            })),
        },
      },
      select: {
        id: true,
        totalScore: true,
        grade: true,
        scoredAt: true,
      },
    });

    await transaction.auditLog.create({
      data: {
        companyId: id,
        action: "SCORE",
        entity: "score_result",
        entityId: scoreResult.id,
        userId: user.id,
        userName: user.name,
        changes: JSON.stringify({
          templateId: template.id,
          templateVersion: template.version,
          missingDataPolicy: parsed.data.missingDataPolicy,
          totalScore: calculation.totalScore,
          grade,
          dataCompleteness: calculation.dataCompleteness,
        }),
      },
    });

    return scoreResult;
  });

  return NextResponse.json(
    {
      data: {
        ...created,
        dataCompleteness: calculation.dataCompleteness,
      },
    },
    { status: 201 }
  );
}
