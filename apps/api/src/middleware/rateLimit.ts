import rateLimit, { type Options } from "express-rate-limit";
import { env } from "../config/env.js";

/**
 * Rate limiting. Milestone 1 uses the in-memory store (single instance).
 * For horizontal scaling, plug in a Redis store (rate-limit-redis) using REDIS_URL — see IMPLEMENTATION_PLAN.md.
 */
const common: Partial<Options> = {
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => env.RATE_LIMIT_DISABLED,
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({
      error: { code: "RATE_LIMITED", message: "Too many requests. Please slow down and try again shortly." },
    });
  },
};

export const apiLimiter = rateLimit({ ...common, windowMs: 60_000, limit: 300 });

/** Strict limiter for credential endpoints (brute-force protection, complements account lockout). */
export const authLimiter = rateLimit({ ...common, windowMs: 15 * 60_000, limit: 20 });

/** Expensive endpoints such as data export. */
export const heavyLimiter = rateLimit({ ...common, windowMs: 60 * 60_000, limit: 10 });
