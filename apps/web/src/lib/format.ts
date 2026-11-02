import { formatMoney, formatMonthLabel } from "@finpilot/shared";

export function money(amount: string, currency: string, locale: string, opts?: Parameters<typeof formatMoney>[3]) {
  return formatMoney(amount, currency, locale, opts);
}

export function dateLabel(date: string, locale: string, style: "short" | "medium" = "medium"): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(style === "medium" ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function monthLabel(month: string, locale: string, style: "long" | "short" = "long") {
  return formatMonthLabel(month, locale, style);
}

export function percentLabel(value: number | null, opts: { signed?: boolean } = {}): string {
  if (value === null) return "—";
  const sign = opts.signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(Math.abs(value) >= 100 ? 0 : 1)}%`;
}
