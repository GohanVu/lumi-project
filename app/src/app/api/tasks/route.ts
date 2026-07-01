import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { taskListQuerySchema } from "@/lib/validation/task";

/**
 * GET /api/tasks — Danh sách nhiệm vụ toàn cục (có tìm kiếm, lọc, phân trang)
 * Admin xem tất cả (hoặc lọc theo ASM); User chỉ xem nhiệm vụ được phân công cho mình.
 */
export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json(
      { error: "Chưa đăng nhập", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parseResult = taskListQuerySchema.safeParse({
    page: searchParams.get("page") || undefined,
    limit: searchParams.get("limit") || undefined,
    search: searchParams.get("search") || undefined,
    status: searchParams.get("status") || undefined,
    priority: searchParams.get("priority") || undefined,
    companyId: searchParams.get("companyId") || undefined,
    assignedToId: searchParams.get("assignedToId") || undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Tham số không hợp lệ", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const { page, limit, search, status, priority, companyId, assignedToId } = parseResult.data;
  const skip = (page - 1) * limit;
  const user = session.user as { id: string; role: string };

  // Xây dựng điều kiện lọc
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    company: {
      deletedAt: null, // Chỉ lấy các NPP chưa bị xóa
    },
  };

  // Phân quyền: ASM chỉ thấy task của chính họ, Admin thấy tất cả hoặc lọc theo ASM được chọn
  if (user.role !== "ADMIN") {
    where.assignedToId = user.id;
  } else if (assignedToId) {
    where.assignedToId = assignedToId;
  }

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  if (companyId) {
    where.companyId = companyId;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: { id: true, name: true },
        },
        assignedTo: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return NextResponse.json({
    data: tasks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
