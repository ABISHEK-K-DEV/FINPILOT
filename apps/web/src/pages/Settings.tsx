import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FlaskConical, LogOut, Plus, Trash2 } from "lucide-react";
import {
  CATEGORY_ICONS, CONSENT_DESCRIPTIONS, OPTIONAL_CONSENT_TYPES, SUPPORTED_CURRENCIES, SUPPORTED_LOCALES,
  categoryCreateSchema, changePasswordSchema, fieldErrors, isValidTimeZone,
  type CategoryIcon as IconName, type ConsentDTO, type PlanDTO, type UserDTO,
} from "@finpilot/shared";
import { api, ApiError, downloadFile } from "../lib/api";
import { FINANCIAL_KEYS, qk } from "../lib/queryKeys";
import { useAuth, useUser } from "../hooks/useAuth";
import { useCategories } from "../hooks/useCategories";
import { useFormat } from "../hooks/useFormat";
import { Card, CardHeader, PageHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Select, Toggle } from "../components/ui/Field";
import { Alert, Badge } from "../components/ui/Feedback";
import { CategoryIcon } from "../components/ui/CategoryIcon";

const TIMEZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Europe/London", "Europe/Berlin", "America/New_York", "America/Chicago", "America/Los_Angeles", "America/Toronto", "Australia/Sydney", "UTC"];

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings & privacy" description="Control your preferences, what FinPilot may do with your data, and your account." />
      <div className="space-y-4">
        <PreferencesSection />
        <CategoriesSection />
        <ConsentSection />
        <SecuritySection />
        <DataSection />
        <PlanSection />
        <DangerZone />
      </div>
    </>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return <Card><CardHeader title={title} subtitle={subtitle} />{children}</Card>;
}

function PreferencesSection() {
  const user = useUser();
  const { setUser } = useAuth();
  const qc = useQueryClient();
  const p = user.preferences;
  const [form, setForm] = useState({ name: user.name, baseCurrency: p.baseCurrency as string, locale: p.locale as string, timezone: p.timezone, budgetWarningPercent: String(p.budgetWarningPercent) });
  const [saved, setSaved] = useState(false);
  const zones = TIMEZONES.includes(form.timezone) ? TIMEZONES : [form.timezone, ...TIMEZONES];
  const m = useMutation({
    mutationFn: () => api.patch<{ user: UserDTO }>("/me/preferences", { ...form, budgetWarningPercent: Number(form.budgetWarningPercent) }),
    onSuccess: ({ user: u }) => {
      setUser(u);
      setSaved(true);
      FINANCIAL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: k }));
    },
  });
  const errors = m.error instanceof ApiError ? m.error.fields : {};
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => { setSaved(false); setForm({ ...form, [k]: e.target.value }); };

  return (
    <Section title="Profile & preferences" subtitle="Totals and budgets use your main currency. Months follow your time zone.">
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
        <Field label="Name" error={errors.name}>{(a) => <Input {...a} value={form.name} onChange={set("name")} />}</Field>
        <Field label="Email" hint="Contact support to change your email.">{(a) => <Input {...a} value={user.email} disabled />}</Field>
        <Field label="Main currency" error={errors.baseCurrency} hint="Changing it does not convert existing amounts.">
          {(a) => <Select {...a} value={form.baseCurrency} onChange={set("baseCurrency")}>{SUPPORTED_CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select>}
        </Field>
        <Field label="Number & date format" error={errors.locale}>
          {(a) => <Select {...a} value={form.locale} onChange={set("locale")}>{SUPPORTED_LOCALES.map((l) => <option key={l}>{l}</option>)}</Select>}
        </Field>
        <Field label="Time zone" error={errors.timezone}>
          {(a) => <Select {...a} value={form.timezone} onChange={set("timezone")}>{zones.filter(isValidTimeZone).map((z) => <option key={z}>{z}</option>)}</Select>}
        </Field>
        <Field label="Default budget warning" error={errors.budgetWarningPercent}>
          {(a) => <Select {...a} value={form.budgetWarningPercent} onChange={set("budgetWarningPercent")}>{[50, 60, 70, 75, 80, 90, 100].map((v) => <option key={v} value={v}>{v}%</option>)}</Select>}
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" loading={m.isPending}>Save preferences</Button>
          {saved && <span className="text-sm text-positive" role="status">Saved</span>}
          {m.error && !Object.keys(errors).length && <span className="text-sm text-danger">{m.error.message}</span>}
        </div>
      </form>
    </Section>
  );
}

function CategoriesSection() {
  const { categories } = useCategories();
  const qc = useQueryClient();
  const custom = categories.filter((c) => !c.isSystem);
  const [form, setForm] = useState({ name: "", kind: "EXPENSE" as "EXPENSE" | "INCOME", icon: "circle" as IconName, color: "#2563EB" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const refresh = () => { qc.invalidateQueries({ queryKey: qk.categories }); FINANCIAL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: k })); };
  const create = useMutation({
    mutationFn: (body: unknown) => api.post("/categories", body),
    onSuccess: () => { setForm({ ...form, name: "" }); refresh(); },
    onError: (e) => setErrors(e instanceof ApiError && Object.keys(e.fields).length ? e.fields : { name: e.message }),
  });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/categories/${id}`), onSuccess: refresh });

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = categoryCreateSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    create.mutate(parsed.data);
  }

  return (
    <Section title="Categories" subtitle={`${categories.length - custom.length} built-in categories, plus any you create.`}>
      {custom.length > 0 && (
        <ul className="mb-4 divide-y divide-line rounded-xl border border-line">
          {custom.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2">
              <CategoryIcon category={c} size="sm" />
              <span className="flex-1 text-sm">{c.name}</span>
              <Badge>{c.kind === "EXPENSE" ? "Expense" : "Income"}</Badge>
              <button className="rounded p-1 text-ink-3 hover:text-danger" aria-label={`Delete ${c.name}`}
                onClick={() => window.confirm(`Delete “${c.name}”? Its transactions will become uncategorised and its budget will be removed.`) && remove.mutate(c.id)}>
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_8rem_8rem_4rem_auto] sm:items-end">
        <Field label="New category" error={errors.name}>{(a) => <Input {...a} maxLength={40} placeholder="e.g. Pet care" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
        <Field label="Type">{(a) => <Select {...a} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "EXPENSE" | "INCOME" })}><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></Select>}</Field>
        <Field label="Icon">{(a) => <Select {...a} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value as IconName })}>{CATEGORY_ICONS.map((i) => <option key={i}>{i}</option>)}</Select>}</Field>
        <Field label="Colour" error={errors.color}>{(a) => <input {...a} type="color" className="h-10 w-full cursor-pointer rounded-lg border border-line-strong bg-surface" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value.toUpperCase() })} />}</Field>
        <Button type="submit" icon={<Plus className="size-4" />} loading={create.isPending}>Add</Button>
      </form>
    </Section>
  );
}

function ConsentSection() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: qk.consents, queryFn: async () => (await api.get<{ items: ConsentDTO[] }>("/me/consents")).items });
  const m = useMutation({
    mutationFn: (b: { type: string; granted: boolean }) => api.post<{ items: ConsentDTO[] }>("/me/consents", b),
    onSuccess: (r) => qc.setQueryData(qk.consents, r.items),
  });
  const byType = new Map((q.data ?? []).map((c) => [c.type, c]));
  return (
    <Section title="Privacy & consent" subtitle="Optional features stay off until you switch them on. You can change your mind at any time; every change is recorded.">
      <ul className="divide-y divide-line">
        {OPTIONAL_CONSENT_TYPES.map((t) => {
          const c = byType.get(t);
          return (
            <li key={t} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium">{CONSENT_DESCRIPTIONS[t].title}</p>
                <p className="text-xs text-ink-3">{CONSENT_DESCRIPTIONS[t].description}</p>
              </div>
              <Toggle label={CONSENT_DESCRIPTIONS[t].title} checked={c?.granted ?? false} disabled={q.isPending || m.isPending} onChange={(v) => m.mutate({ type: t, granted: v })} />
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-ink-3">We never sell personal financial data or use it for undisclosed advertising. FinPilot does not connect to bank accounts in this version.</p>
    </Section>
  );
}

interface SessionRow { id: string; userAgent: string | null; lastUsedAt: string; current: boolean }
interface ActivityRow { action: string; createdAt: string; userAgent: string | null }

function SecuritySection() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const sessions = useQuery({ queryKey: qk.sessions, queryFn: async () => (await api.get<{ items: SessionRow[] }>("/me/sessions")).items });
  const activity = useQuery({ queryKey: qk.activity, queryFn: async () => (await api.get<{ items: ActivityRow[] }>("/me/activity")).items });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const change = useMutation({
    mutationFn: (b: unknown) => api.post("/auth/change-password", b),
    onSuccess: () => { setDone(true); setPw({ currentPassword: "", newPassword: "" }); qc.invalidateQueries({ queryKey: qk.sessions }); },
    onError: (e) => setErrors(e instanceof ApiError ? e.fields : {}),
  });
  const logoutAll = useMutation({ mutationFn: () => api.post("/auth/logout-all"), onSuccess: () => {
    qc.setQueryData(qk.me, null);
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== qk.me[0] });
    navigate("/login", { replace: true });
  } });

  const describeUA = (ua: string | null) => (ua ? (/(Firefox|Edg|Chrome|Safari)\/[\d.]+/.exec(ua)?.[1] ?? "Browser") + (/(Android|iPhone|Windows|Mac OS X|Linux)/.exec(ua)?.[1] ? ` on ${/(Android|iPhone|Windows|Mac OS X|Linux)/.exec(ua)?.[1]}` : "") : "Unknown device");

  return (
    <Section title="Security" subtitle="Sessions are stored as one-way hashes and expire automatically.">
      <div className="grid gap-6 lg:grid-cols-2">
        <form className="space-y-3" noValidate onSubmit={(e) => {
          e.preventDefault(); setDone(false);
          const parsed = changePasswordSchema.safeParse(pw);
          if (!parsed.success) return setErrors(fieldErrors(parsed.error));
          setErrors({}); change.mutate(parsed.data);
        }}>
          <h3 className="text-sm font-semibold">Change password</h3>
          <Field label="Current password" error={errors.currentPassword}>{(a) => <Input {...a} type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />}</Field>
          <Field label="New password" error={errors.newPassword} hint="Other devices will be signed out.">{(a) => <Input {...a} type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />}</Field>
          <div className="flex items-center gap-3"><Button type="submit" variant="secondary" loading={change.isPending}>Update password</Button>{done && <span className="text-sm text-positive">Password updated</span>}</div>
        </form>
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Active sessions</h3>
            <Button size="sm" variant="ghost" icon={<LogOut className="size-4" />} loading={logoutAll.isPending} onClick={() => logoutAll.mutate()}>Sign out everywhere</Button>
          </div>
          <ul className="mt-2 divide-y divide-line text-sm">
            {(sessions.data ?? []).map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <span>{describeUA(s.userAgent)}</span>
                <span className="text-xs text-ink-3">{s.current ? <Badge tone="success">This device</Badge> : new Date(s.lastUsedAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
          <h3 className="mt-5 text-sm font-semibold">Recent sign-in activity</h3>
          <ul className="mt-2 space-y-1 text-xs text-ink-3">
            {(activity.data ?? []).slice(0, 6).map((a, i) => (
              <li key={i} className="flex justify-between gap-2"><code>{a.action.replace("auth.", "")}</code><span>{new Date(a.createdAt).toLocaleString()}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

function DataSection() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const load = useMutation({
    mutationFn: () => api.post<{ transactions: number; budgets: number }>("/me/sample-data"),
    onSuccess: (r) => { setMsg(`Loaded ${r.transactions} sample transactions and ${r.budgets} sample budgets.`); FINANCIAL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: k })); },
  });
  const remove = useMutation({
    mutationFn: () => api.delete<{ transactions: number; budgets: number }>("/me/sample-data"),
    onSuccess: (r) => { setMsg(`Removed ${r.transactions} sample transactions and ${r.budgets} sample budgets. Your own records were not touched.`); FINANCIAL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: k })); },
  });
  const [exporting, setExporting] = useState(false);
  return (
    <Section title="Your data" subtitle="Take your data with you, or explore FinPilot with demonstration data.">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-line p-4">
          <h3 className="text-sm font-semibold">Export everything</h3>
          <p className="mt-1 text-xs text-ink-3">A complete JSON file of your profile, consents, categories, transactions, budgets and security log.</p>
          <Button className="mt-3" variant="secondary" size="sm" icon={<Download className="size-4" />} loading={exporting}
            onClick={async () => { setExporting(true); try { await downloadFile("/me/export", "finpilot-export.json"); } finally { setExporting(false); } }}>
            Download my data
          </Button>
        </div>
        <div className="rounded-xl border border-line p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><FlaskConical className="size-4 text-violet-600" aria-hidden />Sample data</h3>
          <p className="mt-1 text-xs text-ink-3">Fictional transactions and budgets, always marked “Sample”. Removing them never affects your own entries.</p>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" size="sm" loading={load.isPending} onClick={() => load.mutate()}>Load sample data</Button>
            <Button variant="ghost" size="sm" loading={remove.isPending} onClick={() => remove.mutate()}>Remove</Button>
          </div>
        </div>
      </div>
      {msg && <p className="mt-3 text-sm text-ink-2" role="status">{msg}</p>}
    </Section>
  );
}

function PlanSection() {
  const user = useUser();
  const f = useFormat();
  const q = useQuery({ queryKey: qk.plans, queryFn: async () => (await api.get<{ items: PlanDTO[] }>("/plans")).items, staleTime: 10 * 60_000 });
  return (
    <Section title="Plan" subtitle="Premium and Business plans launch with Milestone 5. No payment details are collected today.">
      <div className="grid gap-3 md:grid-cols-3">
        {(q.data ?? []).map((p) => (
          <div key={p.code} className={`rounded-xl border p-4 ${p.code === user.plan ? "border-accent ring-1 ring-accent" : "border-line"}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{p.name}</h3>
              {p.code === user.plan ? <Badge tone="info">Current</Badge> : <Badge>Coming soon</Badge>}
            </div>
            <p className="tabular mt-1 text-lg font-semibold">{p.priceMonthly === "0.0000" ? "Free" : `${f.money(p.priceMonthly, p.currency)}/mo`}</p>
            <ul className="mt-2 space-y-1 text-xs text-ink-2">{p.features.map((x) => <li key={x}>• {x}</li>)}</ul>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-3">Indicative pricing; plans are configurable and may change before launch.</p>
    </Section>
  );
}

function DangerZone() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ password: "", confirmation: "" });
  const m = useMutation({
    mutationFn: () => api.delete("/me", form),
    onSuccess: () => {
      qc.setQueryData(qk.me, null);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== qk.me[0] });
      navigate("/", { replace: true });
    },
  });
  const errors = m.error instanceof ApiError ? m.error.fields : {};
  return (
    <Card className="border-danger/30">
      <CardHeader title="Delete account" subtitle="Permanently deletes your account and every record in it. This cannot be undone. Export your data first if you need it." />
      <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
        <Field label="Password" error={errors.password}>{(a) => <Input {...a} type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}</Field>
        <Field label="Type DELETE to confirm" error={errors.confirmation}>{(a) => <Input {...a} value={form.confirmation} onChange={(e) => setForm({ ...form, confirmation: e.target.value })} />}</Field>
        <Button type="submit" variant="danger" disabled={form.confirmation !== "DELETE" || !form.password} loading={m.isPending}>Delete permanently</Button>
      </form>
      {m.error && !Object.keys(errors).length && <div className="mt-3"><Alert tone="danger">{m.error.message}</Alert></div>}
    </Card>
  );
}
