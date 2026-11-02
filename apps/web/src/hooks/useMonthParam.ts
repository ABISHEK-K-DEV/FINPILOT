import { useSearchParams } from "react-router-dom";
import { isValidMonthKey, monthKeyOf, todayInTimeZone } from "@finpilot/shared";
import { useUser } from "./useAuth";

/** Selected month stored in the URL (?month=YYYY-MM) so views are shareable and survive reloads. */
export function useMonthParam() {
  const user = useUser();
  const [params, setParams] = useSearchParams();
  const currentMonth = monthKeyOf(todayInTimeZone(user.preferences.timezone));
  const raw = params.get("month");
  const month = raw && isValidMonthKey(raw) ? raw : currentMonth;
  const setMonth = (m: string) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (m === currentMonth) next.delete("month");
      else next.set("month", m);
      next.delete("page");
      return next;
    });
  return { month, setMonth, currentMonth, isCurrent: month === currentMonth };
}
