import type { ReactNode } from "react";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle, FlaskConical } from "lucide-react";
import { Button } from "./Button";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-ink-3" role="status">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-lg bg-line/70", className)} aria-hidden />;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      {icon && <div className="mb-3 rounded-full bg-accent-soft p-3 text-accent">{icon}</div>}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-3">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center" role="alert">
      <XCircle className="mb-2 size-6 text-danger" aria-hidden />
      <p className="text-sm font-medium text-ink">We couldn't load this</p>
      <p className="mt-1 text-sm text-ink-3">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

type Tone = "info" | "success" | "warning" | "danger" | "neutral" | "sample";
const tones: Record<Tone, string> = {
  info: "bg-accent-soft text-accent-strong",
  success: "bg-positive-soft text-positive",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-canvas text-ink-2 border border-line",
  sample: "bg-violet-50 text-violet-700 border border-violet-200",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function SampleBadge() {
  return (
    <Badge tone="sample" className="shrink-0">
      <FlaskConical className="size-3" aria-hidden /> Sample
    </Badge>
  );
}

const alertIcons = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle } as const;
export function Alert({ tone = "info", title, children, action }: { tone?: keyof typeof alertIcons; title?: string; children?: ReactNode; action?: ReactNode }) {
  const Icon = alertIcons[tone];
  return (
    <div className={clsx("flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center", tones[tone])} role={tone === "danger" ? "alert" : "status"}>
      <Icon className="size-5 shrink-0" aria-hidden />
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="opacity-90">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({ percent, status, label }: { percent: number; status: "ON_TRACK" | "WARNING" | "EXCEEDED"; label: string }) {
  const width = Math.min(100, Math.max(0, percent));
  const color = status === "EXCEEDED" ? "bg-danger" : status === "WARNING" ? "bg-warning" : "bg-accent";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-canvas ring-1 ring-line ring-inset" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={clsx("h-full rounded-full transition-[width]", color)} style={{ width: `${width}%` }} />
    </div>
  );
}
