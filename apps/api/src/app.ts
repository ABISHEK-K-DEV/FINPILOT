import express, { Router } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { randomUUID } from "node:crypto";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { requireAuth, requireRole } from "./middleware/auth.js";
import { csrfProtection, CSRF_HEADER } from "./middleware/csrf.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./modules/auth/routes.js";
import { meRouter } from "./modules/me/routes.js";
import { categoriesRouter } from "./modules/categories/routes.js";
import { transactionsRouter } from "./modules/transactions/routes.js";
import { budgetsRouter } from "./modules/budgets/routes.js";
import { dashboardRouter, reportsRouter } from "./modules/reports/routes.js";
import { plansRouter } from "./modules/plans/routes.js";
import { adminRouter } from "./modules/admin/routes.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers["x-request-id"];
        const id = typeof incoming === "string" && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
        res.setHeader("X-Request-Id", id);
        return id;
      },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({ id: req.id, method: req.method, url: req.url?.split("?")[0] }),
      },
    }),
  );

  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: "same-site" },
      strictTransportSecurity: env.isProduction ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
    }),
  );
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || env.webOrigins.includes(origin)),
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization", CSRF_HEADER, "X-Request-Id"],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  // Financial responses must never be cached by browsers or intermediaries.
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.get("/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", database: "ok" });
    } catch {
      res.status(503).json({ status: "degraded", database: "unreachable" });
    }
  });

  const v1 = Router();
  v1.use(apiLimiter);
  v1.use(csrfProtection);

  v1.use("/auth", authRouter);
  v1.use("/plans", plansRouter);

  // Everything below requires an authenticated session and is scoped to that user.
  v1.use("/me", requireAuth, meRouter);
  v1.use("/categories", requireAuth, categoriesRouter);
  v1.use("/transactions", requireAuth, transactionsRouter);
  v1.use("/budgets", requireAuth, budgetsRouter);
  v1.use("/reports", requireAuth, reportsRouter);
  v1.use("/dashboard", requireAuth, dashboardRouter);
  v1.use("/admin", requireAuth, requireRole("ADMIN"), adminRouter);

  app.use("/api/v1", v1);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
