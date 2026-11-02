import { describe, expect, it } from "vitest";
import { del, patch, post, registerUser, systemCategoryId } from "./helpers.js";

async function seed(agent: Parameters<typeof post>[0], rows: Record<string, unknown>[]) {
  for (const r of rows) {
    const res = await post(agent, "/api/v1/transactions", { currency: "INR", type: "EXPENSE", ...r });
    if (res.status !== 201) throw new Error(JSON.stringify(res.body));
  }
}

describe("monthly report", () => {
  it("computes exact decimal totals, category shares and month-over-month change", async () => {
    const u = await registerUser();
    const food = await systemCategoryId(u.agent, "food");
    const salary = await systemCategoryId(u.agent, "salary");
    await seed(u.agent, [
      { type: "INCOME", amount: "50000", categoryId: salary, transactionDate: "2026-10-01" },
      { amount: "0.1", categoryId: food, transactionDate: "2026-10-02" },
      { amount: "0.2", categoryId: food, transactionDate: "2026-10-03" },
      { amount: "999.70", transactionDate: "2026-10-31" },
      { amount: "100", currency: "USD", transactionDate: "2026-10-10" },
      { amount: "500", transactionDate: "2026-09-15" },
      { amount: "7777", transactionDate: "2026-11-01" },
    ]);

    const res = await u.agent.get("/api/v1/reports/monthly?month=2026-10");
    expect(res.status).toBe(200);
    const { summary, expenseChange } = res.body.report;
    expect(summary.expenses).toBe("1000.0000");
    expect(summary.income).toBe("50000.0000");
    expect(summary.net).toBe("49000.0000");
    expect(summary.savingsRatePercent).toBe(98);
    expect(summary.excludedOtherCurrencyCount).toBe(1);
    const foodRow = summary.expensesByCategory.find((c: { categoryId: string }) => c.categoryId === food);
    expect(foodRow).toMatchObject({ total: "0.3000", count: 2 });
    expect(expenseChange).toMatchObject({ previous: "500.0000", difference: "500.0000", percentChange: 100 });
    expect(res.body.report.averageDailyExpense).toBe("32.2581"); // full past month: 1000 / 31
    expect(res.body.report.largestExpenses[0].amount).toBe("999.7000");
  });

  it("returns a 6-month trend with zero-filled months", async () => {
    const u = await registerUser();
    await seed(u.agent, [{ amount: "100", transactionDate: "2026-08-10" }, { amount: "250.25", transactionDate: "2026-10-10" }]);
    const res = await u.agent.get("/api/v1/reports/trend?month=2026-10&months=3");
    expect(res.body.points.map((p: { month: string; expenses: string }) => [p.month, p.expenses])).toEqual([
      ["2026-08", "100.0000"],
      ["2026-09", "0.0000"],
      ["2026-10", "250.2500"],
    ]);
  });

  it("exports CSV with formula-injection protection", async () => {
    const u = await registerUser();
    await seed(u.agent, [{ amount: "10", merchant: "=HYPERLINK(\"http://evil\")", description: "a,b", transactionDate: "2026-10-05" }]);
    const res = await u.agent.get("/api/v1/reports/monthly.csv?month=2026-10");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.text).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(res.text).toContain('"a,b"');
    expect(res.text).toContain("10.0000");
  });

  it("rejects invalid months", async () => {
    const u = await registerUser();
    expect((await u.agent.get("/api/v1/reports/monthly?month=2026-13")).status).toBe(400);
  });
});

describe("budgets", () => {
  it("tracks progress per category and overall, in the budget currency", async () => {
    const u = await registerUser();
    const food = await systemCategoryId(u.agent, "food");
    const transport = await systemCategoryId(u.agent, "transport");

    const foodBudget = await post(u.agent, "/api/v1/budgets", { categoryId: food, amount: "1000", alertThresholdPercent: 75 });
    expect(foodBudget.status).toBe(201);
    expect(foodBudget.body.budget.currency).toBe("INR");
    await post(u.agent, "/api/v1/budgets", { categoryId: null, amount: "1500" });
    expect((await post(u.agent, "/api/v1/budgets", { categoryId: food, amount: "5" })).status).toBe(409);

    await seed(u.agent, [
      { amount: "800", categoryId: food, transactionDate: "2026-10-03" },
      { amount: "200.01", categoryId: food, transactionDate: "2026-10-04" },
      { amount: "300", categoryId: transport, transactionDate: "2026-10-05" },
      { amount: "5000", categoryId: food, currency: "USD", transactionDate: "2026-10-05" },
      { amount: "5000", categoryId: food, transactionDate: "2026-09-30" },
    ]);

    const res = await u.agent.get("/api/v1/budgets?month=2026-10");
    const byCat = Object.fromEntries(res.body.items.map((b: { categoryId: string | null }) => [b.categoryId ?? "overall", b]));
    expect(byCat[food].progress).toMatchObject({ spent: "1000.0100", remaining: "-0.0100", status: "EXCEEDED", periodState: "PAST" });
    expect(byCat.overall.progress).toMatchObject({ spent: "1300.0100", status: "WARNING" });

    const updated = await patch(u.agent, `/api/v1/budgets/${foodBudget.body.budget.id}`, { amount: "2000" });
    expect(updated.body.budget).toMatchObject({ amount: "2000.0000", alertThresholdPercent: 75 });
    expect((await del(u.agent, `/api/v1/budgets/${foodBudget.body.budget.id}`)).status).toBe(204);
  });

  it("rejects income categories for budgets and isolates budgets between users", async () => {
    const u = await registerUser();
    const other = await registerUser();
    const salary = await systemCategoryId(u.agent, "salary");
    expect((await post(u.agent, "/api/v1/budgets", { categoryId: salary, amount: "100" })).status).toBe(400);
    const b = (await post(u.agent, "/api/v1/budgets", { categoryId: null, amount: "100" })).body.budget;
    expect((await patch(other.agent, `/api/v1/budgets/${b.id}`, { amount: "1" })).status).toBe(404);
    expect((await del(other.agent, `/api/v1/budgets/${b.id}`)).status).toBe(404);
    expect((await other.agent.get("/api/v1/budgets")).body.items).toEqual([]);
  });
});

describe("dashboard", () => {
  it("never invents data for a new user and marks unbuilt features as null", async () => {
    const u = await registerUser();
    const res = await u.agent.get("/api/v1/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.hasAnyTransactions).toBe(false);
    expect(res.body.hasSampleData).toBe(false);
    expect(res.body.report.summary.expenses).toBe("0.0000");
    expect(res.body.recentTransactions).toEqual([]);
    expect(res.body.budgets).toEqual([]);
    expect(res.body.upcoming).toEqual({ recurringPayments: null, subscriptions: null, bills: null });
  });
});
