import { describe, expect, it } from "vitest";
import { averageDaily, compareAmounts, monthlyTrend, summarizeTransactions, type TransactionLike } from "./reports.js";

const tx = (o: Partial<TransactionLike>): TransactionLike => ({
  type: "EXPENSE",
  amount: "0",
  currency: "INR",
  categoryId: null,
  transactionDate: "2026-11-01",
  ...o,
});

describe("summarizeTransactions", () => {
  const txs = [
    tx({ type: "INCOME", amount: "50000", categoryId: "salary" }),
    tx({ amount: "1200.10", categoryId: "food" }),
    tx({ amount: "799.90", categoryId: "food" }),
    tx({ amount: "3000", categoryId: "rent" }),
    tx({ amount: "0.1", categoryId: null }),
    tx({ amount: "0.2", categoryId: null }),
    tx({ amount: "100", currency: "USD", categoryId: "food" }),
    tx({ type: "TRANSFER", amount: "5000" }),
  ];
  const s = summarizeTransactions(txs, "INR");

  it("totals income and expenses exactly, ignoring transfers", () => {
    expect(s.income).toBe("50000.0000");
    expect(s.expenses).toBe("5000.3000");
    expect(s.net).toBe("44999.7000");
  });

  it("excludes other currencies and reports how many were excluded", () => {
    expect(s.excludedOtherCurrencyCount).toBe(1);
    expect(s.transactionCount).toBe(7);
  });

  it("groups by category sorted by total", () => {
    expect(s.expensesByCategory.map((c) => c.categoryId)).toEqual(["rent", "food", null]);
    expect(s.expensesByCategory[1]).toMatchObject({ total: "2000.0000", count: 2 });
    expect(s.expensesByCategory[2]?.total).toBe("0.3000");
    expect(s.expensesByCategory[0]?.sharePercent).toBe(60);
  });

  it("computes savings rate", () => {
    expect(s.savingsRatePercent).toBe(90);
  });

  it("returns null savings rate without income and handles empty input", () => {
    const empty = summarizeTransactions([], "INR");
    expect(empty.savingsRatePercent).toBeNull();
    expect(empty.expenses).toBe("0.0000");
    expect(empty.expensesByCategory).toEqual([]);
  });
});

describe("monthlyTrend", () => {
  it("buckets by month and fills empty months with zero", () => {
    const points = monthlyTrend(
      [
        tx({ amount: "10", transactionDate: "2026-09-30" }),
        tx({ amount: "20", transactionDate: "2026-11-01" }),
        tx({ type: "INCOME", amount: "100", transactionDate: "2026-11-15" }),
        tx({ amount: "999", transactionDate: "2026-08-31" }), // outside range
      ],
      ["2026-09", "2026-10", "2026-11"],
      "INR",
    );
    expect(points.map((p) => p.expenses)).toEqual(["10.0000", "0.0000", "20.0000"]);
    expect(points[2]?.net).toBe("80.0000");
  });
});

describe("compareAmounts", () => {
  it("computes differences and percentage change", () => {
    expect(compareAmounts("1200", "1000")).toMatchObject({ difference: "200.0000", percentChange: 20 });
    expect(compareAmounts("800", "1000").percentChange).toBe(-20);
    expect(compareAmounts("100", "0").percentChange).toBeNull();
  });
});

describe("averageDaily", () => {
  it("divides safely", () => {
    expect(averageDaily("3000", 30)).toBe("100.0000");
    expect(averageDaily("3000", 0)).toBeNull();
  });
});
