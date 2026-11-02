import { Router } from "express";
import { registerSchema, loginSchema, changePasswordSchema, DEFAULT_CURRENCY, DEFAULT_TIMEZONE, LEGAL_VERSIONS } from "@finpilot/shared";
import { prisma } from "../../lib/prisma.js";
import { parse } from "../../lib/validate.js";
import { getDummyHash, hashPassword, verifyPassword } from "../../lib/password.js";
import { clearSessionCookie, createSession, readSessionToken, setSessionCookie } from "../../lib/session.js";
import { sha256Hex } from "../../lib/crypto.js";
import { audit } from "../../lib/audit.js";
import { AppError, conflict, unauthorized } from "../../lib/errors.js";
import { env } from "../../config/env.js";
import { authLimiter } from "../../middleware/rateLimit.js";
import { authOf, requireAuth } from "../../middleware/auth.js";
import { toUserDTO } from "../mappers.js";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const INVALID_CREDENTIALS = "Invalid email or password. After repeated failed attempts, sign-in is paused for 15 minutes.";

export const authRouter = Router();

authRouter.post("/register", authLimiter, async (req, res) => {
  const input = parse(registerSchema, req.body);
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) {
    await audit(req, { action: "auth.register.duplicate" });
    throw conflict("An account with this email already exists. Try signing in instead.");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      role: env.adminEmails.has(input.email) ? "ADMIN" : "USER",
      preferences: {
        create: {
          baseCurrency: input.baseCurrency ?? DEFAULT_CURRENCY,
          timezone: input.timezone ?? DEFAULT_TIMEZONE,
        },
      },
      consents: {
        create: [
          { type: "TERMS_OF_SERVICE", granted: true, version: LEGAL_VERSIONS.TERMS_OF_SERVICE },
          { type: "PRIVACY_POLICY", granted: true, version: LEGAL_VERSIONS.PRIVACY_POLICY },
        ],
      },
    },
    include: { preferences: true },
  });

  const { token, sessionId } = await createSession(req, user.id);
  setSessionCookie(res, token);
  await audit(req, { action: "auth.register", userId: user.id, entityType: "session", entityId: sessionId });
  res.status(201).json({ user: toUserDTO(user) });
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const input = parse(loginSchema, req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email }, include: { preferences: true } });

  if (!user) {
    await verifyPassword(await getDummyHash(), input.password); // equalise timing
    await audit(req, { action: "auth.login.failed", metadata: { reason: "unknown_email" } });
    throw unauthorized(INVALID_CREDENTIALS);
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    await audit(req, { action: "auth.login.locked", userId: user.id });
    throw unauthorized(INVALID_CREDENTIALS);
  }
  if (user.status !== "ACTIVE") {
    await audit(req, { action: "auth.login.suspended", userId: user.id });
    throw new AppError(403, "ACCOUNT_SUSPENDED", "This account is suspended. Please contact support.");
  }

  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) {
    const failed = user.failedLoginCount + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: lock ? 0 : failed,
        lockedUntil: lock ? new Date(now.getTime() + LOCK_MINUTES * 60_000) : user.lockedUntil,
      },
    });
    await audit(req, { action: lock ? "auth.account.locked" : "auth.login.failed", userId: user.id });
    throw unauthorized(INVALID_CREDENTIALS);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
  });
  const { token, sessionId } = await createSession(req, user.id);
  setSessionCookie(res, token);
  await audit(req, { action: "auth.login", userId: user.id, entityType: "session", entityId: sessionId });
  res.json({ user: toUserDTO(user) });
});

authRouter.post("/logout", async (req, res) => {
  const token = readSessionToken(req);
  if (token) {
    const session = await prisma.session.findUnique({ where: { tokenHash: sha256Hex(token) } });
    if (session && !session.revokedAt) {
      await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      await audit(req, { action: "auth.logout", userId: session.userId, entityType: "session", entityId: session.id });
    }
  }
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.post("/logout-all", requireAuth, async (req, res) => {
  const { userId } = authOf(req);
  const result = await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await audit(req, { action: "auth.logout_all", userId, metadata: { sessions: result.count } });
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const { userId } = authOf(req);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { preferences: true } });
  res.json({ user: toUserDTO(user) });
});

authRouter.post("/change-password", authLimiter, requireAuth, async (req, res) => {
  const { userId, sessionId } = authOf(req);
  const input = parse(changePasswordSchema, req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
    await audit(req, { action: "auth.password_change.failed", userId });
    throw new AppError(400, "VALIDATION_ERROR", "Current password is incorrect", {
      currentPassword: "Current password is incorrect",
    });
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(input.newPassword) } }),
    // Revoke every other session after a password change.
    prisma.session.updateMany({
      where: { userId, revokedAt: null, id: { not: sessionId } },
      data: { revokedAt: new Date() },
    }),
  ]);
  await audit(req, { action: "auth.password_change", userId });
  res.status(204).end();
});
