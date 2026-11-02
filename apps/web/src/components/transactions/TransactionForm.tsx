import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fieldErrors,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  SUPPORTED_CURRENCIES,
  todayInTimeZone,
  transactionCreateSchema,
  type TransactionDTO,
} from "@finpilot/shared";
import clsx from "clsx";
import { api, ApiError } from "../../lib/api";
import { FINANCIAL_KEYS } from "../../lib/queryKeys";
import { useUser } from "../../hooks/useAuth";
import { useCategories } from "../../hooks/useCategories";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input, Select, Textarea } from "../ui/Field";
import { Alert } from "../ui/Feedback";

interface Props {
  open: boolean;
  onClose: () => void;
  transaction: TransactionDTO | null;
  initialType: "EXPENSE" | "INCOME";
}

export function TransactionFormModal({ open, onClose, transaction, initialType }: Props) {
  const user = useUser();
  const qc = useQueryClient();
  const { categories } = useCategories();
  const isEdit = Boolean(transaction);

  const [form, setForm] = useState(() => ({
    type: (transaction?.type === "INCOME" ? "INCOME" : transaction ? "EXPENSE" : initialType) as "EXPENSE" | "INCOME",
    amount: transaction ? stripZeros(transaction.amount) : "",
    currency: transaction?.currency ?? user.preferences.baseCurrency,
    transactionDate: transaction?.transactionDate ?? todayInTimeZone(user.preferences.timezone),
    categoryId: transaction?.categoryId ?? "",
    merchant: transaction?.merchant ?? "",
    description: transaction?.description ?? "",
    paymentMethod: transaction?.paymentMethod ?? "",
    notes: transaction?.notes ?? "",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const kindCategories = categories.filter((c) => c.kind === form.type);

  const mutation = useMutation({
    mutationFn: (payload: unknown) =>
      isEdit ? api.patch(`/transactions/${transaction!.id}`, payload) : api.post("/transactions", payload),
    onSuccess: () => {
      FINANCIAL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      onClose();
    },
    onError: (e) => {
      if (e instanceof ApiError && Object.keys(e.fields).length) setErrors(e.fields);
    },
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/transactions/${transaction!.id}`),
    onSuccess: () => {
      FINANCIAL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      onClose();
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      amount: form.amount.trim(),
      categoryId: form.categoryId || null,
      paymentMethod: form.paymentMethod || null,
    };
    // Same schema the API enforces — instant feedback, server re-validates.
    const parsed = transactionCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  }

  const genericError = mutation.error && !(mutation.error instanceof ApiError && Object.keys(mutation.error.fields).length)
    ? mutation.error.message
    : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit transaction" : form.type === "INCOME" ? "Add income" : "Add expense"}
      footer={
        <>
          {isEdit && (
            <Button
              variant="ghost"
              className="mr-auto text-danger hover:text-danger"
              loading={remove.isPending}
              onClick={() => {
                if (window.confirm("Delete this transaction? This cannot be undone.")) remove.mutate();
              }}
            >
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="tx-form" loading={mutation.isPending}>
            {isEdit ? "Save changes" : "Save"}
          </Button>
        </>
      }
    >
      <form id="tx-form" onSubmit={submit} className="space-y-4" noValidate>
        {transaction?.isSample && (
          <Alert tone="info">This is sample data. Edits stay labelled as sample.</Alert>
        )}
        {genericError && <Alert tone="danger">{genericError}</Alert>}

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-canvas p-1" role="radiogroup" aria-label="Transaction type">
          {(["EXPENSE", "INCOME"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={form.type === t}
              onClick={() => setForm((f) => ({ ...f, type: t, categoryId: "" }))}
              className={clsx(
                "h-9 rounded-lg text-sm font-medium transition",
                form.type === t ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink",
              )}
            >
              {t === "EXPENSE" ? "Expense" : "Income"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field label="Amount" error={errors.amount}>
            {(p) => (
              <Input {...p} inputMode="decimal" autoComplete="off" placeholder="0.00" value={form.amount}
                onChange={(e) => set("amount", e.target.value.replace(/[^\d.]/g, ""))} className="tabular text-base font-semibold" autoFocus />
            )}
          </Field>
          <Field label="Currency" error={errors.currency}>
            {(p) => (
              <Select {...p} value={form.currency} onChange={(e) => set("currency", e.target.value as typeof form.currency)}>
                {SUPPORTED_CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            )}
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date" error={errors.transactionDate}>
            {(p) => <Input {...p} type="date" value={form.transactionDate} onChange={(e) => set("transactionDate", e.target.value)} />}
          </Field>
          <Field label="Category" error={errors.categoryId}>
            {(p) => (
              <Select {...p} value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">Uncategorised</option>
                {kindCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
          </Field>
        </div>

        <Field label={form.type === "INCOME" ? "Source" : "Merchant"} error={errors.merchant} optional>
          {(p) => <Input {...p} maxLength={120} value={form.merchant} onChange={(e) => set("merchant", e.target.value)} placeholder={form.type === "INCOME" ? "e.g. Employer" : "e.g. FreshMart"} />}
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Description" error={errors.description} optional>
            {(p) => <Input {...p} maxLength={500} value={form.description} onChange={(e) => set("description", e.target.value)} />}
          </Field>
          <Field label="Payment method" error={errors.paymentMethod} optional>
            {(p) => (
              <Select {...p} value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value as typeof form.paymentMethod)}>
                <option value="">Not specified</option>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
              </Select>
            )}
          </Field>
        </div>

        <Field label="Private notes" error={errors.notes} optional hint="Encrypted at rest. Never include card numbers, CVVs, OTPs or passwords.">
          {(p) => <Textarea {...p} rows={2} maxLength={2000} value={form.notes} onChange={(e) => set("notes", e.target.value)} />}
        </Field>
      </form>
    </Modal>
  );
}

function stripZeros(amount: string): string {
  return amount.includes(".") ? amount.replace(/0+$/, "").replace(/\.$/, "") : amount;
}
