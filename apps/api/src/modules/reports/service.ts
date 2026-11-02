import { Prisma } from "@prisma/client";
import {
  addMonths,
  averageDaily,
  compareAmounts,
  computeBudgetProgress,
  dateStringToUtcDate,
  dayOfMonth,
  daysInMonth,
  monthRange,
  monthlyTrend,
  monthsEndingWith,
  summarizeTransactions,
  utcDateToDateString,
  type BudgetWithProgressDTO,
  type MonthTrendPoint,
  type MonthlyReportDTO,
  type TransactionLike,
} from "@finpilot/shared";
import { prisma } from "../../lib/prisma.js";
import { decToString } from "../../lib/money.js";
import type { UserFinancialContext } from "../../lib/userContext.js";
import { toBudgetDTO, toTransactionDTO } from "../mappers.js";

/**
 * Load the minimal columns needed for aggregation within an inclusive date range.
 * Aggregation is performed with decimal-safe shared functions (packages/shared/src/reports.ts).
 * Milestone 4 adds pre-computed monthly aggregates for large histories.
 */
export async function loadTransactionsForRange(userId: string, start: string, end: string): Promise<TransactionLike[]> {
  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      transactionDate: { gte: dateStringToUtcDate(start), lte: dateStringToUtcDate(end) },
    },
    select: { type: true, amount: true, currency: true, categoryId: true, transactionDate: true },
  });
  return rows.map((r) => ({
    type: r.type,
    amount: decToString(r.amount),
    currency: r.currency,
    categoryId: r.categoryId,
    transactionDate: utcDateToDateString(r.transactionDate),
  }));
}

export async function buildMonthlyReport(
  userId: string,
  ctx: UserFinancialContext,
  month: string,
): Promise<MonthlyReportDTO> {
  const previousMonth = addMonths(month, -1);
  const prevRange = monthRange(previousMonth);
  const range = monthRange(month);
  const all = await loadTransactionsForRange(userId, prevRange.start, range.end);

  const inMonth = all.filter((t) => t.transactionDate >= range.start);
  const inPrev = all.filter((t) => t.transactionDate <= prevRange.end);
  const summary = summarizeTransactions(inMonth, ctx.baseCurrency);
  const previous = summarizeTransactions(inPrev, ctx.baseCurrency);

  // Days elapsed for average daily spend: full month in the past, up to today for the current month.
  const elapsed =
    month < ctx.currentMonth ? daysInMonth(month) : month === ctx.currentMonth ? dayOfMonth(ctx.today) : 0;

  const monthWhere: Prisma.TransactionWhereInput = {
    userId,
    transactionDate: { gte: dateStringToUtcDate(range.start), lte: dateStringToUtcDate(range.end) },
  };
  const [largest, sampleCount] = await Promise.all([
    prisma.transaction.findMany({
      where: { ...monthWhere, type: "EXPENSE", currency: ctx.baseCurrency },
      orderBy: [{ amount: "desc" }, { transactionDate: "desc" }],
      take: 5,
    }),
    prisma.transaction.count({ where: { ...monthWhere, isSample: true } }),
  ]);

  return {
    month,
    today: ctx.today,
    summary,
    previous,
    expenseChange: compareAmounts(summary.expenses, previous.expenses),
    incomeChange: compareAmounts(summary.income, previous.income),
    averageDailyExpense: averageDaily(summary.expenses, elapsed),
    largestExpenses: largest.map(toTransactionDTO),
    sampleTransactionCount: sampleCount,
  };
}

export async function buildTrend(
  userId: string,
  ctx: UserFinancialContext,
  endMonth: string,
  count: number,
): Promise<MonthTrendPoint[]> {
  const months = monthsEndingWith(endMonth, count);
  const first = months[0] ?? endMonth;
  const txs = await loadTransactionsForRange(userId, monthRange(first).start, monthRange(endMonth).end);
  return monthlyTrend(txs, months, ctx.baseCurrency);
}

/** Every budget with month-to-date progress. Spending is counted in the budget's own currency. */
export async function buildBudgetsWithProgress(
  userId: string,
  ctx: UserFinancialContext,
  month: string,
): Promise<BudgetWithProgressDTO[]> {
  const budgets = await prisma.budget.findMany({
    where: { userId },
    include: { category: { select: { name: true } } },
    orderBy: [{ categoryId: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
  });
  if (!budgets.length) return [];

  const range = monthRange(month);
  const grouped = await prisma.transaction.groupBy({
    by: ["categoryId", "currency"],
    where: {
      userId,
      type: "EXPENSE",
      transactionDate: { gte: dateStringToUtcDate(range.start), lte: dateStringToUtcDate(range.end) },
    },
    _sum: { amount: true },
  });

  return budgets.map((b) => {
    const relevant = grouped.filter(
      (g) => g.currency === b.currency && (b.categoryId === null || g.categoryId === b.categoryId),
    );
    const spent = relevant.reduce((acc, g) => acc.plus(g._sum.amount ?? 0), new Prisma.Decimal(0));
    return {
      ...toBudgetDTO(b),
      month,
      progress: computeBudgetProgress({
        limit: decToString(b.amount),
        spent: decToString(spent),
        month,
        today: ctx.today,
        warningThresholdPercent: b.alertThresholdPercent,
      }),
    };
  });
}
