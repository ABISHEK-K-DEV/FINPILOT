/**
 * Validated runtime configuration. The process refuses to start with missing or weak secrets.
 * Every variable is documented in docs/ENVIRONMENT.md and apps/api/.env.example.
 */
import { z } from "zod";

const boolish = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  WEB_ORIGINS: z.string().default("http://localhost:5173"),
  FIELD_ENCRYPTION_KEY: z
    .string({ error: "FIELD_ENCRYPTION_KEY is required (32 random bytes, base64)" })
    .refine((v) => Buffer.from(v, "base64").length === 32, "FIELD_ENCRYPTION_KEY must decode to exactly 32 bytes"),
  AUDIT_HASH_SECRET: z.string({ error: "AUDIT_HASH_SECRET is required" }).min(32, "AUDIT_HASH_SECRET must be at least 32 characters"),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),
  SESSION_COOKIE_NAME: z.string().regex(/^[a-zA-Z0-9_-]+$/).default("fp_session"),
  COOKIE_SECURE: boolish,
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
  ADMIN_EMAILS: z.string().default(""),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "silent"]).default("info"),
  RATE_LIMIT_DISABLED: boolish,
  REDIS_URL: z.string().optional(),
});

export type Env = z.infer<typeof schema> & {
  webOrigins: string[];
  adminEmails: Set<string>;
  cookieSecure: boolean;
  isProduction: boolean;
};

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    // eslint-disable-next-line no-console
    console.error(`\nInvalid FinPilot API configuration:\n${details}\nSee docs/ENVIRONMENT.md\n`);
    process.exit(1);
  }
  const e = parsed.data;
  const isProduction = e.NODE_ENV === "production";
  if (isProduction && e.RATE_LIMIT_DISABLED) {
    console.error("RATE_LIMIT_DISABLED cannot be set in production");
    process.exit(1);
  }
  return {
    ...e,
    webOrigins: e.WEB_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
    adminEmails: new Set(e.ADMIN_EMAILS.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)),
    cookieSecure: isProduction || e.COOKIE_SECURE,
    isProduction,
  };
}

export const env = load();
