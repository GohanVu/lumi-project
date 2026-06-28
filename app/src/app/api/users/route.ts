import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

/**
 * GET /api/users — Danh sách users (dùng cho dropdown assign)
 * Admin: thấy tất cả users active
 * User: chỉ thấy chính mình
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { isActive: true };

  // Non-admin only sees themselves
  if (user.role !== "ADMIN") {
    where.id = user.id;
  }

  const users = await prisma.user.findMany({
    where,
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
