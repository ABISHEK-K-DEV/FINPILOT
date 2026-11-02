import { Router } from "express";
import { dateStringToUtcDate, monthRange, reportQuerySchema, trendQuerySchema, PAYMENT_METHOD_LABELS } from "@finpilot/shared";
import { prisma } from "../../lib/prisma.js";
import { parse } from "../../lib/validate.js";
import { getUserContext } from "../../lib/userContext.js";
import { decToString } from "../../lib/money.js";
import { audit } from "../../lib/audit.js";
import { authOf } from "../../middleware/auth.js";
import { toTransactionDTO } from "../mappers.js";
import { buildBudgetsWithProgress, buildMonthlyReport, buildTrend } from "./service.js";
import { toCsv } from "./csv.js";
import type { DashboardDTO } from "@finpilot/shared";

export const reportsRouter = Router();
export const dashboardRouter = Router();

reportsRouter.get("/monthly", async (req, res) => {
  const { userId } = authOf(req);
  const q = parse(reportQuerySchema, req.query);
  const ctx = await getUserContext(userId);
  res.json({ report: await buildMonthlyReport(userId, ctx, q.month ?? ctx.currentMonth) });
});

reportsRouter.get("/trend", async (req, res) => {
  const { userId } = authOf(req);
  const q = parse(trendQuerySchema, req.query);
  const ctx = await getUserContext(userId);
  res.json({ currency: ctx.baseCurrency, points: await buildTrend(userId, ctx, q.month ?? ctx.currentMonth, q.months) });
});

reportsRouter.get("/monthly.csv", async (req, res) => {
  const { userId } = authOf(req);
  const q = parse(reportQuerySchema, req.query);
  const ctx = await getUserContext(userId);
  const month = q.month ?? ctx.currentMonth;
  const range = monthRange(month);
  const rows = await prisma.transaction.findMany({
    where: { userId, transactionDate: { gte: dateStringToUtcDate(range.start), lte: dateStringToUtcDate(range.end) } },
    include: { category: { select: { name: true } } },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
  });
  const csv = toCsv(
    ["Date", "Type", "Amount", "Currency", "Category", "Merchant", "Description", "Payment method", "Tags", "Sample data"],
    rows.map((t) => [
      t.transactionDate.toISOString().slice(0, 10),
      t.type,
      decToString(t.amount),
      t.currency,
      t.category?.name ?? "Uncategorised",
      t.merchant,
      t.description,
      t.paymentMethod ? PAYMENT_METHOD_LABELS[t.paymentMethod] : null,
      t.tags.join(" "),
      t.isSample ? "yes" : "no",
    ]),
  );
  await audit(req, { action: "report.csv_export", userId, metadata: { month, rows: rows.length } });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="finpilot-${month}.csv"`);
  res.setHeader("Cache-Control", "no-store");
  res.send(csv);
});

dashboardRouter.get("/", async (req, res) => {
  const { userId } = authOf(req);
  const q = parse(reportQuerySchema, req.query);
  const ctx = await getUserContext(userId);
  const month = q.month ?? ctx.currentMonth;

  const [report, trend, budgets, recent, anyTx, anySample] = await Promise.all([
    buildMonthlyReport(userId, ctx, month),
    buildTrend(userId, ctx, month, 6),
    buildBudgetsWithProgress(userId, ctx, month),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
    prisma.transaction.findFirst({ where: { userId }, select: { id: true } }),
    prisma.transaction.findFirst({ where: { userId, isSample: true }, select: { id: true } }),
  ]);

  const body: DashboardDTO = {
    month,
    today: ctx.today,
    currency: ctx.baseCurrency,
    report,
    trend,
    budgets,
    recentTransactions: recent.map(toTransactionDTO),
    hasAnyTransactions: Boolean(anyTx),
    hasSampleData: Boolean(anySample),
    upcoming: { recurringPayments: null, subscriptions: null, bills: null },
  };
  res.json(body);
});
