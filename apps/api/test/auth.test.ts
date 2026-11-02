import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, CLIENT_HEADER, post, registerUser } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

describe("registration", () => {
  it("requires terms and privacy consent", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .set(CLIENT_HEADER)
      .send({ name: "A", email: "noconsent@test.local", password: "correct-horse-42" });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty("acceptTerms");
    expect(res.body.error.fields).toHaveProperty("acceptPrivacy");
  });

  it("creates the user, preferences and consent records, and sets a secure session cookie", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .set(CLIENT_HEADER)
      .send({ name: "Asha", email: "Asha@Test.Local", password: "correct-horse-42", acceptTerms: true, acceptPrivacy: true });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("asha@test.local");
    expect(res.body.user.preferences.baseCurrency).toBe("INR");
    expect(res.body.user).not.toHaveProperty("passwordHash");
    const cookie = String(res.headers["set-cookie"]);
    expect(cookie).toMatch(/fp_session=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: "asha@test.local" }, include: { consents: true, sessions: true } });
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user.consents.map((c) => c.type).sort()).toEqual(["PRIVACY_POLICY", "TERMS_OF_SERVICE"]);
    // Only a hash of the session token is stored.
    const rawToken = cookie.match(/fp_session=([^;]+)/)?.[1];
    expect(user.sessions[0]?.tokenHash).not.toBe(rawToken);
    expect(user.sessions[0]?.tokenHash).toHaveLength(64);
  });

  it("rejects duplicate emails", async () => {
    const u = await registerUser();
    const res = await post(request.agent(app), "/api/v1/auth/register", {
      name: "Dup", email: u.email, password: "correct-horse-42", acceptTerms: true, acceptPrivacy: true,
    });
    expect(res.status).toBe(409);
  });

  it("promotes configured admin emails", async () => {
    const u = await registerUser({ email: "admin@test.local" });
    const me = await u.agent.get("/api/v1/auth/me");
    expect(me.body.user.role).toBe("ADMIN");
  });
});

describe("login, sessions and lockout", () => {
  it("logs in, reads /me, and logs out (revoking the session server-side)", async () => {
    const u = await registerUser();
    const agent = request.agent(app);
    const login = await post(agent, "/api/v1/auth/login", { email: u.email, password: u.password });
    expect(login.status).toBe(200);
    const token = String(login.headers["set-cookie"]).match(/fp_session=([^;]+)/)?.[1];
    expect((await agent.get("/api/v1/auth/me")).status).toBe(200);
    expect((await post(agent, "/api/v1/auth/logout", {})).status).toBe(204);
    expect((await agent.get("/api/v1/auth/me")).status).toBe(401);
    // A stolen copy of the old token is no longer valid either.
    const replay = await request(app).get("/api/v1/auth/me").set("Cookie", `fp_session=${token}`);
    expect(replay.status).toBe(401);
  });

  it("uses one generic message for unknown email and wrong password", async () => {
    const u = await registerUser();
    const a = await post(request.agent(app), "/api/v1/auth/login", { email: "nobody@test.local", password: "whatever-123" });
    const b = await post(request.agent(app), "/api/v1/auth/login", { email: u.email, password: "wrong-password-1" });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error.message).toBe(b.body.error.message);
  });

  it("locks the account after 5 failed attempts, even for the correct password", async () => {
    const u = await registerUser();
    for (let i = 0; i < 5; i++) {
      await post(request.agent(app), "/api/v1/auth/login", { email: u.email, password: "wrong-password-1" });
    }
    const locked = await post(request.agent(app), "/api/v1/auth/login", { email: u.email, password: u.password });
    expect(locked.status).toBe(401);
    const row = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(row.lockedUntil?.getTime()).toBeGreaterThan(Date.now());
    const audit = await prisma.auditLog.findFirst({ where: { userId: u.id, action: "auth.account.locked" } });
    expect(audit).not.toBeNull();
  });

  it("accepts Bearer tokens for future mobile clients", async () => {
    const u = await registerUser();
    const login = await post(request.agent(app), "/api/v1/auth/login", { email: u.email, password: u.password });
    const token = String(login.headers["set-cookie"]).match(/fp_session=([^;]+)/)?.[1];
    const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("change-password revokes other sessions", async () => {
    const u = await registerUser();
    const other = request.agent(app);
    await post(other, "/api/v1/auth/login", { email: u.email, password: u.password });
    const res = await post(u.agent, "/api/v1/auth/change-password", { currentPassword: u.password, newPassword: "brand-new-pass-77" });
    expect(res.status).toBe(204);
    expect((await other.get("/api/v1/auth/me")).status).toBe(401);
    expect((await u.agent.get("/api/v1/auth/me")).status).toBe(200);
  });
});

describe("request hardening", () => {
  it("requires authentication for financial endpoints", async () => {
    for (const path of ["/api/v1/transactions", "/api/v1/dashboard", "/api/v1/budgets", "/api/v1/me/export"]) {
      expect((await request(app).get(path)).status).toBe(401);
    }
  });

  it("rejects state-changing requests without the client header (CSRF)", async () => {
    const u = await registerUser();
    const res = await u.agent
      .post("/api/v1/transactions")
      .send({ type: "EXPENSE", amount: "10", currency: "INR", transactionDate: "2026-11-01" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("CSRF_REJECTED");
  });

  it("rejects requests from foreign origins", async () => {
    const u = await registerUser();
    const res = await u.agent
      .post("/api/v1/transactions")
      .set(CLIENT_HEADER)
      .set("Origin", "https://evil.example")
      .send({ type: "EXPENSE", amount: "10", currency: "INR", transactionDate: "2026-11-01" });
    expect(res.status).toBe(403);
  });

  it("sets security headers and disables caching of API responses", async () => {
    const res = await request(app).get("/api/v1/plans");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    const me = await request(app).get("/api/v1/auth/me");
    expect(me.headers["cache-control"]).toBe("no-store");
  });

  it("returns a JSON error for malformed JSON", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set(CLIENT_HEADER)
      .set("Content-Type", "application/json")
      .send("{not json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });
});
