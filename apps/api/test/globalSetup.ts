import { execSync } from "node:child_process";
import { configureTestEnv } from "./env.js";

/**
 * Prepare the dedicated test database:
 *  1. apply migrations (non-destructive `migrate deploy`),
 *  2. clear rows from previous runs (configureTestEnv guarantees a *_test database),
 *  3. seed reference data (system categories, plans).
 */
export default async function setup(): Promise<void> {
  configureTestEnv();
  const opts = { stdio: "inherit" as const, env: process.env };
  execSync("npx prisma migrate deploy", opts);

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
  }
  await prisma.$disconnect();
  execSync("npx tsx prisma/seed.ts", opts);
}
