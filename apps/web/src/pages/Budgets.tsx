import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Pencil, Plus, Target, TrendingUp, XCircle } from "lucide-react";
import { budgetCreateSchema, fieldErrors, type BudgetWithProgressDTO, type BudgetStatus } from "@finpilot/shared";
import { api, ApiError, qs } from "../lib/api";
import { FINANCIAL_KEYS, qk } from "../lib/queryKeys";
import { useFormat } from "../hooks/useFormat";
import { useCategories } from "../hooks/useCategories";
import { useMonthParam } from "../hooks/useMonthParam";
import { Card, PageHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Select } from "../components/ui/Field";
import { Alert, Badge, EmptyState, ErrorState, ProgressBar, SampleBadge, Skeleton } from "../components/ui/Feedback";
import { Modal } from "../components/ui/Modal";
import { MonthSwitcher } from "../components/ui/MonthSwitcher";
import { CategoryIcon } from "../components/ui/CategoryIcon";

const STATUS: Record<BudgetStatus, { label: string; tone: "success" | "warning" | "danger"; icon: typeof CheckCircle2 }> = {
  ON_TRACK: { label: "On track", tone: "success", icon: CheckCircle2 },
  WARNING: { label: "Near limit", tone: "warning", icon: AlertTriangle },
  EXCEEDED: { label: "Over budget", tone: "danger", icon: XCircle },
};

export default function BudgetsPage() {
  const { month, setMonth, currentMonth } = useMonthParam();
  const [editing, setEditing] = useState<BudgetWithProgressDTO | "new" | null>(null);
  const q = useQuery({
    queryKey: qk.budgets(month),
    queryFn: () => api.get<{ month: string; currency: string; items: BudgetWithProgressDTO[] }>(`/budgets${qs({ month })}`),
  });

  return (
    <>
      <PageHeader
        title="Budgets"
        description="Monthly limits that repeat every month. Progress is calculated from your recorded expenses."
        actions={<>
          <MonthSwitcher month={month} onChange={setMonth} maxMonth={currentMonth} />
          <Button icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>New budget</Button>
        </>}
      />
      {q.isPending ? (
        <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : q.isError ? (
        <Card><ErrorState error={q.error} onRetry={() => q.refetch()} /></Card>
      ) : q.data.items.length === 0 ? (
        <Card>
          <EmptyState icon={<Target className="size-5" />} title="No budgets yet"
            description="Start with an overall monthly limit, or pick the categories you want to keep an eye on — like food or shopping."
            action={<Button icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>Create your first budget</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {q.data.items.map((b) => <BudgetCard key={b.id} budget={b} onEdit={() => setEditing(b)} />)}
        </div>
      )}
      {editing && (
        <BudgetModal
          budget={editing === "new" ? null : editing}
          existing={q.data?.items ?? []}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function BudgetCard({ budget: b, onEdit }: { budget: BudgetWithProgressDTO; onEdit: () => void }) {
  const f = useFormat();
  const { byId } = useCategories();
  const category = b.categoryId ? byId.get(b.categoryId) : null;
  const p = b.progress;
  const st = STATUS[p.status];
  const money = (a: string) => f.money(a, b.currency);

  return (
    <Card>
      <div className="flex items-start gap-3">
        {category ? <CategoryIcon category={category} /> : <span className="inline-flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent"><Target className="size-4" aria-hidden /></span>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{category?.name ?? "Overall spending"}</h2>
            {b.isSample && <SampleBadge />}
          </div>
          <p className="text-xs text-ink-3">Warns at {b.alertThresholdPercent}% · {money(p.limit)} per month</p>
        </div>
        <button onClick={onEdit} className="rounded-lg p-1.5 text-ink-3 hover:bg-canvas hover:text-ink" aria-label={`Edit ${category?.name ?? "overall"} budget`}>
          <Pencil className="size-4" />
        </button>
      </div>

      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <p className="tabular text-2xl font-semibold">{money(p.spent)}</p>
          <p className="text-xs text-ink-3">spent of {money(p.limit)}</p>
        </div>
        <Badge tone={st.tone}><st.icon className="size-3" aria-hidden />{st.label}</Badge>
      </div>
      <div className="mt-3"><ProgressBar percent={p.percentUsed} status={p.status} label={`${category?.name ?? "Overall"} budget used`} /></div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-ink-3">{p.remaining.startsWith("-") ? "Over by" : "Remaining"}</dt>
          <dd className={`tabular font-medium ${p.remaining.startsWith("-") ? "text-danger" : ""}`}>{money(p.remaining.replace("-", ""))}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-3">Used</dt>
          <dd className="tabular font-medium">{p.percentUsed.toFixed(1)}%</dd>
        </div>
        {p.periodState === "CURRENT" && (
          <>
            <div>
              <dt className="text-xs text-ink-3">Projected month-end</dt>
              <dd className={`tabular font-medium ${p.projectedStatus === "EXCEEDED" ? "text-warning" : ""}`}>
                {p.projectedSpend ? money(p.projectedSpend) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-3">Daily allowance</dt>
              <dd className="tabular font-medium">{p.dailyAllowance ? money(p.dailyAllowance) : "—"}</dd>
            </div>
          </>
        )}
      </dl>
      {p.periodState === "CURRENT" && p.projectedStatus === "EXCEEDED" && p.status !== "EXCEEDED" && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-warning-soft p-2.5 text-xs text-warning">
          <TrendingUp className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          At your current pace ({p.daysElapsed} of {p.daysInPeriod} days), this budget may be exceeded. This is a simple linear projection, not a prediction.
        </p>
      )}
    </Card>
  );
}

function BudgetModal({ budget, existing, onClose }: { budget: BudgetWithProgressDTO | null; existing: BudgetWithProgressDTO[]; onClose: () => void }) {
  const f = useFormat();
  const qc = useQueryClient();
  const { categories, byId } = useCategories();
  const taken = new Set(existing.map((b) => b.categoryId ?? "OVERALL"));
  const options = categories.filter((c) => c.kind === "EXPENSE" && !taken.has(c.id));
  const [form, setForm] = useState({
    scope: budget ? (budget.categoryId ?? "OVERALL") : taken.has("OVERALL") ? (options[0]?.id ?? "") : "OVERALL",
    amount: budget ? budget.amount.replace(/\.?0+$/, "") : "",
    alertThresholdPercent: String(budget?.alertThresholdPercent ?? 80),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const done = () => { FINANCIAL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: k })); onClose(); };
  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => (budget ? api.patch(`/budgets/${budget.id}`, body) : api.post("/budgets", body)),
    onSuccess: done,
    onError: (e) => e instanceof ApiError && setErrors(e.fields),
  });
  const remove = useMutation({ mutationFn: () => api.delete(`/budgets/${budget!.id}`), onSuccess: done });

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = budgetCreateSchema.safeParse({
      categoryId: form.scope === "OVERALL" ? null : form.scope || null,
      amount: form.amount.trim(),
      alertThresholdPercent: form.alertThresholdPercent,
    });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    save.mutate(budget ? { amount: parsed.data.amount, alertThresholdPercent: parsed.data.alertThresholdPercent } : parsed.data);
  }

  const scopeName = budget ? (budget.categoryId ? (byId.get(budget.categoryId)?.name ?? "Category") : "Overall spending") : null;
  const generic = save.error && !(save.error instanceof ApiError && Object.keys(save.error.fields).length) ? save.error.message : null;

  return (
    <Modal open onClose={onClose} title={budget ? `Edit ${scopeName} budget` : "New monthly budget"}
      footer={<>
        {budget && <Button variant="ghost" className="mr-auto text-danger" loading={remove.isPending} onClick={() => window.confirm("Delete this budget?") && remove.mutate()}>Delete</Button>}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="budget-form" loading={save.isPending}>Save budget</Button>
      </>}>
      <form id="budget-form" onSubmit={submit} className="space-y-4" noValidate>
        {generic && <Alert tone="danger">{generic}</Alert>}
        {!budget && (
          <Field label="Applies to" error={errors.categoryId}>
            {(p) => (
              <Select {...p} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
                {!taken.has("OVERALL") && <option value="OVERALL">All expenses (overall)</option>}
                {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
          </Field>
        )}
        <Field label={`Monthly limit (${f.currency})`} error={errors.amount}>
          {(p) => <Input {...p} inputMode="decimal" value={form.amount} placeholder="e.g. 5000" className="tabular" autoFocus
            onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, "") })} />}
        </Field>
        <Field label="Warn me at" error={errors.alertThresholdPercent} hint="You'll see a warning when spending reaches this share of the limit.">
          {(p) => (
            <Select {...p} value={form.alertThresholdPercent} onChange={(e) => setForm({ ...form, alertThresholdPercent: e.target.value })}>
              {[50, 60, 70, 75, 80, 90, 100].map((v) => <option key={v} value={v}>{v}% of the limit</option>)}
            </Select>
          )}
        </Field>
        {budget?.isSample && <p className="text-xs text-ink-3">Changing the limit converts this sample budget into your own.</p>}
      </form>
    </Modal>
  );
}
