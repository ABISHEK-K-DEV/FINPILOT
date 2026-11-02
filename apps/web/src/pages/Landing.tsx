import { Link } from "react-router-dom";
import {
  ArrowRight, BadgeCheck, Bell, Bot, CalendarDays, EyeOff, FileSearch, KeyRound, Lock, PieChart, Repeat, ScanLine,
  ShieldCheck, ShieldPlus, Target, Trash2, type LucideIcon,
} from "lucide-react";
import { Logo } from "../components/layout/Logo";
import { useAuth } from "../hooks/useAuth";

const FEATURES: { icon: LucideIcon; title: string; body: string; status: "Available" | "Coming soon" }[] = [
  { icon: PieChart, title: "Financial dashboard", body: "Monthly spending, income, categories and savings rate — explained in plain language.", status: "Available" },
  { icon: Target, title: "Budget intelligence", body: "Category budgets with warnings and an honest month-end projection.", status: "Available" },
  { icon: ScanLine, title: "Receipt & bill scanner", body: "Upload a bill, review what we extracted, correct it, then save.", status: "Coming soon" },
  { icon: Repeat, title: "Subscription intelligence", body: "See every recurring charge, its annual cost and the next renewal date.", status: "Coming soon" },
  { icon: ShieldPlus, title: "Warranty tracking", body: "Keep invoices and get reminded before a warranty expires.", status: "Coming soon" },
  { icon: CalendarDays, title: "Financial calendar", body: "Bills, renewals, EMIs you enter and warranty dates in one view.", status: "Coming soon" },
  { icon: FileSearch, title: "Unusual charge detection", body: "Explainable rules flag duplicates and sudden bill increases.", status: "Coming soon" },
  { icon: Bot, title: "AI spending analyst", body: "Ask questions about your own records — with the transactions behind every answer.", status: "Coming soon" },
];

const PRINCIPLES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: EyeOff, title: "We never sell your data", body: "No selling of personal financial data. No undisclosed advertising." },
  { icon: KeyRound, title: "No bank passwords. Ever.", body: "We never ask for banking passwords, card CVVs or OTPs, and we don't scrape banks." },
  { icon: Lock, title: "Encrypted and isolated", body: "TLS in transit, sensitive fields encrypted at rest, strict per-user data isolation." },
  { icon: Trash2, title: "Your data, your control", body: "Export everything or permanently delete your account at any time." },
];

export function LandingPage() {
  const { user } = useAuth();
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          {user ? (
            <Link to="/app" className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong">Open dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-ink-2 hover:text-ink">Sign in</Link>
              <Link to="/register" className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong">Get started</Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-2">
              <ShieldCheck className="size-3.5 text-positive" aria-hidden /> Privacy-first · Built for India, ready for the world
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              A clear understanding of your money, bills and recurring commitments.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-2">
              FinPilot turns the expenses you record into plain-language insight: where your money goes, which budgets need attention,
              and how this month compares with the last.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-accent px-6 font-medium text-white shadow-sm hover:bg-accent-strong">
                Create your free account <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link to="/login" className="inline-flex h-12 items-center justify-center rounded-lg border border-line-strong bg-surface px-6 font-medium text-ink hover:bg-canvas">
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-3">Free plan · No card required · Manual entry first — no bank connection needed</p>
          </div>
        </section>

        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight">Financial intelligence, not just an expense log</h2>
            <p className="mt-2 max-w-2xl text-ink-2">We're shipping in clear milestones. Features below are labelled honestly with their status.</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl border border-line p-5">
                  <div className="flex items-center justify-between">
                    <f.icon className="size-5 text-accent" aria-hidden />
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${f.status === "Available" ? "bg-positive-soft text-positive" : "bg-canvas text-ink-3 ring-1 ring-line"}`}>
                      {f.status}
                    </span>
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-ink-2">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Trust is the product</h2>
              <p className="mt-3 text-ink-2">
                Financial information is deeply personal. FinPilot is designed around minimal data collection, explicit consent and
                explainable insights. We don't move money, give investment advice, or make claims we can't support with your own records.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-ink-2">
                {["No payments or transfers are initiated by FinPilot", "AI features are opt-in and use only data you authorise", "Every insight shows the records behind it"].map((t) => (
                  <li key={t} className="flex gap-2"><BadgeCheck className="size-4 shrink-0 text-positive" aria-hidden />{t}</li>
                ))}
              </ul>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {PRINCIPLES.map((p) => (
                <div key={p.title} className="rounded-2xl border border-line bg-surface p-5">
                  <p.icon className="size-5 text-ink" aria-hidden />
                  <h3 className="mt-3 font-semibold">{p.title}</h3>
                  <p className="mt-1 text-sm text-ink-2">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-ink">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Start with what you already know</h2>
              <p className="mt-2 text-white/70">Add a few expenses, set a budget, and see your month clearly. Or explore with labelled sample data.</p>
            </div>
            <Link to="/register" className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 font-medium text-ink hover:bg-white/90">
              Get started free <Bell className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-sm text-ink-3 sm:px-6">
        <p>© {new Date().getFullYear()} FinPilot. FinPilot provides information about your own records and is not a bank, payment service or investment advisor.</p>
      </footer>
    </div>
  );
}
