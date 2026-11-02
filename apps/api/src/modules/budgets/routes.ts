import { Router } from "express";
import { budgetCreateSchema, budgetUpdateSchema, reportQuerySchema, uuidSchema } from "@finpilot/shared";
import { prisma } from "../../lib/prisma.js";
import { parse } from "../../lib/validate.js";
import { conflict, notFound } from "../../lib/errors.js";
import { toPrismaDecimal } from "../../lib/money.js";
import { getUserContext } from "../../lib/userContext.js";
import { audit } from "../../lib/audit.js";
import { authOf } from "../../middleware/auth.js";
import { toBudgetDTO } from "../mappers.js";
import { assertUsableCategory } from "../categories/service.js";
import { buildBudgetsWithProgress } from "../reports/service.js";

export const budgetsRouter = Router();

budgetsRouter.get("/", async (req, res) => {
  const { userId } = authOf(req);
  const q = parse(reportQuerySchema, req.query);
  const ctx = await getUserContext(userId);
  const month = q.month ?? ctx.currentMonth;
  res.json({ month, currency: ctx.baseCurrency, items: await buildBudgetsWithProgress(userId, ctx, month) });
});

budgetsRouter.post("/", async (req, res) => {
  const { userId } = authOf(req);
  const input = parse(budgetCreateSchema, req.body);
  if (input.categoryId) await assertUsableCategory(userId, input.categoryId, "EXPENSE");
  const scopeKey = input.categoryId ?? "OVERALL";
  const existing = await prisma.budget.findUnique({
    where: { userId_scopeKey_period: { userId, scopeKey, period: "MONTHLY" } },
  });
  if (existing) throw conflict("A budget already exists for this category. Edit it instead.");

  const ctx = await getUserContext(userId);
  const budget = await prisma.budget.create({
    data: {
      userId,
      categoryId: input.categoryId,
      scopeKey,
      amount: toPrismaDecimal(input.amount),
      currency: ctx.baseCurrency,
      alertThresholdPercent: input.alertThresholdPercent,
    },
  });
  await audit(req, { action: "budget.create", userId, entityType: "budget", entityId: budget.id });
  res.status(201).json({ budget: toBudgetDTO(budget) });
});

budgetsRouter.patch("/:id", async (req, res) => {
  const { userId } = authOf(req);
  const id = parse(uuidSchema, req.params.id);
  const input = parse(budgetUpdateSchema, req.body);
  const existing = await prisma.budget.findFirst({ where: { id, userId } });
  if (!existing) throw notFound("Budget");
  const budget = await prisma.budget.update({
    where: { id },
    data: {
      ...(input.amount ? { amount: toPrismaDecimal(input.amount), isSample: false } : {}),
      ...(input.alertThresholdPercent ? { alertThresholdPercent: input.alertThresholdPercent } : {}),
    },
  });
  await audit(req, { action: "budget.update", userId, entityType: "budget", entityId: id });
  res.json({ budget: toBudgetDTO(budget) });
});

budgetsRouter.delete("/:id", async (req, res) => {
  const { userId } = authOf(req);
  const id = parse(uuidSchema, req.params.id);
  const existing = await prisma.budget.findFirst({ where: { id, userId } });
  if (!existing) throw notFound("Budget");
  await prisma.budget.delete({ where: { id } });
  await audit(req, { action: "budget.delete", userId, entityType: "budget", entityId: id });
  res.status(204).end();
});
