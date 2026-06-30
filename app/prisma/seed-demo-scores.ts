/**
 * Seed dữ liệu DEMO để test T23 (so sánh các lần chấm điểm).
 * Tạo: 1 NPP demo + 1 mẫu chấm điểm PUBLISHED (3 tiêu chí) + 2 lần chấm với điểm khác nhau.
 *
 * Chạy: docker compose exec -T app npx tsx prisma/seed-demo-scores.ts
 * Idempotent: chạy lại sẽ tái dùng NPP/mẫu cũ và làm mới đúng 2 lần chấm demo.
 * Dọn dữ liệu demo: docker compose exec -T app npx tsx prisma/seed-demo-scores.ts --clean
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { calculateScore } from "../src/lib/scoring/calculate";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as never);

const COMPANY_NAME = "NPP Demo So Sánh Điểm";
const TEMPLATE_NAME = "Mẫu chấm điểm Demo";

const CRITERIA = [
  { name: "Doanh số", description: "Mức doanh số theo kỳ", maxScore: 10, weight: 3, sortOrder: 0 },
  { name: "Mức độ hợp tác", description: "Thái độ phối hợp với ASM", maxScore: 10, weight: 2, sortOrder: 1 },
  { name: "Khả năng thanh toán", description: "Đúng hạn công nợ", maxScore: 10, weight: 1, sortOrder: 2 },
];

async function main() {
  const clean = process.argv.includes("--clean");

  const admin = await prisma.user.findUnique({ where: { email: "admin@lumi.vn" } });
  if (!admin) throw new Error("Chưa có admin@lumi.vn — chạy seed chính trước (npm run db:seed).");

  // NPP demo
  let company = await prisma.company.findFirst({ where: { name: COMPANY_NAME } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: COMPANY_NAME,
        status: "ACTIVE",
        assignedToId: admin.id,
        createdById: admin.id,
      },
    });
  }

  if (clean) {
    await prisma.scoreResult.deleteMany({ where: { companyId: company.id } });
    console.log("🧹 Đã xóa các lần chấm của NPP demo.");
    return;
  }

  // Mẫu chấm điểm PUBLISHED + tiêu chí
  let template = await prisma.scoreTemplate.findFirst({
    where: { name: TEMPLATE_NAME },
    include: { criteria: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) {
    template = await prisma.scoreTemplate.create({
      data: {
        name: TEMPLATE_NAME,
        description: "Mẫu demo dùng để thử tính năng so sánh điểm.",
        version: 1,
        status: "PUBLISHED",
        createdById: admin.id,
        criteria: { create: CRITERIA },
      },
      include: { criteria: { orderBy: { sortOrder: "asc" } } },
    });
  }

  const criteria = template.criteria;
  const scoringCriteria = criteria.map((c) => ({ id: c.id, maxScore: c.maxScore, weight: c.weight }));

  // Hai lần chấm với điểm khác nhau (delta hỗn hợp: tăng / giảm / tăng)
  const runs = [
    { daysAgo: 7, scores: [6, 7, 5] },
    { daysAgo: 0, scores: [9, 6, 8] },
  ];

  // Làm mới đúng bộ kết quả demo
  await prisma.scoreResult.deleteMany({ where: { companyId: company.id, templateId: template.id } });

  for (const run of runs) {
    const inputs = criteria.map((c, i) => ({ criteriaId: c.id, rawScore: run.scores[i] }));
    const calc = calculateScore(scoringCriteria, inputs);
    const scoredAt = new Date(Date.now() - run.daysAgo * 24 * 60 * 60 * 1000);

    await prisma.scoreResult.create({
      data: {
        companyId: company.id,
        templateId: template.id,
        systemScore: calc.totalScore,
        totalScore: calc.totalScore,
        grade: null,
        scoredById: admin.id,
        isOverridden: false,
        scoredAt,
        details: {
          create: criteria.map((c, i) => ({ criteriaId: c.id, score: run.scores[i] })),
        },
      },
    });
    console.log(`✅ Lần chấm ${run.daysAgo === 0 ? "(mới)" : `(${run.daysAgo} ngày trước)`}: ${calc.totalScore} điểm`);
  }

  console.log(`\n🎯 Xong! Mở: /companies/${company.id} → tab Chấm điểm → nút "So sánh"`);
}

main()
  .catch((e) => {
    console.error("❌ Seed demo error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
