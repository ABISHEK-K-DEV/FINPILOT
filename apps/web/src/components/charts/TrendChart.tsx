import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { MonthTrendPoint } from "@finpilot/shared";
import { useFormat } from "../../hooks/useFormat";

const SERIES = [
  { key: "income", label: "Income", color: "var(--color-series-income)" },
  { key: "expenses", label: "Expenses", color: "var(--color-series-expense)" },
] as const;

/**
 * Income vs expenses per month. Values arrive as exact decimal strings; they are converted
 * to numbers ONLY for pixel geometry. Every displayed figure is formatted from the original string.
 */
export function TrendChart({ points, currency }: { points: MonthTrendPoint[]; currency: string }) {
  const f = useFormat();
  const [showTable, setShowTable] = useState(false);
  const data = points.map((p) => ({ ...p, label: f.month(p.month, "short"), incomeN: Number(p.income), expensesN: Number(p.expenses) }));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <ul className="flex gap-4 text-xs text-ink-2" aria-label="Legend">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setShowTable((v) => !v)} className="text-xs font-medium text-accent hover:underline">
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Monthly income and expenses</caption>
            <thead className="text-left text-xs text-ink-3">
              <tr><th className="py-2 font-medium">Month</th><th className="py-2 text-right font-medium">Income</th><th className="py-2 text-right font-medium">Expenses</th><th className="py-2 text-right font-medium">Net</th></tr>
            </thead>
            <tbody className="tabular divide-y divide-line">
              {points.map((p) => (
                <tr key={p.month}>
                  <td className="py-2">{f.month(p.month)}</td>
                  <td className="py-2 text-right">{f.money(p.income, currency)}</td>
                  <td className="py-2 text-right">{f.money(p.expenses, currency)}</td>
                  <td className="py-2 text-right font-medium">{f.money(p.net, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-60" role="img" aria-label="Bar chart of monthly income and expenses. Use 'Show table' for exact values.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--color-line)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--color-ink-3)", fontSize: 12 }} />
              <YAxis
                width={56}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--color-ink-3)", fontSize: 11 }}
                tickFormatter={(v: number) => f.money(String(Math.round(v)), currency, { compact: true })}
              />
              <Tooltip cursor={{ fill: "var(--color-canvas)" }} content={(props) => <TrendTooltip {...props} currency={currency} />} />
              {SERIES.map((s) => (
                <Bar key={s.key} dataKey={`${s.key}N`} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function TrendTooltip({ active, payload, currency }: Pick<TooltipContentProps<ValueType, NameType>, "active" | "payload"> & { currency: string }) {
  const f = useFormat();
  const p = payload?.[0]?.payload as (MonthTrendPoint & { label: string }) | undefined;
  if (!active || !p) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">{f.month(p.month)}</p>
      {SERIES.map((s) => (
        <p key={s.key} className="tabular flex items-center justify-between gap-4 text-ink-2">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: s.color }} />{s.label}</span>
          <span className="font-medium text-ink">{f.money(p[s.key], currency)}</span>
        </p>
      ))}
      <p className="tabular mt-1 flex justify-between gap-4 border-t border-line pt-1 text-ink-2">
        <span>Net</span><span className="font-semibold text-ink">{f.money(p.net, currency)}</span>
      </p>
    </div>
  );
}
