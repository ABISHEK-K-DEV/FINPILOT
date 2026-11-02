/**
 * Plain-language, rule-based observations built ONLY from the user's own report figures.
 * Each line states the numbers it was computed from. No predictions, no advice.
 */
import type { MonthlyReportDTO, BudgetWithProgressDTO, CategoryDTO } from "@finpilot/shared";

export interface Observation {
  id: string;
  tone: "neutral" | "positive" | "attention";
  text: string;
  basis: string;
}

export function buildObservations(
  report: MonthlyReportDTO,
  budgets: BudgetWithProgressDTO[],
  categories: Map<string, CategoryDTO>,
  money: (a: string) => string,
  isCurrentMonth: boolean,
): Observation[] {
  const out: Observation[] = [];
  const s = report.summary;
  const so = isCurrentMonth ? "so far this month" : "this month";

  if (s.expenseCount === 0) return out;

  const top = s.expensesByCategory[0];
  if (top) {
    const name = top.categoryId ? (categories.get(top.categoryId)?.name ?? "A category") : "Uncategorised spending";
    out.push({
      id: "top-category",
      tone: "neutral",
      text: `${name} is your largest expense category ${so}: ${money(top.total)} (${top.sharePercent.toFixed(1)}% of spending).`,
      basis: `${top.count} transaction${top.count === 1 ? "" : "s"} in this category ÷ total expenses of ${money(s.expenses)}.`,
    });
  }

  const ch = report.expenseChange;
  if (ch.percentChange !== null && !isCurrentMonth) {
    const up = ch.percentChange > 0;
    out.push({
      id: "mom",
      tone: up ? "attention" : "positive",
      text: `Spending was ${Math.abs(ch.percentChange).toFixed(1)}% ${up ? "higher" : "lower"} than the previous month (${money(ch.difference.replace("-", ""))} ${up ? "more" : "less"}).`,
      basis: `${money(ch.current)} this month vs ${money(ch.previous)} last month.`,
    });
  } else if (ch.percentChange !== null && isCurrentMonth) {
    out.push({
      id: "mom-partial",
      tone: "neutral",
      text: `You've spent ${money(ch.current)} so far, compared with ${money(ch.previous)} for the whole of last month.`,
      basis: "Month-to-date total vs previous full month. The month isn't over, so this is not a like-for-like comparison.",
    });
  }

  if (s.savingsRatePercent !== null) {
    out.push({
      id: "savings",
      tone: s.savingsRatePercent >= 0 ? "positive" : "attention",
      text:
        s.savingsRatePercent >= 0
          ? `You've kept ${s.savingsRatePercent.toFixed(1)}% of recorded income ${so}.`
          : `Recorded expenses exceed recorded income ${so} by ${money(s.net.replace("-", ""))}.`,
      basis: `(Income ${money(s.income)} − expenses ${money(s.expenses)}) ÷ income. Based only on income you've recorded.`,
    });
  }

  const risky = budgets.filter((b) => b.progress.status === "EXCEEDED" || (isCurrentMonth && b.progress.projectedStatus === "EXCEEDED"));
  for (const b of risky.slice(0, 2)) {
    const name = b.categoryId ? (categories.get(b.categoryId)?.name ?? "A category") : "Your overall budget";
    const p = b.progress;
    out.push({
      id: `budget-${b.id}`,
      tone: "attention",
      text:
        p.status === "EXCEEDED"
          ? `${name} budget is over by ${money(p.remaining.replace("-", ""))}.`
          : `At the current pace, ${name.toLowerCase().startsWith("your") ? name.toLowerCase() : `${name} budget`} may be exceeded (projected ${money(p.projectedSpend ?? "0")}).`,
      basis:
        p.status === "EXCEEDED"
          ? `Spent ${money(p.spent)} against a limit of ${money(p.limit)}.`
          : `Linear projection: ${money(p.spent)} over ${p.daysElapsed} days, extended to ${p.daysInPeriod} days. Actual spending may differ.`,
    });
  }
  return out;
}
