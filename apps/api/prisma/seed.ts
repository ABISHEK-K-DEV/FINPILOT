/**
 * Seed reference data (system categories, plan catalogue). Idempotent.
 * In non-production environments it also creates two local demo accounts:
 *   demo@finpilot.local  / FinPilotDemo2026   (USER, with clearly-labelled sample data)
 *   admin@finpilot.local / FinPilotAdmin2026  (ADMIN, no financial data)
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { DEFAULT_CATEGORIES, LEGAL_VERSIONS, todayInTimeZone, monthKeyOf } from "@finpilot/shared";

const prisma = new PrismaClient();

const PLANS = [
  {
    code: "FREE" as const,
    name: "Free",
    description: "Everything you need to start understanding your money.",
    priceMonthly: "0",
    priceYearly: "0",
    features: ["Manual expense & income tracking", "Monthly reports", "Basic budgets", "Basic subscription tracking", "Limited receipt scans"],
    limits: { receiptScansPerMonth: 10, aiQuestionsPerMonth: 0, budgets: 5, historyMonths: null },
    sortOrder: 0,
  },
  {
    code: "PREMIUM" as const,
    name: "Premium",
    description: "Advanced AI analysis, more scans and proactive reminders.",
    priceMonthly: "149",
    priceYearly: "1499",
    features: ["Advanced AI spending analysis", "100 document scans / month", "Recurring payment intelligence", "Warranty & bill reminders", "Advanced reports"],
    limits: { receiptScansPerMonth: 100, aiQuestionsPerMonth: 300, budgets: null, historyMonths: null },
    sortOrder: 1,
  },
  {
    code: "BUSINESS" as const,
    name: "Business",
    description: "Expense intelligence for small teams and businesses.",
    priceMonthly: "499",
    priceYearly: "4999",
    features: ["Employee expense intelligence", "Small-business bill management", "Document analysis API", "Priority support"],
    limits: { receiptScansPerMonth: 1000, aiQuestionsPerMonth: 2000, budgets: null, historyMonths: null },
    sortOrder: 2,
  },
];

const ARGON = { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

async function main() {
  for (const c of DEFAULT_CATEGORIES) {
    const existing = await prisma.expenseCategory.findFirst({ where: { userId: null, slug: c.slug } });
    if (existing) {
      await prisma.expenseCategory.update({ where: { id: existing.id }, data: { name: c.name, icon: c.icon, color: c.color, kind: c.kind } });
    } else {
      await prisma.expenseCategory.create({ data: { ...c, isSystem: true } });
    }
  }
  console.log(`✔ ${DEFAULT_CATEGORIES.length} system categories`);

  for (const p of PLANS) {
    const data = {
      name: p.name,
      description: p.description,
      priceMonthly: new Prisma.Decimal(p.priceMonthly),
      priceYearly: new Prisma.Decimal(p.priceYearly),
      currency: "INR",
      features: p.features,
      limits: p.limits,
      sortOrder: p.sortOrder,
    };
    await prisma.subscriptionPlan.upsert({ where: { code: p.code }, create: { code: p.code, ...data }, update: data });
  }
  console.log(`✔ ${PLANS.length} subscription plans`);

  if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") return;

  const accounts = [
    { email: "demo@finpilot.local", name: "Demo User", password: "FinPilotDemo2026", role: "USER" as const },
    { email: "admin@finpilot.local", name: "FinPilot Admin", password: "FinPilotAdmin2026", role: "ADMIN" as const },
  ];
  for (const a of accounts) {
    const exists = await prisma.user.findUnique({ where: { email: a.email } });
    if (exists) continue;
    await prisma.user.create({
      data: {
        email: a.email,
        name: a.name,
        role: a.role,
        passwordHash: await hash(a.password, ARGON),
        preferences: { create: {} },
        consents: {
          create: [
            { type: "TERMS_OF_SERVICE", granted: true, version: LEGAL_VERSIONS.TERMS_OF_SERVICE },
            { type: "PRIVACY_POLICY", granted: true, version: LEGAL_VERSIONS.PRIVACY_POLICY },
          ],
        },
      },
    });
    console.log(`✔ demo account ${a.email} / ${a.password} (${a.role})`);
  }

  // Load sample data for the demo user via the same code path the app uses.
  const demo = await prisma.user.findUniqueOrThrow({ where: { email: "demo@finpilot.local" } });
  const hasSample = await prisma.transaction.findFirst({ where: { userId: demo.id, isSample: true } });
  if (!hasSample) {
    const { loadSampleData } = await import("../src/services/sampleData.js");
    const today = todayInTimeZone("Asia/Kolkata");
    const r = await loadSampleData(demo.id, { today, currentMonth: monthKeyOf(today), baseCurrency: "INR" });
    console.log(`✔ sample data for demo user: ${r.transactions} transactions, ${r.budgets} budgets (labelled as sample)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
