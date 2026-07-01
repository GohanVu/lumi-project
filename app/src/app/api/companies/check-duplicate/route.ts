import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { z } from "zod";

const querySchema = z.object({
  phone: z.string().optional(),
  taxCode: z.string().optional(),
});

/**
 * GET /api/companies/check-duplicate?phone=xxx&taxCode=yyy
 * Kiểm tra xem SĐT hoặc MST đã tồn tại chưa (real-time khi user nhập)
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
  const rawPhone = searchParams.get("phone")?.trim();
  const rawTaxCode = searchParams.get("taxCode")?.trim();

  const parseResult = querySchema.safeParse({
    phone: rawPhone || undefined,
    taxCode: rawTaxCode || undefined,
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Tham số không hợp lệ", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const { phone, taxCode } = parseResult.data;
  const duplicates: { field: string; company: { id: string; name: string } }[] = [];

  if (taxCode) {
    const existing = await prisma.company.findFirst({
      where: { taxCode, deletedAt: null },
      select: { id: true, name: true },
    });
    if (existing) {
      duplicates.push({ field: "taxCode", company: existing });
    }
  }

  if (phone) {
    const existing = await prisma.company.findFirst({
      where: { phone, deletedAt: null },
      select: { id: true, name: true },
    });
    if (existing) {
      duplicates.push({ field: "phone", company: existing });
    }
  }

  return NextResponse.json({
    hasDuplicates: duplicates.length > 0,
    duplicates,
  });
}
