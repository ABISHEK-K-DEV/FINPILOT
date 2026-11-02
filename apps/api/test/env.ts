import { existsSync } from "node:fs";

/** Point the API at the dedicated test database. Never runs against DATABASE_URL. */
export function configureTestEnv(): void {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error("TEST_DATABASE_URL must be set to run API tests (see docs/ENVIRONMENT.md)");
  const dbName = new URL(testUrl).pathname.replace(/^\//, "");
  if (!dbName.endsWith("_test")) {
    throw new Error(`Refusing to run tests against database "${dbName}": TEST_DATABASE_URL must name a *_test database`);
  }
  process.env.DATABASE_URL = testUrl;
  process.env.NODE_ENV = "test";
  process.env.RATE_LIMIT_DISABLED = "true";
  process.env.ADMIN_EMAILS = "admin@test.local,rbac-admin@test.local";
  process.env.WEB_ORIGINS = "http://localhost:5173";
  process.env.FIELD_ENCRYPTION_KEY ||= Buffer.alloc(32, 7).toString("base64");
  process.env.AUDIT_HASH_SECRET ||= "test-audit-secret-test-audit-secret-0123456789";
}
