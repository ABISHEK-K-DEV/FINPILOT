/**
 * Decimal-safe money utilities.
 *
 * Rules:
 *  - Monetary values travel through the system as decimal STRINGS (e.g. "1499.50"),
 *    never as JavaScript floating-point numbers.
 *  - All arithmetic goes through decimal.js. Never use `+`, `-`, `*`, `/` on amounts.
 *  - Storage precision is 4 decimal places (Postgres NUMERIC(19,4)); presentation is
 *    rounded to the currency's minor units (e.g. 2 for INR, 0 for JPY).
 */
import { Decimal as DecimalLib } from "decimal.js";

export const Decimal = DecimalLib.clone({
  precision: 40,
  rounding: DecimalLib.ROUND_HALF_UP,
  toExpNeg: -30,
  toExpPos: 30,
});
export type Decimal = InstanceType<typeof Decimal>;

/** Storage scale (decimal places) used for amounts in the database. */
export const MONEY_SCALE = 4;

/** Maximum absolute amount accepted for a single record (13 integer digits). */
export const MAX_AMOUNT = "9999999999999.9999";

export type MoneyInput = string | Decimal;

/** Strict pattern for a non-negative decimal amount string (max 13 int digits, 4 decimals). */
export const AMOUNT_PATTERN = /^(?:0|[1-9]\d{0,12})(?:\.\d{1,4})?$/;

export function isValidAmountString(value: string): boolean {
  return AMOUNT_PATTERN.test(value);
}

export function toDecimal(value: MoneyInput): Decimal {
  if (value instanceof Decimal) return value;
  if (typeof value !== "string") {
    throw new TypeError("Money values must be decimal strings, not numbers");
  }
  const trimmed = value.trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    throw new RangeError(`Invalid money value: "${value}"`);
  }
  return new Decimal(trimmed);
}

export function add(a: MoneyInput, b: MoneyInput): string {
  return toDecimal(a).plus(toDecimal(b)).toFixed(MONEY_SCALE);
}

export function subtract(a: MoneyInput, b: MoneyInput): string {
  return toDecimal(a).minus(toDecimal(b)).toFixed(MONEY_SCALE);
}

export function sum(values: readonly MoneyInput[]): string {
  return values.reduce<Decimal>((acc, v) => acc.plus(toDecimal(v)), new Decimal(0)).toFixed(MONEY_SCALE);
}

/** Multiply an amount by a plain decimal factor (e.g. a quantity or a ratio given as a string). */
export function multiply(amount: MoneyInput, factor: string | number): string {
  const f = typeof factor === "number" ? new Decimal(String(factor)) : toDecimal(factor);
  return toDecimal(amount).times(f).toFixed(MONEY_SCALE);
}

/** Divide an amount; returns null when dividing by zero. */
export function divide(amount: MoneyInput, divisor: MoneyInput | number): string | null {
  const d = typeof divisor === "number" ? new Decimal(String(divisor)) : toDecimal(divisor);
  if (d.isZero()) return null;
  return toDecimal(amount).dividedBy(d).toFixed(MONEY_SCALE);
}

export function compare(a: MoneyInput, b: MoneyInput): -1 | 0 | 1 {
  return toDecimal(a).comparedTo(toDecimal(b)) as -1 | 0 | 1;
}

export function isZero(a: MoneyInput): boolean {
  return toDecimal(a).isZero();
}

export function isPositive(a: MoneyInput): boolean {
  return toDecimal(a).greaterThan(0);
}

export function isNegative(a: MoneyInput): boolean {
  return toDecimal(a).lessThan(0);
}

/**
 * Percentage `part / whole * 100`, rounded to `decimals` places.
 * Returned as a JS number because percentages are display/ratio values, not money.
 * Returns null when `whole` is zero.
 */
export function percentage(part: MoneyInput, whole: MoneyInput, decimals = 1): number | null {
  const w = toDecimal(whole);
  if (w.isZero()) return null;
  return toDecimal(part).dividedBy(w).times(100).toDecimalPlaces(decimals).toNumber();
}

/** Number of minor-unit digits for an ISO-4217 currency (INR → 2, JPY → 0). */
export function currencyMinorUnits(currency: string): number {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

/** Round an amount to the currency's minor units using half-up rounding. */
export function roundToCurrency(amount: MoneyInput, currency: string): string {
  return toDecimal(amount).toFixed(currencyMinorUnits(currency));
}

/** Normalise any accepted amount to storage precision. */
export function normaliseAmount(amount: MoneyInput): string {
  return toDecimal(amount).toFixed(MONEY_SCALE);
}

/**
 * Locale-aware currency formatting. The value is rounded with decimal.js first and the
 * resulting exact string is handed to Intl (which accepts decimal strings losslessly).
 */
export function formatMoney(
  amount: MoneyInput,
  currency: string,
  locale = "en-IN",
  options: { compact?: boolean; signDisplay?: "auto" | "always" | "exceptZero" | "never" } = {},
): string {
  const rounded = roundToCurrency(amount, currency);
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: options.compact ? "compact" : "standard",
    signDisplay: options.signDisplay ?? "auto",
    maximumFractionDigits: options.compact ? 1 : currencyMinorUnits(currency),
  });
  // Intl.NumberFormat.prototype.format accepts numeric strings (ES2023) without float conversion.
  return formatter.format(rounded as unknown as number);
}
