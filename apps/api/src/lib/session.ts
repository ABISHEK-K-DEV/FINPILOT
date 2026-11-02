import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { prisma } from "./prisma.js";
import { hmacHex, randomToken, sha256Hex } from "./crypto.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: env.SESSION_TTL_DAYS * DAY_MS,
  };
}

/** Create a session; returns the raw token (only ever sent to the client, never stored). */
export async function createSession(req: Request, userId: string): Promise<{ token: string; sessionId: string }> {
  const token = randomToken(32);
  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: sha256Hex(token),
      userAgent: req.get("user-agent")?.slice(0, 255) ?? null,
      ipHash: req.ip ? hmacHex(req.ip) : null,
      expiresAt: new Date(Date.now() + env.SESSION_TTL_DAYS * DAY_MS),
    },
  });
  return { token, sessionId: session.id };
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(env.SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

export function clearSessionCookie(res: Response): void {
  const { maxAge: _maxAge, ...opts } = sessionCookieOptions();
  res.clearCookie(env.SESSION_COOKIE_NAME, opts);
}

/** Read the session token from the httpOnly cookie (web) or a Bearer header (future mobile clients). */
export function readSessionToken(req: Request): string | null {
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[env.SESSION_COOKIE_NAME];
  if (cookieToken) return cookieToken;
  const header = req.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim() || null;
  return null;
}
