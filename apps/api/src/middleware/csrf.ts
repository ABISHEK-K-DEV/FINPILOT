import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
export const CSRF_HEADER = "x-finpilot-client";

/**
 * CSRF defence for cookie-authenticated requests (defence in depth on top of SameSite=Lax):
 *  1. State-changing requests must carry the custom `X-FinPilot-Client` header. Browsers cannot
 *     attach custom headers cross-origin without a CORS preflight, which our allow-list rejects.
 *  2. If an Origin header is present it must be an allowed origin.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get("origin");
  if (origin && !env.webOrigins.includes(origin)) {
    throw new AppError(403, "CSRF_REJECTED", "Request origin not allowed");
  }
  if (!req.get(CSRF_HEADER)) {
    throw new AppError(403, "CSRF_REJECTED", "Missing client header");
  }
  next();
}
