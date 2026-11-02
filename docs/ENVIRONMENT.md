# Environment variables

FinPilot reads configuration only from environment variables. Secrets live **only** on the server
(`apps/api`). The web app has no secrets: anything prefixed `VITE_` is compiled into public JavaScript.

The API validates its configuration at start-up (`apps/api/src/config/env.ts`) and refuses to start
when a required value is missing or weak.

## API — `apps/api/.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development`, `test` or `production`. Production forces secure cookies and HSTS. |
| `PORT` | no | `4000` | HTTP port. |
| `DATABASE_URL` | **yes** | — | PostgreSQL connection string. Use `sslmode=require` in production. |
| `TEST_DATABASE_URL` | for tests | — | Separate database for the API test suite. **Must** name a database ending in `_test`; the suite clears its tables. |
| `WEB_ORIGINS` | no | `http://localhost:5173` | Comma-separated browser origins allowed by CORS and the CSRF origin check. |
| `FIELD_ENCRYPTION_KEY` | **yes** | — | 32 random bytes, base64. AES-256-GCM key for encrypted columns (`*Enc`). Losing it makes those fields unreadable. Store in a secrets manager / KMS. |
| `AUDIT_HASH_SECRET` | **yes** | — | ≥32 chars. HMAC key used to pseudonymise IP addresses in audit logs and sessions. |
| `SESSION_TTL_DAYS` | no | `14` | Session lifetime (1–90). |
| `SESSION_COOKIE_NAME` | no | `fp_session` | Name of the httpOnly session cookie. |
| `COOKIE_SECURE` | no | `false` | Mark cookies `Secure`. Always on when `NODE_ENV=production`. |
| `TRUST_PROXY` | no | `0` | Number of trusted reverse-proxy hops (needed for correct client IPs / rate limiting behind a load balancer). |
| `ADMIN_EMAILS` | no | — | Comma-separated emails given the `ADMIN` role when they register. |
| `LOG_LEVEL` | no | `info` | `trace` … `error`, or `silent`. |
| `RATE_LIMIT_DISABLED` | no | `false` | Test-only switch. Rejected in production. |
| `REDIS_URL` | no | — | Not used in Milestone 1. From Milestone 2: shared rate-limit store, OCR job queue, reminder workers. |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # FIELD_ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"      # AUDIT_HASH_SECRET
```

## Web — `apps/web/.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_PROXY_TARGET` | no | `http://localhost:4000` | Where the Vite **dev server** proxies `/api`. Read by `vite.config.ts` only; never shipped to the browser. |

In production, serve the built web app and the API under the same site (e.g. `app.example.com` and
`app.example.com/api` via a reverse proxy) so the session cookie stays first-party.

## Planned (later milestones)

| Variable | Milestone | Purpose |
|---|---|---|
| `STORAGE_DRIVER`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | 2 | Private object storage for uploaded documents (SSE-KMS). |
| `OCR_PROVIDER`, `OCR_API_KEY` | 2 | OCR provider (replaceable). |
| `LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY` | 2/4 | Structured extraction and the AI assistant (Gemini or another provider). |
| `SMTP_URL` / `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM` | 3 | Reminder emails. |
| `WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY` | 3 | Push notifications. |
| `SENTRY_DSN` / `OTEL_EXPORTER_OTLP_ENDPOINT` | 5 | Error monitoring and tracing. |
