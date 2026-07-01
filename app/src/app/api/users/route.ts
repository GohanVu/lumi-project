import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/auth-guard";
import { createUserSchema } from "@/lib/validation/user";
import { hasPrismaErrorCode } from "@/lib/prisma-errors";

/** Trường mở rộng cho trang quản lý người dùng (T28). */
const manageSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  _count: { select: { assignedCompanies: true } },
} as const;

/**
 * GET /api/users — Danh sách người dùng (Admin only).
 *   - Mặc định: chỉ user đang hoạt động, trường tối thiểu (dùng cho dropdown assign).
 *   - ?scope=all: toàn bộ user kèm trạng thái + số NPP phụ trách (trang quản lý).
 */
export async function GET(request: NextRequest) {
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

  const scope = request.nextUrl.searchParams.get("scope");
  if (scope === "all") {
    const users = await prisma.user.findMany({
      orderBy: [{ createdAt: "asc" }],
      select: manageSelect,
    });
    return NextResponse.json({ data: users });
  }

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: users });
}

/**
 * POST /api/users — Tạo người dùng mới với tài khoản email/password (Admin only).
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

  const result = createUserSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error.errors[0]?.message ?? "Dữ liệu không hợp lệ",
        code: "VALIDATION_ERROR",
      },
      { status: 422 }
    );
  }

  const { name, email, password, role } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email đã được sử dụng", code: "EMAIL_TAKEN" },
      { status: 409 }
    );
  }

  const hashedPassword = await hashPassword(password);

  let created;
  try {
    created = await prisma.user.create({
      data: {
        name,
        email,
        emailVerified: true,
        role,
        isActive: true,
        accounts: {
          create: {
            accountId: email,
            providerId: "credential",
            password: hashedPassword,
          },
        },
      },
      select: manageSelect,
    });
  } catch (error) {
    if (hasPrismaErrorCode(error, "P2002")) {
      return NextResponse.json(
        { error: "Email đã được sử dụng", code: "EMAIL_TAKEN" },
        { status: 409 }
      );
    }
    throw error;
  }

  return NextResponse.json({ data: created }, { status: 201 });
}
