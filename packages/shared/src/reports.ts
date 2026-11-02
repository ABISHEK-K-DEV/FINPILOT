/**
 * Aggregation maths for dashboards and monthly reports. Pure, decimal-safe.
 */
import { Decimal, MONEY_SCALE, percentage, toDecimal } from "./money.js";
import { monthKeyOf } from "./dates.js";
import type { TransactionType } from "./constants.js";

export interface TransactionLike {
  type: TransactionType;
  amount: string;
  currency: string;
  categoryId: string | null;
  transactionDate: string; // YYYY-MM-DD
}

export interface CategoryTotal {
  categoryId: string | null;
  total: string;
  count: number;
  /** Share of total expenses in % (1 dp). */
  sharePercent: number;
}

export interface PeriodSummary {
  currency: string;
  income: string;
  expenses: string;
  /** income - expenses */
  net: string;
  /** net / income * 100; null when there is no income recorded. */
  savingsRatePercent: number | null;
  transactionCount: number;
  expenseCount: number;
  incomeCount: number;
  /** Transactions in other currencies, which are NOT included in totals (no FX conversion yet). */
  excludedOtherCurrencyCount: number;
  expensesByCategory: CategoryTotal[];
  incomeByCategory: CategoryTotal[];
}

function groupByCategory(txs: TransactionLike[], grandTotal: Decimal): CategoryTotal[] {
  const map = new Map<string | null, { total: Decimal; count: number }>();
  for (const tx of txs) {
    const entry = map.get(tx.categoryId) ?? { total: new Decimal(0), count: 0 };
    entry.total = entry.total.plus(toDecimal(tx.amount));
    entry.count += 1;
    map.set(tx.categoryId, entry);
  }
  return [...map.entries()]
    .map(([categoryId, { total, count }]) => ({
      categoryId,
      total: total.toFixed(MONEY_SCALE),
      count,
      sharePercent: percentage(total, grandTotal, 1) ?? 0,
    }))
    .sort((a, b) => toDecimal(b.total).comparedTo(toDecimal(a.total)));
}

export function summarizeTransactions(txs: readonly TransactionLike[], currency: string): PeriodSummary {
  const inCurrency = txs.filter((t) => t.currency === currency);
  const expenses = inCurrency.filter((t) => t.type === "EXPENSE");
  const income = inCurrency.filter((t) => t.type === "INCOME");
  const totalExpenses = expenses.reduce((acc, t) => acc.plus(toDecimal(t.amount)), new Decimal(0));
  const totalIncome = income.reduce((acc, t) => acc.plus(toDecimal(t.amount)), new Decimal(0));
  const net = totalIncome.minus(totalExpenses);

  return {
    currency,
    income: totalIncome.toFixed(MONEY_SCALE),
    expenses: totalExpenses.toFixed(MONEY_SCALE),
    net: net.toFixed(MONEY_SCALE),
    savingsRatePercent: totalIncome.isZero() ? null : percentage(net, totalIncome, 1),
    transactionCount: inCurrency.length,
    expenseCount: expenses.length,
    incomeCount: income.length,
    excludedOtherCurrencyCount: txs.length - inCurrency.length,
    expensesByCategory: groupByCategory(expenses, totalExpenses),
    incomeByCategory: groupByCategory(income, totalIncome),
  };
}

export interface MonthTrendPoint {
  month: string;
  income: string;
  expenses: string;
  net: string;
  transactionCount: number;
}

/** Per-month totals for the given ordered list of months (in `currency` only). */
export function monthlyTrend(txs: readonly TransactionLike[], months: readonly string[], currency: string): MonthTrendPoint[] {
  const buckets = new Map<string, TransactionLike[]>(months.map((m) => [m, []]));
  for (const tx of txs) {
    buckets.get(monthKeyOf(tx.transactionDate))?.push(tx);
  }
  return months.map((month) => {
    const s = summarizeTransactions(buckets.get(month) ?? [], currency);
    return { month, income: s.income, expenses: s.expenses, net: s.net, transactionCount: s.transactionCount };
  });
}

export interface ChangeComparison {
  current: string;
  previous: string;
  difference: string;
  /** null when previous is zero (change not meaningful as a percentage). */
  percentChange: number | null;
}

export function compareAmounts(current: string, previous: string): ChangeComparison {
  const c = toDecimal(current);
  const p = toDecimal(previous);
  const diff = c.minus(p);
  return {
    current: c.toFixed(MONEY_SCALE),
    previous: p.toFixed(MONEY_SCALE),
    difference: diff.toFixed(MONEY_SCALE),
    percentChange: p.isZero() ? null : percentage(diff, p, 1),
  };
}

/** Average daily spend for a period, given the number of days elapsed. */
export function averageDaily(total: string, days: number): string | null {
  if (days <= 0) return null;
  return toDecimal(total).dividedBy(days).toFixed(MONEY_SCALE);
}
