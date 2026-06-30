import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { updateUserSchema } from "@/lib/validation/user";

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
 * PUT /api/users/[id] — Phân quyền / vô hiệu hóa người dùng (Admin only).
 * Admin không được tự hạ quyền hoặc tự vô hiệu hóa chính mình (tránh tự khóa).
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
  const currentUser = session.user as { id: string };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body không hợp lệ", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const result = updateUserSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error.errors[0]?.message ?? "Dữ liệu không hợp lệ",
        code: "VALIDATION_ERROR",
      },
      { status: 422 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json(
      { error: "Không tìm thấy người dùng", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const { role, isActive } = result.data;

  // Chặn tự khóa: Admin không được tự hạ quyền hoặc tự vô hiệu hóa.
  if (id === currentUser.id) {
    if (role === "USER") {
      return NextResponse.json(
        { error: "Không thể tự hạ quyền chính mình", code: "SELF_DEMOTE" },
        { status: 409 }
      );
    }
    if (isActive === false) {
      return NextResponse.json(
        { error: "Không thể tự vô hiệu hóa chính mình", code: "SELF_DISABLE" },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(role !== undefined ? { role } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    select: manageSelect,
  });

  return NextResponse.json({ data: updated });
}
