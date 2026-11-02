/**
 * API data-transfer types. Money is always a decimal string; dates are YYYY-MM-DD.
 * These types are shared with the web client and a future React Native client.
 */
import type { BudgetProgress } from "./budget.js";
import type { MonthTrendPoint, PeriodSummary, ChangeComparison } from "./reports.js";
import type {
  CategoryIcon,
  CategoryKind,
  ConsentType,
  CurrencyCode,
  LocaleCode,
  PaymentMethod,
  PlanCode,
  TransactionSource,
  TransactionType,
  UserRole,
} from "./constants.js";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
    requestId?: string;
  };
}

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  plan: PlanCode;
  createdAt: string;
  preferences: PreferencesDTO;
}

export interface PreferencesDTO {
  baseCurrency: CurrencyCode;
  locale: LocaleCode;
  timezone: string;
  budgetWarningPercent: number;
  weekStartsOn: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  kind: CategoryKind;
  icon: CategoryIcon;
  color: string;
  isSystem: boolean;
}

export interface TransactionDTO {
  id: string;
  type: TransactionType;
  amount: string;
  currency: CurrencyCode;
  transactionDate: string;
  categoryId: string | null;
  accountId: string | null;
  merchant: string | null;
  description: string | null;
  notes: string | null;
  paymentMethod: PaymentMethod | null;
  tags: string[];
  source: TransactionSource;
  /** True for clearly-labelled demonstration data that the user chose to load. */
  isSample: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface BudgetDTO {
  id: string;
  categoryId: string | null;
  amount: string;
  currency: CurrencyCode;
  alertThresholdPercent: number;
  /** Created by "load sample data"; editing the amount turns it into a real budget. */
  isSample: boolean;
  createdAt: string;
}

export interface BudgetWithProgressDTO extends BudgetDTO {
  month: string;
  progress: BudgetProgress;
}

export interface MonthlyReportDTO {
  month: string;
  today: string;
  summary: PeriodSummary;
  previous: PeriodSummary;
  expenseChange: ChangeComparison;
  incomeChange: ChangeComparison;
  averageDailyExpense: string | null;
  largestExpenses: TransactionDTO[];
  sampleTransactionCount: number;
}

export interface TrendDTO {
  currency: CurrencyCode;
  points: MonthTrendPoint[];
}

export interface DashboardDTO {
  month: string;
  today: string;
  currency: CurrencyCode;
  report: MonthlyReportDTO;
  trend: MonthTrendPoint[];
  budgets: BudgetWithProgressDTO[];
  recentTransactions: TransactionDTO[];
  hasAnyTransactions: boolean;
  hasSampleData: boolean;
  /** Features that are not built yet; the UI shows honest empty states rather than invented numbers. */
  upcoming: { recurringPayments: null; subscriptions: null; bills: null };
}

export interface ConsentDTO {
  type: ConsentType;
  granted: boolean;
  version: string | null;
  updatedAt: string | null;
}

export interface PlanDTO {
  code: PlanCode;
  name: string;
  description: string;
  priceMonthly: string;
  priceYearly: string;
  currency: CurrencyCode;
  features: string[];
  limits: Record<string, number | null>;
}

export interface AdminOverviewDTO {
  users: { total: number; active30d: number; byRole: Record<string, number>; byPlan: Record<string, number> };
  records: { transactions: number; budgets: number; customCategories: number };
  security: { failedLoginsLast24h: number; lockedAccounts: number; activeSessions: number };
  recentAuditEvents: { action: string; count: number }[];
  generatedAt: string;
  note: string;
}
