import { describe, expect, it } from "vitest";
import {
  addMonths,
  daysInMonth,
  isValidDateString,
  isValidMonthKey,
  isValidTimeZone,
  monthRange,
  monthsEndingWith,
  todayInTimeZone,
} from "./dates.js";

describe("dates", () => {
  it("validates calendar dates including leap years", () => {
    expect(isValidDateString("2024-02-29")).toBe(true);
    expect(isValidDateString("2025-02-29")).toBe(false);
    expect(isValidDateString("2026-13-01")).toBe(false);
    expect(isValidDateString("2026-1-01")).toBe(false);
    expect(isValidDateString("1800-01-01")).toBe(false);
  });

  it("validates month keys", () => {
    expect(isValidMonthKey("2026-11")).toBe(true);
    expect(isValidMonthKey("2026-00")).toBe(false);
  });

  it("computes month ranges", () => {
    expect(monthRange("2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(monthRange("2024-02")).toEqual({ start: "2024-02-01", end: "2024-02-29" });
    expect(daysInMonth("2026-12")).toBe(31);
  });

  it("adds months across year boundaries", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-11", 3)).toBe("2027-02");
    expect(monthsEndingWith("2026-02", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });

  it("resolves today in the user's time zone, not the server's", () => {
    // 2026-10-31T20:00Z is already Nov 1st in India (UTC+5:30) but still Oct 31st in New York.
    const instant = new Date("2026-10-31T20:00:00Z");
    expect(todayInTimeZone("Asia/Kolkata", instant)).toBe("2026-11-01");
    expect(todayInTimeZone("America/New_York", instant)).toBe("2026-10-31");
  });

  it("validates time zones", () => {
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });
});
