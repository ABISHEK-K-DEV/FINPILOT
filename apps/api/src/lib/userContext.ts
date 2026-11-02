import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE, todayInTimeZone, monthKeyOf, type CurrencyCode } from "@finpilot/shared";
import { prisma } from "./prisma.js";

export interface UserFinancialContext {
  baseCurrency: CurrencyCode;
  timezone: string;
  locale: string;
  budgetWarningPercent: number;
  today: string;
  currentMonth: string;
}

/** Preferences needed for date/currency-aware calculations. "Today" is in the user's time zone. */
export async function getUserContext(userId: string): Promise<UserFinancialContext> {
  const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
  const timezone = prefs?.timezone ?? DEFAULT_TIMEZONE;
  const today = todayInTimeZone(timezone);
  return {
    baseCurrency: (prefs?.baseCurrency ?? DEFAULT_CURRENCY) as CurrencyCode,
    timezone,
    locale: prefs?.locale ?? "en-IN",
    budgetWarningPercent: prefs?.budgetWarningPercent ?? 80,
    today,
    currentMonth: monthKeyOf(today),
  };
}
