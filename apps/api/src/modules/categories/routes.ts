import { Router } from "express";
import { randomBytes } from "node:crypto";
import { categoryCreateSchema, categoryUpdateSchema, uuidSchema } from "@finpilot/shared";
import { prisma } from "../../lib/prisma.js";
import { parse } from "../../lib/validate.js";
import { audit } from "../../lib/audit.js";
import { conflict } from "../../lib/errors.js";
import { authOf } from "../../middleware/auth.js";
import { toCategoryDTO } from "../mappers.js";
import { findOwnCategory, visibleCategoriesWhere } from "./service.js";

export const categoriesRouter = Router();
const MAX_CUSTOM_CATEGORIES = 50;

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return `${base || "category"}-${randomBytes(3).toString("hex")}`;
}

categoriesRouter.get("/", async (req, res) => {
  const { userId } = authOf(req);
  const categories = await prisma.expenseCategory.findMany({
    where: visibleCategoriesWhere(userId),
    orderBy: [{ kind: "asc" }, { isSystem: "desc" }, { name: "asc" }],
  });
  res.json({ items: categories.map(toCategoryDTO) });
});

categoriesRouter.post("/", async (req, res) => {
  const { userId } = authOf(req);
  const input = parse(categoryCreateSchema, req.body);
  const count = await prisma.expenseCategory.count({ where: { userId, archivedAt: null } });
  if (count >= MAX_CUSTOM_CATEGORIES) throw conflict(`You can create up to ${MAX_CUSTOM_CATEGORIES} custom categories`);
  const duplicate = await prisma.expenseCategory.findFirst({
    where: { ...visibleCategoriesWhere(userId), kind: input.kind, name: { equals: input.name, mode: "insensitive" } },
  });
  if (duplicate) throw conflict("A category with this name already exists");

  const category = await prisma.expenseCategory.create({
    data: { ...input, userId, slug: slugify(input.name), isSystem: false },
  });
  await audit(req, { action: "category.create", userId, entityType: "category", entityId: category.id });
  res.status(201).json({ category: toCategoryDTO(category) });
});

categoriesRouter.patch("/:id", async (req, res) => {
  const { userId } = authOf(req);
  const id = parse(uuidSchema, req.params.id);
  const input = parse(categoryUpdateSchema, req.body);
  await findOwnCategory(userId, id);
  const category = await prisma.expenseCategory.update({ where: { id }, data: input });
  res.json({ category: toCategoryDTO(category) });
});

/** Deleting a custom category un-categorises its transactions (they are kept) and removes its budget. */
categoriesRouter.delete("/:id", async (req, res) => {
  const { userId } = authOf(req);
  const id = parse(uuidSchema, req.params.id);
  await findOwnCategory(userId, id);
  await prisma.expenseCategory.delete({ where: { id } });
  await audit(req, { action: "category.delete", userId, entityType: "category", entityId: id });
  res.status(204).end();
});
