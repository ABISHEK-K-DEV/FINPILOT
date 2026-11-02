import { describe, expect, it } from "vitest";
import {
  add,
  compare,
  currencyMinorUnits,
  divide,
  formatMoney,
  isValidAmountString,
  multiply,
  normaliseAmount,
  percentage,
  roundToCurrency,
  subtract,
  sum,
  toDecimal,
} from "./money.js";

describe("money arithmetic", () => {
  it("avoids floating point errors (0.1 + 0.2)", () => {
    expect(add("0.1", "0.2")).toBe("0.3000");
    expect(sum(["0.1", "0.2", "0.3"])).toBe("0.6000");
  });

  it("sums many paise-level values exactly", () => {
    const values = Array.from({ length: 1000 }, () => "0.01");
    expect(sum(values)).toBe("10.0000");
  });

  it("sums an empty list to zero", () => {
    expect(sum([])).toBe("0.0000");
  });

  it("subtracts and can go negative", () => {
    expect(subtract("100", "100.01")).toBe("-0.0100");
  });

  it("multiplies and divides", () => {
    expect(multiply("19.99", "3")).toBe("59.9700");
    expect(divide("100", "3")).toBe("33.3333");
    expect(divide("100", "0")).toBeNull();
  });

  it("handles large amounts without precision loss", () => {
    expect(add("9999999999999.9999", "0.0001")).toBe("10000000000000.0000");
  });

  it("rejects JS numbers and invalid strings", () => {
    expect(() => toDecimal(1.5 as unknown as string)).toThrow(TypeError);
    expect(() => toDecimal("1e5")).toThrow(RangeError);
    expect(() => toDecimal("abc")).toThrow(RangeError);
  });

  it("compares", () => {
    expect(compare("10.00", "10")).toBe(0);
    expect(compare("10.01", "10")).toBe(1);
    expect(compare("9.99", "10")).toBe(-1);
  });

  it("computes percentages", () => {
    expect(percentage("25", "200")).toBe(12.5);
    expect(percentage("1", "3", 2)).toBe(33.33);
    expect(percentage("1", "0")).toBeNull();
  });
});

describe("amount validation", () => {
  it.each(["0", "1", "1499.5", "1499.50", "0.0001", "9999999999999.9999"])("accepts %s", (v) => {
    expect(isValidAmountString(v)).toBe(true);
  });
  it.each(["", "-1", "01", "1.23456", "1,000", "1e3", "10000000000000", " 1"])("rejects %s", (v) => {
    expect(isValidAmountString(v)).toBe(false);
  });
});

describe("currency rounding & formatting", () => {
  it("knows minor units", () => {
    expect(currencyMinorUnits("INR")).toBe(2);
    expect(currencyMinorUnits("JPY")).toBe(0);
  });

  it("rounds half-up to currency precision", () => {
    expect(roundToCurrency("10.005", "INR")).toBe("10.01");
    expect(roundToCurrency("10.004", "INR")).toBe("10.00");
    expect(roundToCurrency("150.5", "JPY")).toBe("151");
  });

  it("normalises to storage scale", () => {
    expect(normaliseAmount("12.5")).toBe("12.5000");
  });

  it("formats INR with Indian digit grouping", () => {
    expect(formatMoney("1234567.891", "INR", "en-IN")).toBe("₹12,34,567.89");
  });

  it("formats USD", () => {
    expect(formatMoney("1234.5", "USD", "en-US")).toBe("$1,234.50");
  });
});
