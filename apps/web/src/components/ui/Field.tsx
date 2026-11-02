import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import clsx from "clsx";

const control =
  "block w-full rounded-lg border bg-surface px-3 text-sm text-ink placeholder:text-ink-3 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent disabled:bg-canvas";

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
  className?: string;
  optional?: boolean;
}

export function Field({ label, error, hint, children, className, optional }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={clsx("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {optional && <span className="ml-1 font-normal text-ink-3">(optional)</span>}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={clsx(control, "h-10", rest["aria-invalid"] ? "border-danger" : "border-line-strong", className)}
      {...rest}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={clsx(control, "h-10 pr-8", rest["aria-invalid"] ? "border-danger" : "border-line-strong", className)}
      {...rest}
    >
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={clsx(control, "py-2", rest["aria-invalid"] ? "border-danger" : "border-line-strong", className)}
      {...rest}
    />
  );
});

export function Checkbox({
  label,
  checked,
  onChange,
  error,
  description,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 size-4 rounded border-line-strong text-accent accent-[var(--color-accent)]"
          aria-invalid={Boolean(error)}
        />
        <label htmlFor={id} className="text-sm text-ink-2">
          {label}
          {description && <span className="block text-xs text-ink-3">{description}</span>}
        </label>
      </div>
      {error && <p className="mt-1 text-sm text-danger" role="alert">{error}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-accent" : "bg-line-strong",
      )}
    >
      <span className={clsx("inline-block size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5.5" : "translate-x-0.5")} />
    </button>
  );
}
