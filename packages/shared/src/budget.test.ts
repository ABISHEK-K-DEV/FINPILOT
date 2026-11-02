import { describe, expect, it } from "vitest";
import { computeBudgetProgress, statusFor } from "./budget.js";

const base = { month: "2026-11", warningThresholdPercent: 80 } as const;

describe("computeBudgetProgress", () => {
  it("is on track below the threshold", () => {
    const p = computeBudgetProgress({ ...base, limit: "10000", spent: "2500", today: "2026-11-15" });
    expect(p.remaining).toBe("7500.0000");
    expect(p.percentUsed).toBe(25);
    expect(p.status).toBe("ON_TRACK");
    expect(p.periodState).toBe("CURRENT");
    expect(p.daysElapsed).toBe(15);
    expect(p.daysInPeriod).toBe(30);
    expect(p.daysRemaining).toBe(16); // including today
    // 2500 / 15 * 30 = 5000
    expect(p.projectedSpend).toBe("5000.0000");
    expect(p.projectedStatus).toBe("ON_TRACK");
    // 7500 / 16 = 468.75
    expect(p.dailyAllowance).toBe("468.7500");
  });

  it("warns at the threshold", () => {
    const p = computeBudgetProgress({ ...base, limit: "1000", spent: "800", today: "2026-11-28" });
    expect(p.status).toBe("WARNING");
  });

  it("flags exceeded budgets with a negative remainder", () => {
    const p = computeBudgetProgress({ ...base, limit: "1000", spent: "1000.01", today: "2026-11-28" });
    expect(p.status).toBe("EXCEEDED");
    expect(p.remaining).toBe("-0.0100");
    expect(p.dailyAllowance).toBeNull();
  });

  it("exactly at 100% is a warning, not exceeded", () => {
    const p = computeBudgetProgress({ ...base, limit: "1000", spent: "1000", today: "2026-11-28" });
    expect(p.status).toBe("WARNING");
    expect(p.remaining).toBe("0.0000");
  });

  it("projects an overspend early in the month", () => {
    const p = computeBudgetProgress({ ...base, limit: "3000", spent: "1000", today: "2026-11-05" });
    // 1000 / 5 * 30 = 6000
    expect(p.projectedSpend).toBe("6000.0000");
    expect(p.projectedStatus).toBe("EXCEEDED");
    expect(p.status).toBe("ON_TRACK");
  });

  it("uses actuals for past months", () => {
    const p = computeBudgetProgress({ ...base, limit: "3000", spent: "2900", today: "2026-12-02" });
    expect(p.periodState).toBe("PAST");
    expect(p.projectedSpend).toBe("2900.0000");
    expect(p.daysRemaining).toBe(0);
    expect(p.dailyAllowance).toBeNull();
  });

  it("does not project future months", () => {
    const p = computeBudgetProgress({ ...base, limit: "3000", spent: "0", today: "2026-10-20" });
    expect(p.periodState).toBe("FUTURE");
    expect(p.projectedSpend).toBeNull();
    expect(p.projectedStatus).toBeNull();
  });

  it("handles February leap years", () => {
    const p = computeBudgetProgress({ ...base, month: "2028-02", limit: "2900", spent: "100", today: "2028-02-01" });
    expect(p.daysInPeriod).toBe(29);
    expect(p.projectedSpend).toBe("2900.0000");
  });

  it("keeps decimal precision", () => {
    const p = computeBudgetProgress({ ...base, limit: "0.3", spent: "0.1", today: "2026-11-30" });
    expect(p.remaining).toBe("0.2000");
  });

  it("rejects invalid input", () => {
    expect(() => computeBudgetProgress({ ...base, limit: "0", spent: "0", today: "2026-11-01" })).toThrow();
    expect(() => computeBudgetProgress({ ...base, limit: "10", spent: "-1", today: "2026-11-01" })).toThrow();
    expect(() =>
      computeBudgetProgress({ ...base, warningThresholdPercent: 0, limit: "10", spent: "1", today: "2026-11-01" }),
    ).toThrow();
  });

  it("treats 79.99% as on track even though it rounds to 80.0%", () => {
    const p = computeBudgetProgress({ ...base, limit: "10000", spent: "7999.99", today: "2026-11-28" });
    expect(p.percentUsed).toBe(80);
    expect(p.status).toBe("ON_TRACK");
  });

  it("statusFor thresholds", () => {
    expect(statusFor(79.9, 80)).toBe("ON_TRACK");
    expect(statusFor(80, 80)).toBe("WARNING");
    expect(statusFor(100.1, 80)).toBe("EXCEEDED");
  });
});
