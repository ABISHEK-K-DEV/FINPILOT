import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { sha256Hex } from "../lib/crypto.js";
import { forbidden, unauthorized } from "../lib/errors.js";
import { readSessionToken } from "../lib/session.js";
import { audit } from "../lib/audit.js";

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

/** Resolve the caller's session. Rejects missing, expired, revoked or suspended sessions. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = readSessionToken(req);
  if (!token || token.length > 128) throw unauthorized();

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256Hex(token) },
    include: { user: { select: { id: true, role: true, status: true, planCode: true, email: true } } },
  });
  const now = Date.now();
  if (!session || session.revokedAt || session.expiresAt.getTime() <= now || session.user.status !== "ACTIVE") {
    throw unauthorized("Your session has ended. Please sign in again.");
  }

  if (now - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date(now) } });
  }

  req.auth = {
    userId: session.user.id,
    sessionId: session.id,
    role: session.user.role,
    plan: session.user.planCode,
    email: session.user.email,
  };
  next();
}

/** Role-based access control. Use after requireAuth. */
export function requireRole(...roles: UserRole[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) throw unauthorized();
    if (!roles.includes(req.auth.role)) {
      await audit(req, { action: "rbac.denied", userId: req.auth.userId, metadata: { path: req.path, required: roles } });
      throw forbidden();
    }
    next();
  };
}

/** Typed accessor for handlers mounted behind requireAuth. */
export function authOf(req: Request) {
  if (!req.auth) throw unauthorized();
  return req.auth;
}
