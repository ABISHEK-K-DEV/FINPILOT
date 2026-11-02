import type { CategoryTotal } from "@finpilot/shared";
import { useCategories } from "../../hooks/useCategories";
import { useFormat } from "../../hooks/useFormat";
import { CategoryIcon } from "../ui/CategoryIcon";

/**
 * Ranked horizontal bars (magnitude → one hue). Category identity is carried by the icon and name,
 * so colour is never the only cue. Exact amount and share are always labelled.
 */
export function CategoryBreakdown({ rows, currency, limit = 6 }: { rows: CategoryTotal[]; currency: string; limit?: number }) {
  const { byId } = useCategories();
  const f = useFormat();
  const shown = rows.slice(0, limit);
  const rest = rows.slice(limit);
  const max = Math.max(...shown.map((r) => r.sharePercent), 1);

  return (
    <ul className="space-y-3">
      {shown.map((r) => {
        const c = r.categoryId ? byId.get(r.categoryId) : null;
        return (
          <li key={r.categoryId ?? "none"} className="flex items-center gap-3">
            <CategoryIcon category={c} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate text-ink">{c?.name ?? "Uncategorised"}</span>
                <span className="tabular shrink-0 font-medium text-ink">{f.money(r.total, currency)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas" aria-hidden>
                  <div className="h-full rounded-full bg-[var(--color-series-expense)]" style={{ width: `${(r.sharePercent / max) * 100}%` }} />
                </div>
                <span className="tabular w-12 text-right text-xs text-ink-3">{r.sharePercent.toFixed(1)}%</span>
              </div>
            </div>
          </li>
        );
      })}
      {rest.length > 0 && (
        <li className="pl-10 text-xs text-ink-3">
          + {rest.length} more {rest.length === 1 ? "category" : "categories"} ({rest.reduce((a, r) => a + r.sharePercent, 0).toFixed(1)}%)
        </li>
      )}
    </ul>
  );
}
