import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

/**
 * GET /api/users — Danh sách users (dùng cho dropdown assign)
 * Admin only: thấy tất cả users active
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

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Không có quyền truy cập", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: users });
}
