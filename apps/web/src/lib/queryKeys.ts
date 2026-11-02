export const qk = {
  me: ["me"] as const,
  categories: ["categories"] as const,
  dashboard: (month?: string) => ["dashboard", month ?? "current"] as const,
  transactions: (params: Record<string, unknown>) => ["transactions", params] as const,
  budgets: (month?: string) => ["budgets", month ?? "current"] as const,
  report: (month?: string) => ["report", month ?? "current"] as const,
  trend: (month: string | undefined, months: number) => ["trend", month ?? "current", months] as const,
  consents: ["consents"] as const,
  sessions: ["sessions"] as const,
  activity: ["activity"] as const,
  plans: ["plans"] as const,
  admin: ["admin-overview"] as const,
};

/** Query prefixes that depend on financial records; invalidate after any mutation. */
export const FINANCIAL_KEYS = [["dashboard"], ["transactions"], ["budgets"], ["report"], ["trend"]] as const;
