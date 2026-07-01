import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { resolveCompanyAssigneeId } from "@/lib/company-assignment";
import {
  companyListQuerySchema,
  createCompanySchema,
} from "@/lib/validation/company";
import { hasPrismaErrorCode } from "@/lib/prisma-errors";

export async function GET(request: NextRequest) {
  // Auth check
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json(
      { error: "Chưa đăng nhập", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // Parse query params
  const { searchParams } = new URL(request.url);
  const parseResult = companyListQuerySchema.safeParse({
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || 20,
    search: searchParams.get("search") || undefined,
    status: searchParams.get("status") || undefined,
    sortBy: searchParams.get("sortBy") || "createdAt",
    sortOrder: searchParams.get("sortOrder") || "desc",
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Tham số không hợp lệ", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const { page, limit, search, status, sortBy, sortOrder } = parseResult.data;
  const skip = (page - 1) * limit;

  // Build where clause
  const user = session.user as { id: string; role: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    deletedAt: null, // Soft delete: chỉ hiển thị chưa xóa
  };

  // Role-based filtering: User chỉ thấy NPP được assign cho mình
  if (user.role !== "ADMIN") {
    where.assignedToId = user.id;
  }

  // Search filter (tên, MST, SĐT)
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { taxCode: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  // Status filter
  if (status) {
    where.status = status;
  }

  // Query
  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        name: true,
        taxCode: true,
        phone: true,
        email: true,
        province: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            contacts: true,
            interactions: true,
          },
        },
      },
    }),
    prisma.company.count({ where }),
  ]);

  return NextResponse.json({
    data: companies,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  // Auth check
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json(
      { error: "Chưa đăng nhập", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body không hợp lệ", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const parseResult = createCompanySchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Dữ liệu không hợp lệ",
        code: "VALIDATION_ERROR",
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const data = parseResult.data;
  const user = session.user as { id: string; role: string };
  const assignedToId = resolveCompanyAssigneeId(user, data.assignedToId);

  if (!assignedToId) {
    return NextResponse.json(
      {
        error: "Phải chọn ASM phụ trách",
        code: "VALIDATION_ERROR",
        details: { assignedToId: ["Phải chọn ASM phụ trách"] },
      },
      { status: 400 }
    );
  }

  const assignee = await prisma.user.findFirst({
    where: { id: assignedToId, isActive: true },
    select: { id: true },
  });

  if (!assignee) {
    return NextResponse.json(
      { error: "ASM phụ trách không hợp lệ", code: "INVALID_ASSIGNEE" },
      { status: 400 }
    );
  }

  // Check duplicate taxCode
  if (data.taxCode) {
    const existingTax = await prisma.company.findFirst({
      where: { taxCode: data.taxCode, deletedAt: null },
      select: { id: true, name: true },
    });
    if (existingTax) {
      return NextResponse.json(
        {
          error: `Mã số thuế "${data.taxCode}" đã tồn tại (NPP: ${existingTax.name})`,
          code: "DUPLICATE_TAX_CODE",
          duplicate: { id: existingTax.id, name: existingTax.name },
        },
        { status: 409 }
      );
    }
  }

  // Check duplicate phone
  if (data.phone) {
    const existingPhone = await prisma.company.findFirst({
      where: { phone: data.phone, deletedAt: null },
      select: { id: true, name: true },
    });
    if (existingPhone) {
      return NextResponse.json(
        {
          error: `Số điện thoại "${data.phone}" đã tồn tại (NPP: ${existingPhone.name})`,
          code: "DUPLICATE_PHONE",
          duplicate: { id: existingPhone.id, name: existingPhone.name },
        },
        { status: 409 }
      );
    }
  }

  // Create company
  let company;
  try {
    company = await prisma.company.create({
      data: {
        name: data.name,
        taxCode: data.taxCode || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        province: data.province || null,
        district: data.district || null,
        ward: data.ward || null,
        status: data.status,
        source: data.source || null,
        notes: data.notes || null,
        assignedToId,
        createdById: user.id,
      },
    });
  } catch (error) {
    if (hasPrismaErrorCode(error, "P2002")) {
      return NextResponse.json(
        { error: "Mã số thuế đã được sử dụng", code: "DUPLICATE_TAX_CODE" },
        { status: 409 }
      );
    }
    throw error;
  }

  return NextResponse.json({ data: company }, { status: 201 });
}
