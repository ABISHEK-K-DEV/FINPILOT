import { Router } from "express";
import type { PlanDTO, CurrencyCode } from "@finpilot/shared";
import { prisma } from "../../lib/prisma.js";
import { decToString } from "../../lib/money.js";

export const plansRouter = Router();

/** Public, configurable plan catalogue (stored in subscription_plans, not hard-coded). */
plansRouter.get("/", async (_req, res) => {
  const plans = await prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  const items: PlanDTO[] = plans.map((p) => ({
    code: p.code,
    name: p.name,
    description: p.description,
    priceMonthly: decToString(p.priceMonthly),
    priceYearly: decToString(p.priceYearly),
    currency: p.currency as CurrencyCode,
    features: p.features as string[],
    limits: p.limits as Record<string, number | null>,
  }));
  res.setHeader("Cache-Control", "public, max-age=300");
  res.json({ items });
});
