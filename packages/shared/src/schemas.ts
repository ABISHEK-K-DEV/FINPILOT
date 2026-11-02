/**
 * Zod validation schemas shared by the web client (form validation) and the API
 * (authoritative request validation). The API ALWAYS re-validates.
 */
import { z } from "zod";
import { AMOUNT_PATTERN, toDecimal } from "./money.js";
import { isValidDateString, isValidMonthKey, isValidTimeZone } from "./dates.js";
import {
  CATEGORY_ICONS,
  CATEGORY_KINDS,
  MANUAL_TRANSACTION_TYPES,
  OPTIONAL_CONSENT_TYPES,
  PAYMENT_METHODS,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  TRANSACTION_TYPES,
} from "./constants.js";

export const amountSchema = z
  .string({ error: (iss) => (iss.input === undefined ? "Amount is required" : "Amount must be a decimal string") })
  .trim()
  .regex(AMOUNT_PATTERN, "Enter a valid amount with up to 4 decimal places")
  // Guard: zod keeps running refinements after a failed regex, so never parse an invalid string.
  .refine((v) => !AMOUNT_PATTERN.test(v) || toDecimal(v).greaterThan(0), "Amount must be greater than zero");

export const currencySchema = z.enum(SUPPORTED_CURRENCIES, { error: "Unsupported currency" });

export const dateStringSchema = z
  .string()
  .refine(isValidDateString, "Enter a valid date (YYYY-MM-DD)");

export const monthKeySchema = z.string().refine(isValidMonthKey, "Enter a valid month (YYYY-MM)");

export const timeZoneSchema = z.string().max(64).refine(isValidTimeZone, "Unknown time zone");

export const uuidSchema = z.uuid("Invalid identifier");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address"));

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "Use 128 characters or fewer")
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "Include at least one letter and one number");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: z.literal(true, { error: "You must accept the terms of service" }),
  acceptPrivacy: z.literal(true, { error: "You must accept the privacy policy" }),
  baseCurrency: currencySchema.optional(),
  timezone: timeZoneSchema.optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const transactionCreateSchema = z.object({
  type: z.enum(MANUAL_TRANSACTION_TYPES),
  amount: amountSchema,
  currency: currencySchema,
  transactionDate: dateStringSchema,
  categoryId: uuidSchema.nullable().optional(),
  accountId: uuidSchema.nullable().optional(),
  merchant: optionalText(120),
  description: optionalText(500),
  notes: optionalText(2000),
  paymentMethod: z.enum(PAYMENT_METHODS).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(10).optional(),
});
export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;

export const transactionUpdateSchema = transactionCreateSchema.partial();
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;

export const transactionQuerySchema = z
  .object({
    month: monthKeySchema.optional(),
    from: dateStringSchema.optional(),
    to: dateStringSchema.optional(),
    type: z.enum(TRANSACTION_TYPES).optional(),
    categoryId: z.union([uuidSchema, z.literal("uncategorised")]).optional(),
    search: z.string().trim().max(100).optional(),
    sample: z.enum(["include", "exclude", "only"]).optional(),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    sort: z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]).default("date_desc"),
  })
  .refine((q) => !(q.from && q.to) || q.from <= q.to, { message: "'from' must be on or before 'to'", path: ["from"] });
export type TransactionQuery = z.infer<typeof transactionQuerySchema>;

export const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex colour like #2563EB");

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  kind: z.enum(CATEGORY_KINDS),
  icon: z.enum(CATEGORY_ICONS).default("circle"),
  color: hexColorSchema.default("#64748B"),
});
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40).optional(),
  icon: z.enum(CATEGORY_ICONS).optional(),
  color: hexColorSchema.optional(),
});
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

export const budgetCreateSchema = z.object({
  /** null = overall monthly budget across all expense categories */
  categoryId: uuidSchema.nullable(),
  amount: amountSchema,
  alertThresholdPercent: z.coerce.number().int().min(1).max(100).default(80),
});
export type BudgetCreateInput = z.infer<typeof budgetCreateSchema>;
export const budgetUpdateSchema = z.object({
  amount: amountSchema.optional(),
  alertThresholdPercent: z.coerce.number().int().min(1).max(100).optional(),
});
export type BudgetUpdateInput = z.infer<typeof budgetUpdateSchema>;

export const preferencesUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    baseCurrency: currencySchema,
    locale: z.enum(SUPPORTED_LOCALES),
    timezone: timeZoneSchema,
    budgetWarningPercent: z.coerce.number().int().min(1).max(100),
    weekStartsOn: z.coerce.number().int().min(0).max(6),
    emailNotifications: z.boolean(),
    pushNotifications: z.boolean(),
  })
  .partial()
  .strict();
export type PreferencesUpdateInput = z.infer<typeof preferencesUpdateSchema>;

export const consentUpdateSchema = z.object({
  type: z.enum(OPTIONAL_CONSENT_TYPES),
  granted: z.boolean(),
});
export type ConsentUpdateInput = z.infer<typeof consentUpdateSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required").max(128),
  confirmation: z.literal("DELETE", { error: "Type DELETE to confirm" }),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const reportQuerySchema = z.object({ month: monthKeySchema.optional() });
export const trendQuerySchema = z.object({
  month: monthKeySchema.optional(),
  months: z.coerce.number().int().min(1).max(24).default(6),
});

/** Flatten zod errors into { field: message } for forms and API responses. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
