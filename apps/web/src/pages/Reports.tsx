import { useQuery } from "@tanstack/react-query";
import { Download, FileBarChart } from "lucide-react";
import { addMonths, compare, compareAmounts, type MonthlyReportDTO, type TrendDTO } from "@finpilot/shared";
import { api, downloadFile, qs } from "../lib/api";
import { qk } from "../lib/queryKeys";
import { percentLabel } from "../lib/format";
import { useFormat } from "../hooks/useFormat";
import { useCategories } from "../hooks/useCategories";
import { useMonthParam } from "../hooks/useMonthParam";
import { Card, CardHeader, PageHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";
import { MonthSwitcher } from "../components/ui/MonthSwitcher";
import { StatTile } from "../components/ui/StatTile";
import { CategoryIcon } from "../components/ui/CategoryIcon";
import { TrendChart } from "../components/charts/TrendChart";
import { CategoryBreakdown } from "../components/charts/CategoryBreakdown";
import { TransactionRow } from "../components/transactions/TransactionRow";
import { useTransactionEditor } from "../components/transactions/TransactionEditor";

export default function ReportsPage() {
  const f = useFormat();
  const { byId } = useCategories();
  const editor = useTransactionEditor();
  const { month, setMonth, currentMonth, isCurrent } = useMonthParam();

  const report = useQuery({ queryKey: qk.report(month), queryFn: () => api.get<{ report: MonthlyReportDTO }>(`/reports/monthly${qs({ month })}`) });
  const trend = useQuery({ queryKey: qk.trend(month, 12), queryFn: () => api.get<TrendDTO>(`/reports/trend${qs({ month, months: 12 })}`) });

  const header = (
    <PageHeader
      title="Monthly report"
      description={isCurrent ? "Month to date. Figures update as you record transactions." : "A complete view of the month."}
      actions={<>
        <MonthSwitcher month={month} onChange={setMonth} maxMonth={currentMonth} />
        <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => downloadFile(`/reports/monthly.csv?month=${month}`, `finpilot-${month}.csv`)}>CSV</Button>
      </>}
    />
  );

  if (report.isPending) return <>{header}<Skeleton className="h-96" /></>;
  if (report.isError) return <>{header}<Card><ErrorState error={report.error} onRetry={() => report.refetch()} /></Card></>;

  const r = report.data.report;
  const s = r.summary;
  const cur = s.currency;
  const money = (a: string) => f.money(a, cur);

  // Category comparison: union of categories in either month.
  const prevByCat = new Map(r.previous.expensesByCategory.map((c) => [c.categoryId, c.total]));
  const curByCat = new Map(s.expensesByCategory.map((c) => [c.categoryId, c.total]));
  const allCats = [...new Set([...curByCat.keys(), ...prevByCat.keys()])];
  const comparison = allCats
    .map((id) => ({ id, ...compareAmounts(curByCat.get(id) ?? "0", prevByCat.get(id) ?? "0") }))
    .sort((a, b) => compare(b.current, a.current));

  return (
    <>
      {header}
      {r.sampleTransactionCount > 0 && (
        <p className="mb-4 text-xs text-ink-3">Includes {r.sampleTransactionCount} sample transactions.</p>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Expenses" value={money(s.expenses)} sub={`${s.expenseCount} transactions`} />
        <StatTile label="Income" value={money(s.income)} sub={`${s.incomeCount} entries`} />
        <StatTile label="Net" value={money(s.net)} tone={s.net.startsWith("-") ? "attention" : "neutral"} sub={s.savingsRatePercent === null ? "No income recorded" : `${percentLabel(s.savingsRatePercent)} savings rate`} />
        <StatTile label="vs previous month" value={percentLabel(r.expenseChange.percentChange, { signed: true })}
          sub={r.expenseChange.percentChange === null ? "No expenses last month" : `${money(r.expenseChange.previous)} last month`} />
      </div>
      {s.excludedOtherCurrencyCount > 0 && (
        <p className="mt-3 text-xs text-ink-3">{s.excludedOtherCurrencyCount} transaction(s) in other currencies are excluded from {cur} totals.</p>
      )}

      {s.transactionCount === 0 ? (
        <Card className="mt-4"><EmptyState icon={<FileBarChart className="size-5" />} title={`No ${cur} transactions in ${f.month(month)}`} description="Reports are generated only from transactions you've recorded." /></Card>
      ) : (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Spending by category" />
              {s.expensesByCategory.length ? <CategoryBreakdown rows={s.expensesByCategory} currency={cur} limit={10} /> : <EmptyState title="No expenses" />}
            </Card>
            <Card>
              <CardHeader title="Category change" subtitle={`${f.month(month, "short")} vs ${f.month(addMonths(month, -1), "short")}`} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-ink-3">
                    <tr><th className="pb-2 font-medium">Category</th><th className="pb-2 text-right font-medium">This month</th><th className="pb-2 text-right font-medium">Previous</th><th className="pb-2 text-right font-medium">Change</th></tr>
                  </thead>
                  <tbody className="tabular divide-y divide-line">
                    {comparison.map((c) => {
                      const cat = c.id ? byId.get(c.id) : null;
                      const up = c.difference.startsWith("-") ? false : c.difference !== "0.0000";
                      return (
                        <tr key={c.id ?? "none"}>
                          <td className="py-2"><span className="flex items-center gap-2"><CategoryIcon category={cat} size="sm" /><span className="truncate">{cat?.name ?? "Uncategorised"}</span></span></td>
                          <td className="py-2 text-right">{money(c.current)}</td>
                          <td className="py-2 text-right text-ink-3">{money(c.previous)}</td>
                          <td className={`py-2 text-right ${up ? "text-warning" : c.difference.startsWith("-") ? "text-positive" : "text-ink-3"}`}>
                            {c.percentChange === null ? (up ? "New" : "—") : percentLabel(c.percentChange, { signed: true })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {isCurrent && <p className="mt-3 text-xs text-ink-3">The current month is incomplete, so increases may look smaller than they will be.</p>}
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Largest expenses" />
              {r.largestExpenses.length ? (
                <ul className="-mx-2">{r.largestExpenses.map((t) => <TransactionRow key={t.id} tx={t} onClick={() => editor.openEdit(t)} />)}</ul>
              ) : <EmptyState title="No expenses" />}
            </Card>
            <Card>
              <CardHeader title="Income sources" />
              {s.incomeByCategory.length ? <CategoryBreakdown rows={s.incomeByCategory} currency={cur} /> : <EmptyState title="No income recorded this month" />}
            </Card>
          </div>
        </>
      )}

      <Card className="mt-4">
        <CardHeader title="12-month trend" />
        {trend.isPending ? <Skeleton className="h-60" /> : trend.isError ? <ErrorState error={trend.error} onRetry={() => trend.refetch()} /> : <TrendChart points={trend.data.points} currency={trend.data.currency} />}
      </Card>
    </>
  );
}


