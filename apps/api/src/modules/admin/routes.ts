import { Router } from "express";
import type { AdminOverviewDTO } from "@finpilot/shared";
import { prisma } from "../../lib/prisma.js";
import { audit } from "../../lib/audit.js";
import { authOf } from "../../middleware/auth.js";

export const adminRouter = Router();

/**
 * Operational overview for administrators. Privacy by design: aggregate counts only —
 * no names, emails, amounts, merchants or any individual financial record.
 */
adminRouter.get("/overview", async (req, res) => {
  const { userId } = authOf(req);
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 3600_000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 3600_000);

  const [total, active30d, byRole, byPlan, transactions, budgets, customCategories, failedLogins, locked, sessions, events] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastLoginAt: { gte: monthAgo } } }),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
      prisma.user.groupBy({ by: ["planCode"], _count: { _all: true } }),
      prisma.transaction.count(),
      prisma.budget.count(),
      prisma.expenseCategory.count({ where: { isSystem: false } }),
      prisma.auditLog.count({ where: { action: "auth.login.failed", createdAt: { gte: dayAgo } } }),
      prisma.user.count({ where: { lockedUntil: { gt: now } } }),
      prisma.session.count({ where: { revokedAt: null, expiresAt: { gt: now } } }),
      prisma.auditLog.groupBy({
        by: ["action"],
        where: { createdAt: { gte: dayAgo } },
        _count: { _all: true },
        orderBy: { _count: { action: "desc" } },
        take: 10,
      }),
    ]);

  const body: AdminOverviewDTO = {
    users: {
      total,
      active30d,
      byRole: Object.fromEntries(byRole.map((r) => [r.role, r._count._all])),
      byPlan: Object.fromEntries(byPlan.map((p) => [p.planCode, p._count._all])),
    },
    records: { transactions, budgets, customCategories },
    security: { failedLoginsLast24h: failedLogins, lockedAccounts: locked, activeSessions: sessions },
    recentAuditEvents: events.map((e) => ({ action: e.action, count: (e._count as { _all: number })._all })),
    generatedAt: now.toISOString(),
    note: "Aggregate operational metrics only. Individual users' financial data is never shown to administrators.",
  };
  await audit(req, { action: "admin.overview.view", userId });
  res.json(body);
});
