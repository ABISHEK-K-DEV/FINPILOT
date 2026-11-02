import { Router } from "express";
import type { Prisma } from "@prisma/client";
import {
  dateStringToUtcDate,
  monthRange,
  transactionCreateSchema,
  transactionQuerySchema,
  transactionUpdateSchema,
  uuidSchema,
  type TransactionDTO,
  type Paginated,
} from "@finpilot/shared";
import { prisma } from "../../lib/prisma.js";
import { parse } from "../../lib/validate.js";
import { notFound, validationError } from "../../lib/errors.js";
import { encryptNullable } from "../../lib/crypto.js";
import { toPrismaDecimal } from "../../lib/money.js";
import { audit } from "../../lib/audit.js";
import { authOf } from "../../middleware/auth.js";
import { toTransactionDTO } from "../mappers.js";
import { assertUsableCategory } from "../categories/service.js";

export const transactionsRouter = Router();

async function findOwnTransaction(userId: string, id: string) {
  // Always scope by userId: another user's id is indistinguishable from a missing one.
  const tx = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!tx) throw notFound("Transaction");
  return tx;
}

async function assertOwnAccount(userId: string, accountId: string) {
  const account = await prisma.financialAccount.findFirst({ where: { id: accountId, userId }, select: { id: true } });
  if (!account) throw validationError({ accountId: "Account not found" });
}

transactionsRouter.get("/", async (req, res) => {
  const { userId } = authOf(req);
  const q = parse(transactionQuerySchema, req.query);

  const where: Prisma.TransactionWhereInput = { userId };
  const dateFilter: Prisma.DateTimeFilter = {};
  if (q.month) {
    const r = monthRange(q.month);
    dateFilter.gte = dateStringToUtcDate(r.start);
    dateFilter.lte = dateStringToUtcDate(r.end);
  }
  if (q.from) dateFilter.gte = dateStringToUtcDate(q.from);
  if (q.to) dateFilter.lte = dateStringToUtcDate(q.to);
  if (Object.keys(dateFilter).length) where.transactionDate = dateFilter;
  if (q.type) where.type = q.type;
  if (q.categoryId) where.categoryId = q.categoryId === "uncategorised" ? null : q.categoryId;
  if (q.sample === "exclude") where.isSample = false;
  if (q.sample === "only") where.isSample = true;
  if (q.search) {
    where.OR = [
      { merchant: { contains: q.search, mode: "insensitive" } },
      { description: { contains: q.search, mode: "insensitive" } },
      { tags: { has: q.search.toLowerCase() } },
    ];
  }

  const orderBy: Prisma.TransactionOrderByWithRelationInput[] = {
    date_desc: [{ transactionDate: "desc" as const }, { createdAt: "desc" as const }],
    date_asc: [{ transactionDate: "asc" as const }, { createdAt: "asc" as const }],
    amount_desc: [{ amount: "desc" as const }, { transactionDate: "desc" as const }],
    amount_asc: [{ amount: "asc" as const }, { transactionDate: "desc" as const }],
  }[q.sort];

  const [total, rows] = await prisma.$transaction([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({ where, orderBy, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
  ]);

  const body: Paginated<TransactionDTO> = {
    items: rows.map(toTransactionDTO),
    page: q.page,
    pageSize: q.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
  };
  res.json(body);
});

transactionsRouter.get("/:id", async (req, res) => {
  const { userId } = authOf(req);
  const tx = await findOwnTransaction(userId, parse(uuidSchema, req.params.id));
  res.json({ transaction: toTransactionDTO(tx) });
});

transactionsRouter.post("/", async (req, res) => {
  const { userId } = authOf(req);
  const input = parse(transactionCreateSchema, req.body);
  if (input.categoryId) await assertUsableCategory(userId, input.categoryId, input.type);
  if (input.accountId) await assertOwnAccount(userId, input.accountId);

  const tx = await prisma.transaction.create({
    data: {
      userId,
      type: input.type,
      amount: toPrismaDecimal(input.amount),
      currency: input.currency,
      transactionDate: dateStringToUtcDate(input.transactionDate),
      categoryId: input.categoryId ?? null,
      accountId: input.accountId ?? null,
      merchant: input.merchant ?? null,
      description: input.description ?? null,
      notesEnc: encryptNullable(input.notes, userId),
      paymentMethod: input.paymentMethod ?? null,
      tags: normaliseTags(input.tags),
      source: "MANUAL",
    },
  });
  await audit(req, { action: "transaction.create", userId, entityType: "transaction", entityId: tx.id });
  res.status(201).json({ transaction: toTransactionDTO(tx) });
});

transactionsRouter.patch("/:id", async (req, res) => {
  const { userId } = authOf(req);
  const id = parse(uuidSchema, req.params.id);
  const input = parse(transactionUpdateSchema, req.body);
  const existing = await findOwnTransaction(userId, id);

  if (existing.type === "TRANSFER" && input.type) {
    throw validationError({ type: "Transfers cannot change type" });
  }
  const nextType = input.type ?? existing.type;
  const nextCategoryId = input.categoryId === undefined ? existing.categoryId : input.categoryId;
  if (nextCategoryId && nextType !== "TRANSFER") await assertUsableCategory(userId, nextCategoryId, nextType);
  if (input.accountId) await assertOwnAccount(userId, input.accountId);

  const data: Prisma.TransactionUncheckedUpdateInput = {};
  if (input.type) data.type = input.type;
  if (input.amount) data.amount = toPrismaDecimal(input.amount);
  if (input.currency) data.currency = input.currency;
  if (input.transactionDate) data.transactionDate = dateStringToUtcDate(input.transactionDate);
  if (input.categoryId !== undefined || input.type) data.categoryId = nextCategoryId;
  if (input.accountId !== undefined) data.accountId = input.accountId;
  if (input.merchant !== undefined) data.merchant = input.merchant;
  if (input.description !== undefined) data.description = input.description;
  if (input.notes !== undefined) data.notesEnc = encryptNullable(input.notes, userId);
  if (input.paymentMethod !== undefined) data.paymentMethod = input.paymentMethod;
  if (input.tags !== undefined) data.tags = normaliseTags(input.tags);

  const tx = await prisma.transaction.update({ where: { id: existing.id }, data });
  await audit(req, { action: "transaction.update", userId, entityType: "transaction", entityId: tx.id });
  res.json({ transaction: toTransactionDTO(tx) });
});

transactionsRouter.delete("/:id", async (req, res) => {
  const { userId } = authOf(req);
  const existing = await findOwnTransaction(userId, parse(uuidSchema, req.params.id));
  await prisma.transaction.delete({ where: { id: existing.id } });
  await audit(req, { action: "transaction.delete", userId, entityType: "transaction", entityId: existing.id });
  res.status(204).end();
});

function normaliseTags(tags: string[] | undefined): string[] {
  return [...new Set((tags ?? []).map((t) => t.toLowerCase()))];
}
