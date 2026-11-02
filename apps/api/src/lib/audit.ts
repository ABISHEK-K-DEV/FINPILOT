import type { Request } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { hmacHex } from "./crypto.js";
import { logger } from "./logger.js";

export interface AuditInput {
  action: string;
  userId?: string | null;
  actorId?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Write a security/access audit entry. Never include amounts, notes or document contents in metadata.
 * Failures are logged but never break the user's request.
 */
export async function audit(req: Request | null, input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        userId: input.userId ?? null,
        actorId: input.actorId ?? input.userId ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? undefined,
        ipHash: req?.ip ? hmacHex(req.ip) : null,
        userAgent: req?.get("user-agent")?.slice(0, 255) ?? null,
        requestId: (req?.id as string | undefined) ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, action: input.action }, "audit log write failed");
  }
}
