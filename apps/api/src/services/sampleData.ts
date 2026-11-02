/**
 * Clearly-labelled demonstration data.
 *
 * - Only created when the user explicitly asks (Settings → "Load sample data", or the dashboard empty state).
 * - Every generated row has isSample = true and source = SAMPLE; the UI shows a "Sample" badge and banner.
 * - "Remove sample data" deletes exactly these rows and nothing else.
 * - Generation is deterministic (seeded PRNG) relative to the user's current month.
 */
import { Prisma, type PaymentMethod } from "@prisma/client";
import { addMonths, dateStringToUtcDate, daysInMonth, dayOfMonth, DEFAULT_CATEGORIES, type CurrencyCode } from "@finpilot/shared";
import { prisma } from "../lib/prisma.js";

interface SampleTx {
  type: "EXPENSE" | "INCOME";
  slug: string;
  amount: string;
  date: string;
  merchant: string;
  description: string;
  paymentMethod: PaymentMethod;
  tags?: string[];
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Whole-rupee-ish amount in [min, max] as a decimal string (integer arithmetic, no float money). */
function amountBetween(rand: () => number, min: number, max: number, paise = true): string {
  const rupees = min + Math.floor(rand() * (max - min + 1));
  const p = paise ? Math.floor(rand() * 100) : 0;
  return `${rupees}.${String(p).padStart(2, "0")}`;
}

const FOOD = ["Udupi Café", "Spice Route Kitchen", "Campus Canteen", "Biryani House", "Café Mocha"];
const GROCERY = ["FreshMart", "Neighbourhood Kirana", "Daily Greens"];
const TRANSPORT = ["Metro card top-up", "Auto rickshaw", "Cab ride", "Fuel station"];
const SHOP = ["Online marketplace", "Apparel store", "Electronics store"];

export function generateSampleTransactions(currentMonth: string, today: string): SampleTx[] {
  const rand = mulberry32(20261102);
  const out: SampleTx[] = [];
  const months = [addMonths(currentMonth, -3), addMonths(currentMonth, -2), addMonths(currentMonth, -1), currentMonth];

  for (const month of months) {
    const lastDay = month === currentMonth ? dayOfMonth(today) : daysInMonth(month);
    const d = (day: number) => `${month}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
    const has = (day: number) => day <= lastDay;
    const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)] as T;

    if (has(1)) out.push({ type: "INCOME", slug: "salary", amount: "85000.00", date: d(1), merchant: "Employer Pvt Ltd", description: "Monthly salary", paymentMethod: "BANK_TRANSFER" });
    if (has(5)) out.push({ type: "EXPENSE", slug: "housing", amount: "22000.00", date: d(5), merchant: "Landlord", description: "House rent", paymentMethod: "UPI" });
    if (has(8)) out.push({ type: "EXPENSE", slug: "utilities", amount: amountBetween(rand, 1450, 2350), date: d(8), merchant: "State Electricity Board", description: "Electricity bill", paymentMethod: "UPI", tags: ["bill"] });
    if (has(10)) out.push({ type: "EXPENSE", slug: "utilities", amount: "999.00", date: d(10), merchant: "Home Broadband", description: "Internet 100 Mbps plan", paymentMethod: "CREDIT_CARD", tags: ["bill"] });
    if (has(12)) out.push({ type: "EXPENSE", slug: "utilities", amount: "399.00", date: d(12), merchant: "Mobile Operator", description: "Prepaid mobile recharge", paymentMethod: "UPI", tags: ["bill"] });
    if (has(14)) out.push({ type: "EXPENSE", slug: "subscriptions", amount: "649.00", date: d(14), merchant: "Streaming Service", description: "Video streaming plan", paymentMethod: "CREDIT_CARD", tags: ["subscription"] });
    if (has(18)) out.push({ type: "EXPENSE", slug: "subscriptions", amount: "130.00", date: d(18), merchant: "Cloud Storage", description: "100 GB storage plan", paymentMethod: "CREDIT_CARD", tags: ["subscription"] });
    if (has(3)) out.push({ type: "EXPENSE", slug: "health", amount: "1500.00", date: d(3), merchant: "Fitness Club", description: "Gym membership", paymentMethod: "DEBIT_CARD", tags: ["subscription"] });

    for (const day of [2, 9, 16, 23, 30]) {
      if (has(day)) out.push({ type: "EXPENSE", slug: "groceries", amount: amountBetween(rand, 900, 2600), date: d(day), merchant: pick(GROCERY), description: "Weekly groceries", paymentMethod: pick<PaymentMethod>(["UPI", "DEBIT_CARD"]) });
    }
    for (let i = 0; i < 9; i++) {
      const day = 1 + Math.floor(rand() * 28);
      if (has(day)) out.push({ type: "EXPENSE", slug: "food", amount: amountBetween(rand, 120, 950), date: d(day), merchant: pick(FOOD), description: "Meal", paymentMethod: "UPI" });
    }
    for (let i = 0; i < 7; i++) {
      const day = 1 + Math.floor(rand() * 28);
      if (has(day)) out.push({ type: "EXPENSE", slug: "transport", amount: amountBetween(rand, 60, 650), date: d(day), merchant: pick(TRANSPORT), description: "Commute", paymentMethod: "UPI" });
    }
    for (let i = 0; i < 2; i++) {
      const day = 1 + Math.floor(rand() * 28);
      if (has(day)) out.push({ type: "EXPENSE", slug: "shopping", amount: amountBetween(rand, 700, 4200), date: d(day), merchant: pick(SHOP), description: "Shopping", paymentMethod: "CREDIT_CARD" });
    }
    const outing = 6 + Math.floor(rand() * 20);
    if (has(outing)) out.push({ type: "EXPENSE", slug: "entertainment", amount: amountBetween(rand, 400, 1800), date: d(outing), merchant: "Cinema Multiplex", description: "Movie night", paymentMethod: "UPI" });
    if (has(20) && rand() > 0.4) out.push({ type: "INCOME", slug: "freelance", amount: amountBetween(rand, 6000, 18000, false), date: d(20), merchant: "Freelance client", description: "Design project payment", paymentMethod: "BANK_TRANSFER" });
  }
  return out;
}

const SAMPLE_BUDGETS: { slug: string | null; amount: string }[] = [
  { slug: null, amount: "60000.00" },
  { slug: "food", amount: "5000.00" },
  { slug: "groceries", amount: "8000.00" },
  { slug: "transport", amount: "2500.00" },
  { slug: "shopping", amount: "5000.00" },
  { slug: "entertainment", amount: "1500.00" },
];

export async function loadSampleData(
  userId: string,
  ctx: { currentMonth: string; today: string; baseCurrency: CurrencyCode },
): Promise<{ transactions: number; budgets: number }> {
  const categories = await prisma.expenseCategory.findMany({
    where: { userId: null, isSystem: true, slug: { in: DEFAULT_CATEGORIES.map((c) => c.slug) } },
    select: { id: true, slug: true },
  });
  const idBySlug = new Map(categories.map((c) => [c.slug, c.id]));
  const txs = generateSampleTransactions(ctx.currentMonth, ctx.today);

  return prisma.$transaction(async (db) => {
    // Idempotent: replace any previous sample data.
    await db.transaction.deleteMany({ where: { userId, isSample: true } });
    await db.budget.deleteMany({ where: { userId, isSample: true } });

    const created = await db.transaction.createMany({
      data: txs.map((t) => ({
        userId,
        type: t.type,
        amount: new Prisma.Decimal(t.amount),
        currency: ctx.baseCurrency,
        transactionDate: dateStringToUtcDate(t.date),
        categoryId: idBySlug.get(t.slug) ?? null,
        merchant: t.merchant,
        description: t.description,
        paymentMethod: t.paymentMethod,
        tags: ["sample", ...(t.tags ?? [])],
        source: "SAMPLE" as const,
        isSample: true,
      })),
    });

    const existingBudgets = await db.budget.findMany({ where: { userId }, select: { scopeKey: true } });
    const taken = new Set(existingBudgets.map((b) => b.scopeKey));
    let budgets = 0;
    for (const b of SAMPLE_BUDGETS) {
      const categoryId = b.slug ? (idBySlug.get(b.slug) ?? null) : null;
      if (b.slug && !categoryId) continue;
      const scopeKey = categoryId ?? "OVERALL";
      if (taken.has(scopeKey)) continue;
      await db.budget.create({
        data: { userId, categoryId, scopeKey, amount: new Prisma.Decimal(b.amount), currency: ctx.baseCurrency, isSample: true },
      });
      budgets++;
    }
    return { transactions: created.count, budgets };
  });
}

export async function removeSampleData(userId: string): Promise<{ transactions: number; budgets: number }> {
  return prisma.$transaction(async (db) => {
    const t = await db.transaction.deleteMany({ where: { userId, isSample: true } });
    const b = await db.budget.deleteMany({ where: { userId, isSample: true } });
    return { transactions: t.count, budgets: b.count };
  });
}
