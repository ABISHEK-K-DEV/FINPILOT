import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  BarChart3, Bot, CalendarDays, FileText, LayoutDashboard, ListOrdered, LogOut, Plus, Repeat,
  ScanLine, Settings, ShieldCheck, ShieldPlus, Target, type LucideIcon,
} from "lucide-react";
import type { Paginated, TransactionDTO } from "@finpilot/shared";
import { useAuth, useUser } from "../../hooks/useAuth";
import { api } from "../../lib/api";
import { FINANCIAL_KEYS } from "../../lib/queryKeys";
import { Logo } from "./Logo";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Feedback";
import { TransactionEditorProvider, useTransactionEditor } from "../transactions/TransactionEditor";

interface NavItem { to: string; label: string; icon: LucideIcon; milestone?: number }

const PRIMARY: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/transactions", label: "Transactions", icon: ListOrdered },
  { to: "/app/budgets", label: "Budgets", icon: Target },
  { to: "/app/reports", label: "Reports", icon: BarChart3 },
];
const UPCOMING: NavItem[] = [
  { to: "/app/scanner", label: "Receipt scanner", icon: ScanLine, milestone: 2 },
  { to: "/app/bills", label: "Bills", icon: FileText, milestone: 2 },
  { to: "/app/subscriptions", label: "Subscriptions", icon: Repeat, milestone: 3 },
  { to: "/app/warranties", label: "Warranties", icon: ShieldPlus, milestone: 3 },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays, milestone: 3 },
  { to: "/app/assistant", label: "AI assistant", icon: Bot, milestone: 4 },
];

function SideLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/app"}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
          isActive ? "bg-accent-soft font-medium text-accent-strong" : "text-ink-2 hover:bg-canvas hover:text-ink",
          item.milestone && !isActive && "text-ink-3",
        )
      }
    >
      <Icon className="size-4" aria-hidden />
      <span className="flex-1">{item.label}</span>
      {item.milestone && <span className="rounded bg-canvas px-1.5 py-0.5 text-[10px] font-medium text-ink-3 ring-1 ring-line">M{item.milestone}</span>}
    </NavLink>
  );
}

function SampleDataBanner() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["transactions", { sample: "only", pageSize: 1 }],
    queryFn: () => api.get<Paginated<TransactionDTO>>("/transactions?sample=only&pageSize=1"),
  });
  const remove = useMutation({
    mutationFn: () => api.delete("/me/sample-data"),
    onSuccess: () => FINANCIAL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: k })),
  });
  if (!data?.total) return null;
  return (
    <div className="mb-6">
      <Alert
        tone="info"
        title="You're viewing sample data"
        action={<Button size="sm" variant="secondary" loading={remove.isPending} onClick={() => remove.mutate()}>Remove sample data</Button>}
      >
        {data.total} demonstration transactions marked <strong>Sample</strong> are included in your totals. They are not real financial records.
      </Alert>
    </div>
  );
}

function Shell() {
  const user = useUser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const editor = useTransactionEditor();

  const onLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface px-3 py-5 lg:flex">
        <div className="px-2"><Logo to="/app" /></div>
        <Button className="mx-1 mt-6" icon={<Plus className="size-4" />} onClick={() => editor.openNew()}>Add transaction</Button>
        <nav className="mt-6 flex-1 space-y-6 overflow-y-auto" aria-label="Main">
          <div className="space-y-0.5">{PRIMARY.map((i) => <SideLink key={i.to} item={i} />)}</div>
          <div>
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Coming next</p>
            <div className="space-y-0.5">{UPCOMING.map((i) => <SideLink key={i.to} item={i} />)}</div>
          </div>
          <div className="space-y-0.5">
            <SideLink item={{ to: "/app/settings", label: "Settings & privacy", icon: Settings }} />
            {user.role === "ADMIN" && <SideLink item={{ to: "/app/admin", label: "Admin", icon: ShieldCheck }} />}
          </div>
        </nav>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-line p-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white" aria-hidden>
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-ink-3">{user.plan === "FREE" ? "Free plan" : user.plan}</p>
          </div>
          <button onClick={onLogout} className="rounded-lg p-1.5 text-ink-3 hover:bg-canvas hover:text-ink" aria-label="Sign out" title="Sign out">
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
          <Logo to="/app" />
          <div className="flex items-center gap-1">
            <NavLink to="/app/settings" className="rounded-lg p-2 text-ink-2" aria-label="Settings"><Settings className="size-5" /></NavLink>
            <button onClick={onLogout} className="rounded-lg p-2 text-ink-2" aria-label="Sign out"><LogOut className="size-5" /></button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          <SampleDataBanner />
          <Outlet />
        </main>

        {/* Mobile bottom navigation */}
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Main">
          {[PRIMARY[0], PRIMARY[1]].map((i) => i && <BottomLink key={i.to} item={i} />)}
          <div className="flex items-center justify-center">
            <button onClick={() => editor.openNew()} className="-mt-6 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30" aria-label="Add transaction">
              <Plus className="size-6" />
            </button>
          </div>
          {[PRIMARY[2], PRIMARY[3]].map((i) => i && <BottomLink key={i.to} item={i} />)}
        </nav>
      </div>
    </div>
  );
}

function BottomLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} end={item.to === "/app"} className={({ isActive }) => clsx("flex flex-col items-center gap-0.5 py-2 text-[11px]", isActive ? "text-accent" : "text-ink-3")}>
      <Icon className="size-5" aria-hidden />
      {item.label}
    </NavLink>
  );
}

export function AppLayout() {
  return (
    <TransactionEditorProvider>
      <Shell />
    </TransactionEditorProvider>
  );
}

