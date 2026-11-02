import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, CalendarClock, FlaskConical, Info, Lightbulb, Plus, Target, Wallet } from "lucide-react";
import clsx from "clsx";
import type { DashboardDTO } from "@finpilot/shared";
import { api, qs } from "../lib/api";
import { FINANCIAL_KEYS, qk } from "../lib/queryKeys";
import { percentLabel } from "../lib/format";
import { buildObservations } from "../lib/insights";
import { useUser } from "../hooks/useAuth";
import { useFormat } from "../hooks/useFormat";
import { useCategories } from "../hooks/useCategories";
import { useMonthParam } from "../hooks/useMonthParam";
import { Card, CardHeader, PageHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorState, ProgressBar, Skeleton } from "../components/ui/Feedback";
import { MonthSwitcher } from "../components/ui/MonthSwitcher";
import { StatTile } from "../components/ui/StatTile";
import { TrendChart } from "../components/charts/TrendChart";
import { CategoryBreakdown } from "../components/charts/CategoryBreakdown";
import { TransactionRow } from "../components/transactions/TransactionRow";
import { useTransactionEditor } from "../components/transactions/TransactionEditor";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const user = useUser();
  const f = useFormat();
  const { byId } = useCategories();
  const editor = useTransactionEditor();
  const { month, setMonth, currentMonth, isCurrent } = useMonthParam();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: qk.dashboard(month),
    queryFn: () => api.get<DashboardDTO>(`/dashboard${qs({ month })}`),
  });
  const loadSample = useMutation({
    mutationFn: () => api.post("/me/sample-data"),
    onSuccess: () => FINANCIAL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: k })),
  });

  const header = (
    <PageHeader
      title={`${greeting()}, ${user.name.split(" ")[0]}`}
      description={isCurrent ? "Here's where your month stands." : `Looking back at ${f.month(month)}.`}
      actions={<MonthSwitcher month={month} onChange={setMonth} maxMonth={currentMonth} />}
    />
  );

  if (q.isPending) return <>{header}<DashboardSkeleton /></>;
  if (q.isError) return <>{header}<Card><ErrorState error={q.error} onRetry={() => q.refetch()} /></Card></>;

  const d = q.data;
  const s = d.report.summary;
  const money = (a: string) => f.money(a, d.currency);

  if (!d.hasAnyTransactions) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={<Wallet className="size-6" />}
            title="Your dashboard fills in as you record money in and out"
            description="FinPilot never shows invented numbers. Add your first expense or income to see spending, categories and budgets — or explore with clearly-labelled sample data you can remove anytime."
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button icon={<Plus className="size-4" />} onClick={() => editor.openNew()}>Add an expense</Button>
                <Button variant="secondary" icon={<FlaskConical className="size-4" />} loading={loadSample.isPending} onClick={() => loadSample.mutate()}>
                  Explore with sample data
                </Button>
              </div>
            }
          />
        </Card>
        <UpcomingCard />
      </>
    );
  }

  const ch = d.report.expenseChange;
  const observations = buildObservations(d.report, d.budgets, byId, money, isCurrent);

  return (
    <>
      {header}
      {s.excludedOtherCurrencyCount > 0 && (
        <p className="mb-4 flex items-start gap-2 rounded-xl bg-canvas p-3 text-xs text-ink-2 ring-1 ring-line">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {s.excludedOtherCurrencyCount} transaction{s.excludedOtherCurrencyCount === 1 ? " is" : "s are"} in another currency and {s.excludedOtherCurrencyCount === 1 ? "is" : "are"} not included in these {d.currency} totals. Currency conversion is not applied automatically.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={isCurrent ? "Spent so far" : "Spent"}
          value={money(s.expenses)}
          sub={
            ch.percentChange === null ? "No spending recorded last month" : isCurrent ? (
              // A partial month vs a full month is not a fair percentage comparison.
              `Last month: ${money(ch.previous)}`
            ) : (
              <span className="inline-flex items-center gap-1">
                {ch.percentChange > 0 ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
                {percentLabel(ch.percentChange, { signed: true })} vs last month
              </span>
            )
          }
        />
        <StatTile label="Income" value={money(s.income)} sub={`${s.incomeCount} entr${s.incomeCount === 1 ? "y" : "ies"} recorded`} />
        <StatTile
          label="Net"
          value={money(s.net)}
          tone={s.net.startsWith("-") ? "attention" : s.income !== "0.0000" ? "positive" : "neutral"}
          sub={s.savingsRatePercent === null ? "Add income to see your savings rate" : `${percentLabel(s.savingsRatePercent)} of income kept`}
        />
        <StatTile
          label="Daily average"
          value={d.report.averageDailyExpense ? money(d.report.averageDailyExpense) : "—"}
          sub={isCurrent ? `Over ${d.today.slice(8, 10).replace(/^0/, "")} days so far` : "Across the full month"}
        />
      </div>

      {observations.length > 0 && (
        <Card className="mt-4">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Lightbulb className="size-4 text-accent" aria-hidden />What your records show</span>} subtitle="Calculated from your own entries. Expand any line to see how." />
          <ul className="space-y-2">
            {observations.map((o) => (
              <li key={o.id}>
                <details className="group rounded-xl bg-canvas px-3 py-2.5">
                  <summary className="flex cursor-pointer list-none items-start gap-2 text-sm text-ink">
                    <span className={clsx("mt-1.5 size-2 shrink-0 rounded-full", o.tone === "positive" ? "bg-positive" : o.tone === "attention" ? "bg-warning" : "bg-ink-3")} aria-hidden />
                    <span className="flex-1">{o.text}</span>
                    <span className="text-xs text-ink-3 group-open:hidden">How?</span>
                  </summary>
                  <p className="mt-1.5 pl-4 text-xs text-ink-3">{o.basis}</p>
                </details>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Income vs expenses" subtitle="Last 6 months" />
          <TrendChart points={d.trend} currency={d.currency} />
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Where it went" subtitle={f.month(month)} action={<Link to={`/app/reports${isCurrent ? "" : `?month=${month}`}`} className="text-xs font-medium text-accent">Full report</Link>} />
          {s.expensesByCategory.length ? <CategoryBreakdown rows={s.expensesByCategory} currency={d.currency} /> : <EmptyState title="No expenses this month" />}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Budgets" subtitle={f.month(month)} action={<Link to="/app/budgets" className="text-xs font-medium text-accent">Manage</Link>} />
          {d.budgets.length === 0 ? (
            <EmptyState icon={<Target className="size-5" />} title="No budgets yet" description="Set a monthly limit for a category to get warnings before you overspend." action={<Link to="/app/budgets" className="text-sm font-medium text-accent">Create a budget</Link>} />
          ) : (
            <ul className="space-y-4">
              {d.budgets.slice(0, 5).map((b) => {
                const name = b.categoryId ? (byId.get(b.categoryId)?.name ?? "Category") : "Overall";
                return (
                  <li key={b.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{name}</span>
                      <span className="tabular shrink-0 text-ink-3">{money(b.progress.spent)} / {money(b.progress.limit)}</span>
                    </div>
                    <ProgressBar percent={b.progress.percentUsed} status={b.progress.status} label={`${name} budget used`} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="Recent transactions" action={<Link to="/app/transactions" className="text-xs font-medium text-accent">View all</Link>} />
          <ul className="-mx-2">
            {d.recentTransactions.map((t) => <TransactionRow key={t.id} tx={t} onClick={() => editor.openEdit(t)} />)}
          </ul>
        </Card>
      </div>

      <UpcomingCard />
    </>
  );
}

function UpcomingCard() {
  return (
    <Card className="mt-4">
      <CardHeader title={<span className="inline-flex items-center gap-2"><CalendarClock className="size-4 text-ink-3" aria-hidden />Upcoming bills, renewals & recurring payments</span>} />
      <p className="text-sm text-ink-3">
        Subscription detection, bill due dates and the financial calendar arrive in upcoming milestones. Until then this space stays empty — we won't estimate commitments we can't see in your records.
      </p>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      <div className="grid gap-4 lg:grid-cols-5"><Skeleton className="h-72 lg:col-span-3" /><Skeleton className="h-72 lg:col-span-2" /></div>
    </div>
  );
}
