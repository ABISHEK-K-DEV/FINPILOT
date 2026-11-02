import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths } from "@finpilot/shared";
import { useFormat } from "../../hooks/useFormat";

export function MonthSwitcher({ month, onChange, maxMonth }: { month: string; onChange: (m: string) => void; maxMonth?: string }) {
  const f = useFormat();
  const atMax = maxMonth ? month >= maxMonth : false;
  return (
    <div className="inline-flex items-center rounded-lg border border-line-strong bg-surface">
      <button type="button" className="p-2 text-ink-2 hover:text-ink" onClick={() => onChange(addMonths(month, -1))} aria-label="Previous month">
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-36 text-center text-sm font-medium" aria-live="polite">{f.month(month)}</span>
      <button type="button" className="p-2 text-ink-2 hover:text-ink disabled:opacity-30" disabled={atMax} onClick={() => onChange(addMonths(month, 1))} aria-label="Next month">
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
