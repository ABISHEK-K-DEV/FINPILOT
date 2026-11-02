import type { CategoryKind, ExpenseCategory } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { notFound, validationError } from "../../lib/errors.js";

/** Categories visible to a user: system categories + the user's own (non-archived). */
export function visibleCategoriesWhere(userId: string) {
  return { archivedAt: null, OR: [{ userId: null, isSystem: true }, { userId }] };
}

/**
 * Ensure a category can be used by this user (system or owned) and matches the expected kind.
 * Another user's category is reported as "not found" to avoid leaking its existence.
 */
export async function assertUsableCategory(
  userId: string,
  categoryId: string,
  kind?: CategoryKind,
  field = "categoryId",
): Promise<ExpenseCategory> {
  const category = await prisma.expenseCategory.findFirst({
    where: { id: categoryId, ...visibleCategoriesWhere(userId) },
  });
  if (!category) throw validationError({ [field]: "Category not found" });
  if (kind && category.kind !== kind) {
    throw validationError({ [field]: `Choose an ${kind.toLowerCase()} category` });
  }
  return category;
}

export async function findOwnCategory(userId: string, id: string): Promise<ExpenseCategory> {
  const category = await prisma.expenseCategory.findFirst({ where: { id, userId, isSystem: false } });
  if (!category) throw notFound("Category");
  return category;
}
