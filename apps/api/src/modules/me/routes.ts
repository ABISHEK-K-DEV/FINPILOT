import { Router } from "express";
import {
  CONSENT_TYPES,
  consentUpdateSchema,
  deleteAccountSchema,
  preferencesUpdateSchema,
  type ConsentDTO,
} from "@finpilot/shared";
import { prisma } from "../../lib/prisma.js";
import { parse } from "../../lib/validate.js";
import { verifyPassword } from "../../lib/password.js";
import { clearSessionCookie } from "../../lib/session.js";
import { getUserContext } from "../../lib/userContext.js";
import { decToString } from "../../lib/money.js";
import { decryptNullable, sha256Hex } from "../../lib/crypto.js";
import { audit } from "../../lib/audit.js";
import { AppError } from "../../lib/errors.js";
import { authOf } from "../../middleware/auth.js";
import { exportLimiter, sensitiveActionLimiter } from "../../middleware/rateLimit.js";
import { loadSampleData, removeSampleData } from "../../services/sampleData.js";
import { toUserDTO } from "../mappers.js";

export const meRouter = Router();

meRouter.patch("/preferences", async (req, res) => {
  const { userId } = authOf(req);
  const { name, ...prefs } = parse(preferencesUpdateSchema, req.body);
  await prisma.$transaction([
    ...(name ? [prisma.user.update({ where: { id: userId }, data: { name } })] : []),
    prisma.userPreferences.update({ where: { userId }, data: prefs }),
  ]);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { preferences: true } });
  await audit(req, { action: "preferences.update", userId, metadata: { fields: Object.keys(req.body ?? {}) } });
  res.json({ user: toUserDTO(user) });
});

/** Effective consent state = most recent record per type. */
async function currentConsents(userId: string): Promise<ConsentDTO[]> {
  const records = await prisma.consentRecord.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return CONSENT_TYPES.map((type) => {
    const latest = records.find((r) => r.type === type);
    return {
      type,
      granted: latest?.granted ?? false,
      version: latest?.version ?? null,
      updatedAt: latest?.createdAt.toISOString() ?? null,
    };
  });
}

meRouter.get("/consents", async (req, res) => {
  const { userId } = authOf(req);
  res.json({ items: await currentConsents(userId) });
});

meRouter.post("/consents", async (req, res) => {
  const { userId } = authOf(req);
  const input = parse(consentUpdateSchema, req.body);
  await prisma.consentRecord.create({ data: { userId, type: input.type, granted: input.granted, version: "1" } });
  await audit(req, { action: input.granted ? "consent.grant" : "consent.revoke", userId, metadata: { type: input.type } });
  res.json({ items: await currentConsents(userId) });
});

meRouter.get("/sessions", async (req, res) => {
  const { userId, sessionId } = authOf(req);
  const sessions = await prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
    select: { id: true, userAgent: true, createdAt: true, lastUsedAt: true, expiresAt: true },
  });
  res.json({ items: sessions.map((s) => ({ ...s, current: s.id === sessionId })) });
});

meRouter.get("/activity", async (req, res) => {
  const { userId } = authOf(req);
  const items = await prisma.auditLog.findMany({
    where: { userId, action: { startsWith: "auth." } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { action: true, createdAt: true, userAgent: true },
  });
  res.json({ items });
});

/** Full machine-readable export of everything FinPilot stores about the user (data portability). */
meRouter.get("/export", exportLimiter, async (req, res) => {
  const { userId } = authOf(req);
  const [user, consents, categories, accounts, transactions, budgets, auditLogs] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { preferences: true } }),
    prisma.consentRecord.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.expenseCategory.findMany({ where: { userId } }),
    prisma.financialAccount.findMany({ where: { userId } }),
    prisma.transaction.findMany({ where: { userId }, orderBy: { transactionDate: "asc" } }),
    prisma.budget.findMany({ where: { userId } }),
    prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { action: true, entityType: true, entityId: true, createdAt: true },
    }),
  ]);

  const exportBody = {
    format: "finpilot-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    notice: "Monetary amounts are decimal strings. Dates are calendar dates (YYYY-MM-DD).",
    profile: toUserDTO(user),
    consents: consents.map((c) => ({ type: c.type, granted: c.granted, version: c.version, at: c.createdAt })),
    customCategories: categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind, icon: c.icon, color: c.color })),
    accounts: accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, currency: a.currency, institutionName: a.institutionName })),
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: decToString(t.amount),
      currency: t.currency,
      date: t.transactionDate.toISOString().slice(0, 10),
      categoryId: t.categoryId,
      accountId: t.accountId,
      merchant: t.merchant,
      description: t.description,
      notes: decryptNullable(t.notesEnc, userId),
      paymentMethod: t.paymentMethod,
      tags: t.tags,
      source: t.source,
      isSample: t.isSample,
      createdAt: t.createdAt,
    })),
    budgets: budgets.map((b) => ({
      id: b.id,
      categoryId: b.categoryId,
      period: b.period,
      amount: decToString(b.amount),
      currency: b.currency,
      alertThresholdPercent: b.alertThresholdPercent,
      isSample: b.isSample,
    })),
    securityLog: auditLogs,
  };

  await audit(req, { action: "data.export", userId, metadata: { transactions: transactions.length } });
  res.setHeader("Content-Disposition", `attachment; filename="finpilot-export-${new Date().toISOString().slice(0, 10)}.json"`);
  res.setHeader("Cache-Control", "no-store");
  res.json(exportBody);
});

/** Permanent account deletion. All user-owned rows cascade; the audit trail keeps only an anonymous marker. */
meRouter.delete("/", sensitiveActionLimiter, async (req, res) => {
  const { userId } = authOf(req);
  const input = parse(deleteAccountSchema, req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(user.passwordHash, input.password))) {
    await audit(req, { action: "account.delete.failed", userId });
    throw new AppError(400, "VALIDATION_ERROR", "Password is incorrect", { password: "Password is incorrect" });
  }
  await prisma.user.delete({ where: { id: userId } });
  await audit(req, { action: "account.deleted", userId: null, actorId: null, metadata: { subject: sha256Hex(userId) } });
  clearSessionCookie(res);
  res.status(204).end();
});

meRouter.post("/sample-data", async (req, res) => {
  const { userId } = authOf(req);
  const ctx = await getUserContext(userId);
  const result = await loadSampleData(userId, ctx);
  await audit(req, { action: "sample_data.load", userId, metadata: result });
  res.status(201).json(result);
});

meRouter.delete("/sample-data", async (req, res) => {
  const { userId } = authOf(req);
  const result = await removeSampleData(userId);
  await audit(req, { action: "sample_data.remove", userId, metadata: result });
  res.json(result);
});
