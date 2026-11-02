import { describe, expect, it } from "vitest";
import { fieldErrors, registerSchema, transactionCreateSchema, transactionQuerySchema } from "./schemas.js";

describe("transactionCreateSchema", () => {
  const valid = { type: "EXPENSE", amount: "499.00", currency: "INR", transactionDate: "2026-11-02" };

  it("accepts a minimal valid expense", () => {
    expect(transactionCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects numeric amounts, zero and negatives", () => {
    expect(transactionCreateSchema.safeParse({ ...valid, amount: 499 }).success).toBe(false);
    expect(transactionCreateSchema.safeParse({ ...valid, amount: "0" }).success).toBe(false);
    expect(transactionCreateSchema.safeParse({ ...valid, amount: "-5" }).success).toBe(false);
  });

  it("rejects exponent and other malformed strings without throwing", () => {
    for (const amount of ["1e3", "abc", "1,000", "", " "]) {
      expect(() => transactionCreateSchema.safeParse({ ...valid, amount })).not.toThrow();
      expect(transactionCreateSchema.safeParse({ ...valid, amount }).success).toBe(false);
    }
  });

  it("rejects unsupported currencies and impossible dates", () => {
    expect(transactionCreateSchema.safeParse({ ...valid, currency: "XYZ" }).success).toBe(false);
    expect(transactionCreateSchema.safeParse({ ...valid, transactionDate: "2026-02-30" }).success).toBe(false);
  });

  it("does not allow manual TRANSFER creation in M1", () => {
    expect(transactionCreateSchema.safeParse({ ...valid, type: "TRANSFER" }).success).toBe(false);
  });

  it("normalises empty optional text to null", () => {
    const r = transactionCreateSchema.parse({ ...valid, merchant: "  " });
    expect(r.merchant).toBeNull();
  });
});

describe("registerSchema", () => {
  it("requires consent to terms and privacy", () => {
    const r = registerSchema.safeParse({ name: "A", email: "a@example.com", password: "longpassword1" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const f = fieldErrors(r.error);
      expect(f.acceptTerms).toBeDefined();
      expect(f.acceptPrivacy).toBeDefined();
    }
  });

  it("enforces password strength", () => {
    const r = registerSchema.safeParse({
      name: "A",
      email: "a@example.com",
      password: "short",
      acceptTerms: true,
      acceptPrivacy: true,
    });
    expect(r.success).toBe(false);
  });

  it("lower-cases email", () => {
    const r = registerSchema.parse({
      name: "A",
      email: "Asha@Example.COM",
      password: "longpassword1",
      acceptTerms: true,
      acceptPrivacy: true,
    });
    expect(r.email).toBe("asha@example.com");
  });
});

describe("transactionQuerySchema", () => {
  it("applies defaults and coerces pagination", () => {
    const q = transactionQuerySchema.parse({ page: "2" });
    expect(q).toMatchObject({ page: 2, pageSize: 25, sort: "date_desc" });
  });
  it("rejects inverted ranges", () => {
    expect(transactionQuerySchema.safeParse({ from: "2026-11-10", to: "2026-11-01" }).success).toBe(false);
  });
});
