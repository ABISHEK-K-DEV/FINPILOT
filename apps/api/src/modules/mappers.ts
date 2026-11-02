import type { Budget, ExpenseCategory, Transaction, User, UserPreferences } from "@prisma/client";
import {
  utcDateToDateString,
  type BudgetDTO,
  type CategoryDTO,
  type CategoryIcon,
  type CurrencyCode,
  type LocaleCode,
  type PreferencesDTO,
  type TransactionDTO,
  type UserDTO,
} from "@finpilot/shared";
import { decToString } from "../lib/money.js";
import { decryptNullable } from "../lib/crypto.js";

export function toPreferencesDTO(p: UserPreferences): PreferencesDTO {
  return {
    baseCurrency: p.baseCurrency as CurrencyCode,
    locale: p.locale as LocaleCode,
    timezone: p.timezone,
    budgetWarningPercent: p.budgetWarningPercent,
    weekStartsOn: p.weekStartsOn,
    emailNotifications: p.emailNotifications,
    pushNotifications: p.pushNotifications,
  };
}

export function toUserDTO(u: User & { preferences: UserPreferences | null }): UserDTO {
  if (!u.preferences) throw new Error("User preferences missing");
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    plan: u.planCode,
    createdAt: u.createdAt.toISOString(),
    preferences: toPreferencesDTO(u.preferences),
  };
}

export function toCategoryDTO(c: ExpenseCategory): CategoryDTO {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    kind: c.kind,
    icon: c.icon as CategoryIcon,
    color: c.color,
    isSystem: c.isSystem,
  };
}

export function toTransactionDTO(t: Transaction): TransactionDTO {
  return {
    id: t.id,
    type: t.type,
    amount: decToString(t.amount),
    currency: t.currency as CurrencyCode,
    transactionDate: utcDateToDateString(t.transactionDate),
    categoryId: t.categoryId,
    accountId: t.accountId,
    merchant: t.merchant,
    description: t.description,
    notes: decryptNullable(t.notesEnc, t.userId),
    paymentMethod: t.paymentMethod,
    tags: t.tags,
    source: t.source,
    isSample: t.isSample,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function toBudgetDTO(b: Budget): BudgetDTO {
  return {
    id: b.id,
    categoryId: b.categoryId,
    amount: decToString(b.amount),
    currency: b.currency as CurrencyCode,
    alertThresholdPercent: b.alertThresholdPercent,
    isSample: b.isSample,
    createdAt: b.createdAt.toISOString(),
  };
}
