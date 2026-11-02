import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import {
  DEFAULT_CURRENCY,
  fieldErrors,
  isValidTimeZone,
  loginSchema,
  registerSchema,
  SUPPORTED_CURRENCIES,
  type UserDTO,
} from "@finpilot/shared";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { Logo } from "../components/layout/Logo";
import { Button } from "../components/ui/Button";
import { Checkbox, Field, Input, Select } from "../components/ui/Field";
import { Alert } from "../components/ui/Feedback";

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-canvas px-4 py-10">
      <Logo />
      <div className="mt-8 w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-ink-3">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-6 text-sm text-ink-3">{footer}</p>
      <p className="mt-6 flex max-w-md items-center gap-2 text-center text-xs text-ink-3">
        <Lock className="size-3.5 shrink-0" aria-hidden />
        FinPilot will never ask for your bank password, card CVV or OTP.
      </p>
    </div>
  );
}

export function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setFormError(null);
    setLoading(true);
    try {
      const { user } = await api.post<{ user: UserDTO }>("/auth/login", parsed.data);
      setUser(user);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from?.startsWith("/app") ? from : "/app", { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your FinPilot account." footer={<>New to FinPilot? <Link to="/register" className="font-medium text-accent">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Field label="Email" error={errors.email}>
          {(p) => <Input {...p} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
        </Field>
        <Field label="Password" error={errors.password}>
          {(p) => <Input {...p} type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={loading}>Sign in</Button>
      </form>
    </AuthShell>
  );
}

function detectTimeZone(): string | undefined {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && isValidTimeZone(tz) ? tz : undefined;
  } catch {
    return undefined;
  }
}

export function RegisterPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    baseCurrency: DEFAULT_CURRENCY as string,
    acceptTerms: false,
    acceptPrivacy: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = registerSchema.safeParse({ ...form, timezone: detectTimeZone() });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setFormError(null);
    setLoading(true);
    try {
      const { user } = await api.post<{ user: UserDTO }>("/auth/register", parsed.data);
      setUser(user);
      navigate("/app", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) setErrors(err.fields);
      else setFormError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Free forever for manual tracking and basic budgets." footer={<>Already have an account? <Link to="/login" className="font-medium text-accent">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Field label="Your name" error={errors.name}>
          {(p) => <Input {...p} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
        </Field>
        <Field label="Email" error={errors.email}>
          {(p) => <Input {...p} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
        </Field>
        <Field label="Password" error={errors.password} hint="At least 10 characters, with a letter and a number.">
          {(p) => <Input {...p} type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
        </Field>
        <Field label="Main currency" error={errors.baseCurrency} hint="Used for totals and budgets. You can change it later.">
          {(p) => (
            <Select {...p} value={form.baseCurrency} onChange={(e) => setForm({ ...form, baseCurrency: e.target.value })}>
              {SUPPORTED_CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          )}
        </Field>
        <div className="space-y-3 rounded-xl bg-canvas p-4">
          <Checkbox checked={form.acceptTerms} onChange={(v) => setForm({ ...form, acceptTerms: v })} error={errors.acceptTerms} label="I agree to the Terms of Service" />
          <Checkbox checked={form.acceptPrivacy} onChange={(v) => setForm({ ...form, acceptPrivacy: v })} error={errors.acceptPrivacy}
            label="I have read the Privacy Policy" description="We store only what you enter. Optional AI and email features stay off until you switch them on." />
        </div>
        <Button type="submit" className="w-full" size="lg" loading={loading}>Create account</Button>
      </form>
    </AuthShell>
  );
}
