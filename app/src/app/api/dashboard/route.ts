import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { CompanyStatus, TaskStatus } from "@/generated/prisma/enums";

/**
 * GET /api/dashboard — Số liệu tổng quan cho Dashboard.
 * Admin: toàn bộ dữ liệu. User: chỉ NPP được phân công cho mình.
 *
 * Trả về:
 * - totalCompanies, companiesByStatus
 * - overdueTasks (task chưa xong, quá hạn)
 * - todayFollowUps (tương tác có follow-up trong hôm nay)
 * - taskStats (todo/inProgress/done)
 * - scoreStats (số NPP đã chấm / chưa chấm, điểm trung bình)
 */
export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json(
      { error: "Chưa đăng nhập", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const user = session.user as { id: string; role: string };
  const isAdmin = user.role === "ADMIN";

  // Scope NPP theo quyền
  const companyScope = {
    deletedAt: null,
    ...(isAdmin ? {} : { assignedToId: user.id }),
  };

  // Scope task/interaction theo NPP được phân công
  const relatedCompanyScope = {
    company: {
      deletedAt: null,
      ...(isAdmin ? {} : { assignedToId: user.id }),
    },
  };

  // Khoảng thời gian "hôm nay" theo giờ Việt Nam (UTC+7)
  const now = new Date();
  const vnOffsetMs = 7 * 60 * 60 * 1000;
  const vnNow = new Date(now.getTime() + vnOffsetMs);
  const vnStartOfDay = new Date(
    Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate())
  );
  const todayStart = new Date(vnStartOfDay.getTime() - vnOffsetMs);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const activeTaskStatuses: TaskStatus[] = [TaskStatus.TODO, TaskStatus.IN_PROGRESS];

  const [
    totalCompanies,
    statusGroups,
    overdueTasks,
    todayFollowUps,
    todoCount,
    inProgressCount,
    doneCount,
    latestScores,
  ] = await Promise.all([
    // Tổng số NPP
    prisma.company.count({ where: companyScope }),

    // NPP theo trạng thái
    prisma.company.groupBy({
      by: ["status"],
      where: companyScope,
      _count: { _all: true },
    }),

    // Task quá hạn (chưa xong, dueDate < hôm nay)
    prisma.task.findMany({
      where: {
        ...relatedCompanyScope,
        status: { in: activeTaskStatuses },
        dueDate: { lt: todayStart },
      },
      orderBy: { dueDate: "asc" },
      take: 20,
      select: {
        id: true,
        title: true,
        priority: true,
        status: true,
        dueDate: true,
        company: { select: { id: true, name: true } },
      },
    }),

    // Follow-up hôm nay (tương tác có follow-up trong khoảng hôm nay)
    prisma.interaction.findMany({
      where: {
        ...relatedCompanyScope,
        followUpAt: { gte: todayStart, lt: todayEnd },
      },
      orderBy: { followUpAt: "asc" },
      take: 20,
      select: {
        id: true,
        type: true,
        content: true,
        followUpAt: true,
        contactName: true,
        company: { select: { id: true, name: true } },
      },
    }),

    prisma.task.count({
      where: { ...relatedCompanyScope, status: "TODO" },
    }),
    prisma.task.count({
      where: { ...relatedCompanyScope, status: "IN_PROGRESS" },
    }),
    prisma.task.count({
      where: { ...relatedCompanyScope, status: "DONE" },
    }),

    // Điểm mới nhất của mỗi NPP (distinct theo company, scoredAt giảm dần)
    prisma.scoreResult.findMany({
      where: relatedCompanyScope,
      orderBy: [{ companyId: "asc" }, { scoredAt: "desc" }],
      distinct: ["companyId"],
      select: { totalScore: true },
    }),
  ]);

  // Chuẩn hóa companiesByStatus về đủ tất cả status (kể cả 0)
  const statusCountMap = new Map(
    statusGroups.map((g) => [g.status, g._count._all])
  );
  const companiesByStatus = Object.values(CompanyStatus).map((status) => ({
    status,
    count: statusCountMap.get(status) ?? 0,
  }));

  // KPI điểm: số NPP đã chấm, chưa chấm và điểm trung bình (theo điểm mới nhất)
  const scoredCompanies = latestScores.length;
  const averageScore =
    scoredCompanies > 0
      ? Math.round(
          (latestScores.reduce((sum, s) => sum + s.totalScore, 0) /
            scoredCompanies) *
            10
        ) / 10
      : null;

  return NextResponse.json({
    data: {
      totalCompanies,
      companiesByStatus,
      taskStats: {
        todo: todoCount,
        inProgress: inProgressCount,
        done: doneCount,
      },
      scoreStats: {
        scoredCompanies,
        unscoredCompanies: Math.max(totalCompanies - scoredCompanies, 0),
        averageScore,
      },
      overdueTasks,
      todayFollowUps,
    },
  });
}
