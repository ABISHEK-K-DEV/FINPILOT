import { useUser } from "./useAuth";
import { money, dateLabel, monthLabel } from "../lib/format";

/** Formatting bound to the user's locale & base currency. */
export function useFormat() {
  const { preferences } = useUser();
  const { locale, baseCurrency } = preferences;
  return {
    locale,
    currency: baseCurrency,
    money: (amount: string, currency: string = baseCurrency, opts?: Parameters<typeof money>[3]) =>
      money(amount, currency, locale, opts),
    date: (d: string, style?: "short" | "medium") => dateLabel(d, locale, style),
    month: (m: string, style?: "long" | "short") => monthLabel(m, locale, style),
  };
}
