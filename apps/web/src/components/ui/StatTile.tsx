import type { ReactNode } from "react";
import clsx from "clsx";

export function StatTile({ label, value, sub, tone = "neutral", icon }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "neutral" | "positive" | "attention"; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between text-ink-3">
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
        {icon}
      </div>
      <p className={clsx("tabular mt-2 text-xl font-semibold tracking-tight sm:text-2xl", tone === "positive" && "text-positive", tone === "attention" && "text-warning")}>{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-3">{sub}</p>}
    </div>
  );
}
