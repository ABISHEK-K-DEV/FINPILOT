import type { TransactionDTO } from "@finpilot/shared";
import { PAYMENT_METHOD_LABELS } from "@finpilot/shared";
import clsx from "clsx";
import { useCategories } from "../../hooks/useCategories";
import { useFormat } from "../../hooks/useFormat";
import { CategoryIcon } from "../ui/CategoryIcon";
import { SampleBadge } from "../ui/Feedback";

export function TransactionRow({ tx, onClick, showDate = true }: { tx: TransactionDTO; onClick?: () => void; showDate?: boolean }) {
  const { byId } = useCategories();
  const f = useFormat();
  const category = tx.categoryId ? byId.get(tx.categoryId) : null;
  const title = tx.merchant || tx.description || category?.name || (tx.type === "INCOME" ? "Income" : "Expense");
  const meta = [category?.name ?? "Uncategorised", tx.paymentMethod ? PAYMENT_METHOD_LABELS[tx.paymentMethod] : null, showDate ? f.date(tx.transactionDate) : null]
    .filter(Boolean)
    .join(" · ");
  const isIncome = tx.type === "INCOME";
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-canvas">
        <CategoryIcon category={category} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-ink">{title}</p>
            {tx.isSample && <SampleBadge />}
          </div>
          <p className="truncate text-xs text-ink-3">{meta}</p>
        </div>
        <p className={clsx("tabular shrink-0 text-sm font-semibold", isIncome ? "text-positive" : "text-ink")}>
          {isIncome ? "+" : "−"}
          {f.money(tx.amount, tx.currency)}
        </p>
      </button>
    </li>
  );
}
