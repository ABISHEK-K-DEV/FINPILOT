import pino from "pino";
import { env } from "../config/env.js";

/**
 * Structured logger. Credentials, cookies and financial free-text are redacted.
 * Request/response bodies are never logged.
 */
export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      'res.headers["set-cookie"]',
      "*.password",
      "*.passwordHash",
      "*.notes",
      "*.token",
    ],
    censor: "[redacted]",
  },
  ...(env.NODE_ENV === "development"
    ? { transport: { target: "pino-pretty", options: { colorize: true, ignore: "pid,hostname" } } }
    : {}),
});
