import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, del, patch, post, registerUser } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

const base = { type: "EXPENSE", amount: "100", currency: "INR", transactionDate: "2026-10-15" };

describe("sample data", () => {
  it("is opt-in, clearly labelled, and removable without touching real records", async () => {
    const u = await registerUser();
    const real = (await post(u.agent, "/api/v1/transactions", { ...base, merchant: "My real purchase" })).body.transaction;

    const loaded = await post(u.agent, "/api/v1/me/sample-data", {});
    expect(loaded.status).toBe(201);
    expect(loaded.body.transactions).toBeGreaterThan(20);

    const samples = await u.agent.get("/api/v1/transactions?sample=only&pageSize=100");
    expect(samples.body.items.every((t: { isSample: boolean; source: string }) => t.isSample && t.source === "SAMPLE")).toBe(true);
    expect((await u.agent.get("/api/v1/dashboard")).body.hasSampleData).toBe(true);
    const budgets = (await u.agent.get("/api/v1/budgets")).body.items;
    expect(budgets.length).toBeGreaterThan(0);
    expect(budgets.every((b: { isSample: boolean }) => b.isSample)).toBe(true);

    // Loading twice does not duplicate.
    await post(u.agent, "/api/v1/me/sample-data", {});
    expect((await u.agent.get("/api/v1/transactions?sample=only")).body.total).toBe(loaded.body.transactions);

    const removed = await del(u.agent, "/api/v1/me/sample-data");
    expect(removed.body.transactions).toBe(loaded.body.transactions);
    const remaining = await u.agent.get("/api/v1/transactions");
    expect(remaining.body.items.map((t: { id: string }) => t.id)).toEqual([real.id]);
    expect((await u.agent.get("/api/v1/budgets")).body.items).toEqual([]);
  });
});

describe("preferences & consent", () => {
  it("updates preferences with validation", async () => {
    const u = await registerUser();
    const ok = await patch(u.agent, "/api/v1/me/preferences", { baseCurrency: "USD", timezone: "America/New_York", name: "New Name" });
    expect(ok.status).toBe(200);
    expect(ok.body.user).toMatchObject({ name: "New Name", preferences: { baseCurrency: "USD", timezone: "America/New_York" } });
    expect((await patch(u.agent, "/api/v1/me/preferences", { timezone: "Mars/Base" })).status).toBe(400);
    expect((await patch(u.agent, "/api/v1/me/preferences", { role: "ADMIN" })).status).toBe(400);
  });

  it("records consent history and defaults optional consents to off", async () => {
    const u = await registerUser();
    const initial = await u.agent.get("/api/v1/me/consents");
    const ai = initial.body.items.find((c: { type: string }) => c.type === "AI_PROCESSING");
    expect(ai.granted).toBe(false);

    await post(u.agent, "/api/v1/me/consents", { type: "AI_PROCESSING", granted: true });
    const after = await post(u.agent, "/api/v1/me/consents", { type: "AI_PROCESSING", granted: false });
    expect(after.body.items.find((c: { type: string }) => c.type === "AI_PROCESSING").granted).toBe(false);
    expect(await prisma.consentRecord.count({ where: { userId: u.id, type: "AI_PROCESSING" } })).toBe(2);
    // Required consents cannot be revoked through this endpoint.
    expect((await post(u.agent, "/api/v1/me/consents", { type: "PRIVACY_POLICY", granted: false })).status).toBe(400);
  });
});

describe("data export", () => {
  it("exports the user's own data only, with decrypted notes", async () => {
    const u = await registerUser();
    const other = await registerUser();
    await post(u.agent, "/api/v1/transactions", { ...base, notes: "secret note" });
    await post(other.agent, "/api/v1/transactions", { ...base, merchant: "Other user's shop" });
    const res = await u.agent.get("/api/v1/me/export");
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toMatch(/attachment/);
    expect(res.body.profile.email).toBe(u.email);
    expect(res.body.transactions).toHaveLength(1);
    expect(res.body.transactions[0]).toMatchObject({ amount: "100.0000", notes: "secret note" });
    expect(JSON.stringify(res.body)).not.toContain("Other user's shop");
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });
});

describe("account deletion", () => {
  it("requires password + confirmation and removes all user data", async () => {
    const u = await registerUser();
    await post(u.agent, "/api/v1/transactions", base);
    await post(u.agent, "/api/v1/budgets", { categoryId: null, amount: "100" });

    expect((await del(u.agent, "/api/v1/me", { password: u.password, confirmation: "delete" })).status).toBe(400);
    expect((await del(u.agent, "/api/v1/me", { password: "wrong-password-9", confirmation: "DELETE" })).status).toBe(400);

    const res = await del(u.agent, "/api/v1/me", { password: u.password, confirmation: "DELETE" });
    expect(res.status).toBe(204);
    expect(await prisma.user.findUnique({ where: { id: u.id } })).toBeNull();
    expect(await prisma.transaction.count({ where: { userId: u.id } })).toBe(0);
    expect(await prisma.budget.count({ where: { userId: u.id } })).toBe(0);
    expect(await prisma.session.count({ where: { userId: u.id } })).toBe(0);
    // Audit trail survives without linkage to the deleted user.
    expect(await prisma.auditLog.count({ where: { userId: u.id } })).toBe(0);
    expect(await prisma.auditLog.findFirst({ where: { action: "account.deleted" } })).not.toBeNull();
    expect((await u.agent.get("/api/v1/auth/me")).status).toBe(401);
  });
});

describe("role-based access control", () => {
  it("blocks non-admins and shows admins aggregate data only", async () => {
    const user = await registerUser();
    await post(user.agent, "/api/v1/transactions", { ...base, merchant: "Very private merchant" });
    const denied = await user.agent.get("/api/v1/admin/overview");
    expect(denied.status).toBe(403);
    expect(await prisma.auditLog.findFirst({ where: { userId: user.id, action: "rbac.denied" } })).not.toBeNull();

    const admin = await registerUser({ email: "rbac-admin@test.local" });
    const res = await admin.agent.get("/api/v1/admin/overview");
    expect(res.status).toBe(200);
    expect(res.body.users.total).toBeGreaterThan(0);
    const text = JSON.stringify(res.body);
    expect(text).not.toContain("Very private merchant");
    expect(text).not.toContain(user.email);
  });
});

describe("plans", () => {
  it("lists configurable plans publicly", async () => {
    const res = await request(app).get("/api/v1/plans");
    expect(res.body.items.map((p: { code: string }) => p.code)).toEqual(["FREE", "PREMIUM", "BUSINESS"]);
    expect(res.body.items[1].priceMonthly).toBe("149.0000");
  });
});
