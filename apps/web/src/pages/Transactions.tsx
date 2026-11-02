import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Download, ListOrdered, Plus, Search } from "lucide-react";
import type { Paginated, TransactionDTO } from "@finpilot/shared";
import { api, downloadFile, qs } from "../lib/api";
import { qk } from "../lib/queryKeys";
import { useFormat } from "../hooks/useFormat";
import { useCategories } from "../hooks/useCategories";
import { useMonthParam } from "../hooks/useMonthParam";
import { Card, PageHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Select } from "../components/ui/Field";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/Feedback";
import { MonthSwitcher } from "../components/ui/MonthSwitcher";
import { TransactionRow } from "../components/transactions/TransactionRow";
import { useTransactionEditor } from "../components/transactions/TransactionEditor";

export default function TransactionsPage() {
  const f = useFormat();
  const editor = useTransactionEditor();
  const { categories } = useCategories();
  const { month, setMonth, currentMonth } = useMonthParam();
  const [params, setParams] = useSearchParams();

  const type = params.get("type") ?? "";
  const categoryId = params.get("category") ?? "";
  const sort = params.get("sort") ?? "date_desc";
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const [search, setSearch] = useState(params.get("q") ?? "");

  const update = (key: string, value: string) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (value) next.set(key, value); else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });

  // Debounce search into the URL.
  useEffect(() => {
    const t = setTimeout(() => { if ((params.get("q") ?? "") !== search) update("q", search.trim()); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const query = { month, type, categoryId, search: params.get("q") ?? "", sort, page, pageSize: 25 };
  const q = useQuery({
    queryKey: qk.transactions(query),
    queryFn: () => api.get<Paginated<TransactionDTO>>(`/transactions${qs(query)}`),
    placeholderData: keepPreviousData,
  });

  const groups = new Map<string, TransactionDTO[]>();
  for (const t of q.data?.items ?? []) {
    const key = sort.startsWith("date") ? t.transactionDate : "all";
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const hasFilters = Boolean(type || categoryId || query.search);

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every expense and income entry you've recorded."
        actions={
          <>
            <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => downloadFile(`/reports/monthly.csv?month=${month}`, `finpilot-${month}.csv`)}>
              Export CSV
            </Button>
            <Button icon={<Plus className="size-4" />} onClick={() => editor.openNew()}>Add</Button>
          </>
        }
      />

      <Card className="mb-4" padded={false}>
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <MonthSwitcher month={month} onChange={setMonth} maxMonth={currentMonth} />
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
            <Input aria-label="Search merchant, description or tag" placeholder="Search merchant, description, tag" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2 lg:flex">
            <Select aria-label="Type" value={type} onChange={(e) => update("type", e.target.value)} className="lg:w-32">
              <option value="">All types</option>
              <option value="EXPENSE">Expenses</option>
              <option value="INCOME">Income</option>
            </Select>
            <Select aria-label="Category" value={categoryId} onChange={(e) => update("category", e.target.value)} className="lg:w-44">
              <option value="">All categories</option>
              <option value="uncategorised">Uncategorised</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select aria-label="Sort" value={sort} onChange={(e) => update("sort", e.target.value)} className="lg:w-40">
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="amount_desc">Largest first</option>
              <option value="amount_asc">Smallest first</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        {q.isPending ? (
          <div className="space-y-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : q.data.items.length === 0 ? (
          <EmptyState
            icon={<ListOrdered className="size-5" />}
            title={hasFilters ? "No transactions match these filters" : `Nothing recorded for ${f.month(month)}`}
            description={hasFilters ? "Try clearing the search or filters." : "Add an expense or income entry to start building your picture."}
            action={hasFilters
              ? <Button variant="secondary" size="sm" onClick={() => { setSearch(""); setParams(month === currentMonth ? {} : { month }); }}>Clear filters</Button>
              : <Button size="sm" icon={<Plus className="size-4" />} onClick={() => editor.openNew()}>Add transaction</Button>}
          />
        ) : (
          <>
            <p className="mb-2 text-xs text-ink-3">{q.data.total} transaction{q.data.total === 1 ? "" : "s"}</p>
            <div className="space-y-4">
              {[...groups.entries()].map(([key, txs]) => (
                <div key={key}>
                  {key !== "all" && <h3 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-ink-3">{f.date(key)}</h3>}
                  <ul className="-mx-2">
                    {txs.map((t) => <TransactionRow key={t.id} tx={t} showDate={key === "all"} onClick={() => editor.openEdit(t)} />)}
                  </ul>
                </div>
              ))}
            </div>
            {q.data.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => update("page", String(page - 1))}>Previous</Button>
                <span className="text-sm text-ink-3">Page {page} of {q.data.totalPages}</span>
                <Button variant="secondary" size="sm" disabled={page >= q.data.totalPages} onClick={() => update("page", String(page + 1))}>Next</Button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}
