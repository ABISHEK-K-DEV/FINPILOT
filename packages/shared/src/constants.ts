export const TRANSACTION_TYPES = ["EXPENSE", "INCOME", "TRANSFER"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/** Types a user can create manually in Milestone 1 (transfers arrive with accounts in a later milestone). */
export const MANUAL_TRANSACTION_TYPES = ["EXPENSE", "INCOME"] as const;
export type ManualTransactionType = (typeof MANUAL_TRANSACTION_TYPES)[number];

export const CATEGORY_KINDS = ["EXPENSE", "INCOME"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const PAYMENT_METHODS = [
  "CASH",
  "UPI",
  "DEBIT_CARD",
  "CREDIT_CARD",
  "NET_BANKING",
  "WALLET",
  "BANK_TRANSFER",
  "OTHER",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  DEBIT_CARD: "Debit card",
  CREDIT_CARD: "Credit card",
  NET_BANKING: "Net banking",
  WALLET: "Wallet",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Other",
};

export const TRANSACTION_SOURCES = ["MANUAL", "RECEIPT_SCAN", "IMPORT", "SAMPLE"] as const;
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];

export const USER_ROLES = ["USER", "SUPPORT", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** ISO-4217 currencies supported at launch. India first, global-ready. */
export const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const SUPPORTED_LOCALES = ["en-IN", "hi-IN", "en-US", "en-GB", "en-AE", "en-SG", "en-AU", "en-CA", "ja-JP"] as const;
export type LocaleCode = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = "INR";
export const DEFAULT_LOCALE: LocaleCode = "en-IN";
export const DEFAULT_TIMEZONE = "Asia/Kolkata";
export const DEFAULT_BUDGET_WARNING_PERCENT = 80;

/** User-toggleable consents. TERMS and PRIVACY are required at registration. */
export const CONSENT_TYPES = [
  "TERMS_OF_SERVICE",
  "PRIVACY_POLICY",
  "AI_PROCESSING",
  "DOCUMENT_PROCESSING",
  "EMAIL_REMINDERS",
  "PRODUCT_ANALYTICS",
  "MARKETING_EMAIL",
] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];
export const OPTIONAL_CONSENT_TYPES = [
  "AI_PROCESSING",
  "DOCUMENT_PROCESSING",
  "EMAIL_REMINDERS",
  "PRODUCT_ANALYTICS",
  "MARKETING_EMAIL",
] as const satisfies readonly ConsentType[];
export type OptionalConsentType = (typeof OPTIONAL_CONSENT_TYPES)[number];

export const CONSENT_DESCRIPTIONS: Record<ConsentType, { title: string; description: string }> = {
  TERMS_OF_SERVICE: { title: "Terms of service", description: "Required to use FinPilot." },
  PRIVACY_POLICY: { title: "Privacy policy", description: "Required. Explains what we store and why." },
  AI_PROCESSING: {
    title: "AI analysis of my records",
    description: "Allow the AI assistant to read your FinPilot records to answer your questions. Off by default.",
  },
  DOCUMENT_PROCESSING: {
    title: "Receipt & bill processing",
    description: "Allow OCR/AI extraction of documents you upload. Needed for the scanner (Milestone 2).",
  },
  EMAIL_REMINDERS: { title: "Email reminders", description: "Bill, renewal and budget reminders by email." },
  PRODUCT_ANALYTICS: {
    title: "Anonymous product analytics",
    description: "Usage metrics without financial content, to improve FinPilot.",
  },
  MARKETING_EMAIL: { title: "Product news", description: "Occasional product updates. Never third-party advertising." },
};

/** Current versions of legal documents; bump to re-request consent. */
export const LEGAL_VERSIONS = { TERMS_OF_SERVICE: "2026-11-01", PRIVACY_POLICY: "2026-11-01" } as const;

export const CATEGORY_ICONS = [
  "utensils",
  "shopping-bag",
  "plane",
  "car",
  "film",
  "zap",
  "graduation-cap",
  "heart-pulse",
  "home",
  "receipt",
  "shield",
  "gift",
  "briefcase",
  "laptop",
  "trending-up",
  "rotate-ccw",
  "wallet",
  "circle",
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export interface DefaultCategory {
  slug: string;
  name: string;
  kind: CategoryKind;
  icon: CategoryIcon;
  color: string;
}

/** System categories available to every user. */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { slug: "food", name: "Food & Dining", kind: "EXPENSE", icon: "utensils", color: "#F97316" },
  { slug: "groceries", name: "Groceries", kind: "EXPENSE", icon: "shopping-bag", color: "#84CC16" },
  { slug: "shopping", name: "Shopping", kind: "EXPENSE", icon: "shopping-bag", color: "#EC4899" },
  { slug: "travel", name: "Travel", kind: "EXPENSE", icon: "plane", color: "#06B6D4" },
  { slug: "transport", name: "Transport", kind: "EXPENSE", icon: "car", color: "#6366F1" },
  { slug: "entertainment", name: "Entertainment", kind: "EXPENSE", icon: "film", color: "#A855F7" },
  { slug: "utilities", name: "Utilities", kind: "EXPENSE", icon: "zap", color: "#EAB308" },
  { slug: "education", name: "Education", kind: "EXPENSE", icon: "graduation-cap", color: "#0EA5E9" },
  { slug: "health", name: "Health", kind: "EXPENSE", icon: "heart-pulse", color: "#EF4444" },
  { slug: "housing", name: "Rent & Housing", kind: "EXPENSE", icon: "home", color: "#14B8A6" },
  { slug: "insurance", name: "Insurance", kind: "EXPENSE", icon: "shield", color: "#64748B" },
  { slug: "subscriptions", name: "Subscriptions", kind: "EXPENSE", icon: "receipt", color: "#8B5CF6" },
  { slug: "other-expense", name: "Other", kind: "EXPENSE", icon: "circle", color: "#94A3B8" },
  { slug: "salary", name: "Salary", kind: "INCOME", icon: "briefcase", color: "#16A34A" },
  { slug: "freelance", name: "Freelance", kind: "INCOME", icon: "laptop", color: "#22C55E" },
  { slug: "investment-income", name: "Interest & Dividends", kind: "INCOME", icon: "trending-up", color: "#10B981" },
  { slug: "refund", name: "Refunds", kind: "INCOME", icon: "rotate-ccw", color: "#059669" },
  { slug: "gift-income", name: "Gifts", kind: "INCOME", icon: "gift", color: "#34D399" },
  { slug: "other-income", name: "Other income", kind: "INCOME", icon: "wallet", color: "#4ADE80" },
];

export const PLAN_CODES = ["FREE", "PREMIUM", "BUSINESS"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];
