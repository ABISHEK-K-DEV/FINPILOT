import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

interface HttpishError {
  status?: number;
  statusCode?: number;
  type?: string;
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Endpoint not found" } });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.id as string | undefined;

  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, fields: err.fields, requestId } });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ error: { code: "CONFLICT", message: "A record like this already exists", requestId } });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Resource not found", requestId } });
      return;
    }
  }

  const httpErr = err as HttpishError;
  if (httpErr?.type === "entity.parse.failed") {
    res.status(400).json({ error: { code: "INVALID_JSON", message: "Request body is not valid JSON", requestId } });
    return;
  }
  if (httpErr?.type === "entity.too.large") {
    res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large", requestId } });
    return;
  }

  logger.error({ err, requestId }, "unhandled error");
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong on our side. Please try again.", requestId },
  });
}
