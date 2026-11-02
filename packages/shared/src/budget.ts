/**
 * Budget progress & projection maths. Pure functions — fully unit tested.
 */
import { Decimal, MONEY_SCALE, percentage, toDecimal, type MoneyInput } from "./money.js";
import { daysInMonth, dayOfMonth, monthKeyOf } from "./dates.js";

export type BudgetStatus = "ON_TRACK" | "WARNING" | "EXCEEDED";
export type PeriodState = "PAST" | "CURRENT" | "FUTURE";

export interface BudgetProgressInput {
  /** Budget limit for the month (decimal string, > 0). */
  limit: MoneyInput;
  /** Amount spent so far in the month (decimal string, >= 0). */
  spent: MoneyInput;
  /** Month being evaluated, YYYY-MM. */
  month: string;
  /** Today's date in the user's time zone, YYYY-MM-DD. */
  today: string;
  /** Percentage of the limit at which a warning is raised (1-100). */
  warningThresholdPercent: number;
}

export interface BudgetProgress {
  limit: string;
  spent: string;
  /** limit - spent; negative when exceeded. */
  remaining: string;
  /** spent / limit * 100 (1 dp). */
  percentUsed: number;
  status: BudgetStatus;
  periodState: PeriodState;
  daysInPeriod: number;
  daysElapsed: number;
  daysRemaining: number;
  /**
   * Linear projection of month-end spend: spent / daysElapsed * daysInPeriod.
   * Equals `spent` for past months; null for future months (no data yet).
   */
  projectedSpend: string | null;
  projectedStatus: BudgetStatus | null;
  /** Remaining / daysRemaining (incl. today) when there is budget left in the current month. */
  dailyAllowance: string | null;
}

/** Status from a (display) percentage. Prefer `statusForAmounts` when exact amounts are available. */
export function statusFor(percentUsed: number, warningThresholdPercent: number): BudgetStatus {
  if (percentUsed > 100) return "EXCEEDED";
  if (percentUsed >= warningThresholdPercent) return "WARNING";
  return "ON_TRACK";
}

/**
 * Exact status from decimal amounts — never from a rounded percentage, so overspending by
 * a single paisa is still reported as EXCEEDED.
 */
export function statusForAmounts(spent: Decimal, limit: Decimal, warningThresholdPercent: number): BudgetStatus {
  if (spent.greaterThan(limit)) return "EXCEEDED";
  if (spent.greaterThanOrEqualTo(limit.times(warningThresholdPercent).dividedBy(100))) return "WARNING";
  return "ON_TRACK";
}

export function computeBudgetProgress(input: BudgetProgressInput): BudgetProgress {
  const limit = toDecimal(input.limit);
  const spent = toDecimal(input.spent);
  if (limit.lessThanOrEqualTo(0)) throw new RangeError("Budget limit must be greater than zero");
  if (spent.lessThan(0)) throw new RangeError("Spent amount cannot be negative");
  if (input.warningThresholdPercent < 1 || input.warningThresholdPercent > 100) {
    throw new RangeError("Warning threshold must be between 1 and 100");
  }

  const total = daysInMonth(input.month);
  const todayMonth = monthKeyOf(input.today);
  let periodState: PeriodState;
  let elapsed: number;
  if (todayMonth > input.month) {
    periodState = "PAST";
    elapsed = total;
  } else if (todayMonth < input.month) {
    periodState = "FUTURE";
    elapsed = 0;
  } else {
    periodState = "CURRENT";
    elapsed = dayOfMonth(input.today);
  }
  const daysRemaining = total - elapsed + (periodState === "CURRENT" ? 1 : 0);

  const remaining = limit.minus(spent);
  const percentUsed = percentage(spent, limit, 1) ?? 0;
  const status = statusForAmounts(spent, limit, input.warningThresholdPercent);

  let projected: Decimal | null = null;
  if (periodState === "PAST") projected = spent;
  else if (periodState === "CURRENT") projected = spent.dividedBy(elapsed).times(total);

  const projectedStatus =
    projected === null ? null : statusForAmounts(projected, limit, input.warningThresholdPercent);

  const dailyAllowance =
    periodState === "CURRENT" && remaining.greaterThan(0) && daysRemaining > 0
      ? remaining.dividedBy(daysRemaining).toFixed(MONEY_SCALE)
      : null;

  return {
    limit: limit.toFixed(MONEY_SCALE),
    spent: spent.toFixed(MONEY_SCALE),
    remaining: remaining.toFixed(MONEY_SCALE),
    percentUsed,
    status,
    periodState,
    daysInPeriod: total,
    daysElapsed: elapsed,
    daysRemaining: periodState === "CURRENT" ? daysRemaining : periodState === "FUTURE" ? total : 0,
    projectedSpend: projected ? projected.toFixed(MONEY_SCALE) : null,
    projectedStatus,
    dailyAllowance,
  };
}
