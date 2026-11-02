import { Prisma } from "@prisma/client";
import { MONEY_SCALE } from "@finpilot/shared";

/** Prisma Decimal → canonical decimal string (never via JS number). */
export function decToString(value: Prisma.Decimal | null | undefined): string {
  return value ? value.toFixed(MONEY_SCALE) : (0).toFixed(MONEY_SCALE);
}

export function toPrismaDecimal(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}
