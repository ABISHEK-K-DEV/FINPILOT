import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import type { AdminOverviewDTO } from "@finpilot/shared";
import { api } from "../lib/api";
import { qk } from "../lib/queryKeys";
import { Card, CardHeader, PageHeader } from "../components/ui/Card";
import { ErrorState, Skeleton } from "../components/ui/Feedback";
import { StatTile } from "../components/ui/StatTile";

export default function AdminPage() {
  const q = useQuery({ queryKey: qk.admin, queryFn: () => api.get<AdminOverviewDTO>("/admin/overview") });
  return (
    <>
      <PageHeader title="Admin overview" description="Operational health. Aggregate counts only — no individual's financial data is visible here." />
      {q.isPending ? <Skeleton className="h-64" /> : q.isError ? <Card><ErrorState error={q.error} onRetry={() => q.refetch()} /></Card> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Users" value={q.data.users.total} sub={`${q.data.users.active30d} active in 30 days`} />
            <StatTile label="Transactions" value={q.data.records.transactions} sub="All users, count only" />
            <StatTile label="Active sessions" value={q.data.security.activeSessions} />
            <StatTile label="Failed logins (24h)" value={q.data.security.failedLoginsLast24h} tone={q.data.security.failedLoginsLast24h > 50 ? "attention" : "neutral"} sub={`${q.data.security.lockedAccounts} accounts locked`} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader title="Plans" />
              <ul className="space-y-2 text-sm">{Object.entries(q.data.users.byPlan).map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><span className="tabular font-medium">{v}</span></li>)}</ul>
            </Card>
            <Card>
              <CardHeader title="Roles" />
              <ul className="space-y-2 text-sm">{Object.entries(q.data.users.byRole).map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><span className="tabular font-medium">{v}</span></li>)}</ul>
            </Card>
            <Card>
              <CardHeader title="Audit events (24h)" />
              <ul className="space-y-2 text-sm">{q.data.recentAuditEvents.map((e) => <li key={e.action} className="flex justify-between gap-2"><code className="truncate text-xs">{e.action}</code><span className="tabular font-medium">{e.count}</span></li>)}</ul>
            </Card>
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-ink-3"><ShieldCheck className="size-4" aria-hidden />{q.data.note} Viewing this page is recorded in the audit log.</p>
        </>
      )}
    </>
  );
}
