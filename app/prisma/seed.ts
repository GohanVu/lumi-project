import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const hashedPassword = await hashPassword("admin123");

  const admin = await prisma.user.upsert({
    where: { email: "admin@lumi.vn" },
    update: {},
    create: {
      name: "Admin LUMI",
      email: "admin@lumi.vn",
      emailVerified: true,
      role: "ADMIN",
      isActive: true,
      accounts: {
        create: {
          accountId: "admin@lumi.vn",
          providerId: "credential",
          password: hashedPassword,
        },
      },
    },
  });

  console.log(`✅ Admin user created: ${admin.email} (password: admin123)`);

  // Create a sample ASM user
  const asmPassword = await hashPassword("user123");

  const asm = await prisma.user.upsert({
    where: { email: "asm1@lumi.vn" },
    update: {},
    create: {
      name: "Nguyễn Văn An",
      email: "asm1@lumi.vn",
      emailVerified: true,
      role: "USER",
      isActive: true,
      accounts: {
        create: {
          accountId: "asm1@lumi.vn",
          providerId: "credential",
          password: asmPassword,
        },
      },
    },
  });

  console.log(`✅ ASM user created: ${asm.email} (password: user123)`);

  console.log("🌱 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
