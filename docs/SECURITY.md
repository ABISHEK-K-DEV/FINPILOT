# Security & privacy

FinPilot holds highly sensitive personal financial information. This document describes the controls that
exist **today** (Milestone 1) and the obligations that must be met before later features ship.

## Implemented in Milestone 1

| Area | Control | Where |
|---|---|---|
| Passwords | argon2id (m=19 MiB, t=2, p=1), min 10 characters with a letter and a number | `apps/api/src/lib/password.ts` |
| Brute force | Per-IP rate limit on auth endpoints (20 per 15 min) + account lockout after 5 failures (15 min); one generic message for unknown email, wrong password and locked account; timing equalised for unknown emails | `modules/auth/routes.ts`, `middleware/rateLimit.ts` |
| Sessions | Opaque 256-bit tokens; only the SHA-256 is stored; httpOnly, `SameSite=Lax`, `Secure` in production; server-side revocation on logout, "sign out everywhere", and on password change | `lib/session.ts`, `middleware/auth.ts` |
| CSRF | Mutating requests need a custom `X-FinPilot-Client` header (forces a CORS preflight) and an allow-listed `Origin` | `middleware/csrf.ts` |
| RBAC | `USER` / `SUPPORT` / `ADMIN`; admin routes behind `requireRole("ADMIN")`; denials are audited. The admin view shows **aggregate counts only**, no individual financial data | `middleware/auth.ts`, `modules/admin` |
| Data isolation | Every query is scoped by the session's `userId`. Another user's record returns **404**, so its existence isn't revealed. Category/account references are ownership-checked. Covered by integration tests | all `modules/*`, `test/transactions.test.ts` |
| Encryption in transit | HTTPS terminated at the edge; HSTS (2 years, preload) when `NODE_ENV=production` | `app.ts` |
| Encryption at rest | Field-level AES-256-GCM for free-text notes (more fields follow), with the owner id as AAD so ciphertext can't be moved between users. Database/disk encryption must also be on at the hosting provider | `lib/crypto.ts` |
| Input validation | Shared zod schemas on client and server; strict decimal-string money format; JSON body ≤100 kB; unknown preference fields rejected | `packages/shared/src/schemas.ts` |
| Headers | helmet: `default-src 'none'` CSP on the API, `nosniff`, `frame-ancestors 'none'`, no `X-Powered-By`; `Cache-Control: no-store` on all API responses | `app.ts` |
| Logging | Structured pino logs with credentials, cookies and notes redacted; bodies never logged; request ids | `lib/logger.ts` |
| Audit trail | Sign-in, failures, lockouts, data export, deletion, consent changes, record changes, admin views. IPs are HMAC-pseudonymised. No amounts | `lib/audit.ts` |
| CSV export | Spreadsheet formula injection neutralised | `modules/reports/csv.ts` |
| Data rights | Full JSON export; permanent account deletion (password + typed confirmation; cascades every table; audit keeps only an anonymous marker); consent history | `modules/me/routes.ts` |
| Consent | Terms & privacy recorded at sign-up with version; optional processing (AI, documents, email, analytics, marketing) **off by default**, append-only history | `consent_records` |
| Minimal collection | Name, email, preferences, and what the user records. No phone, no bank login, no card data, no third-party trackers, no external fonts/CDNs in the web app | — |
| Sample data | Created only on request, flagged `isSample`, badged in the UI, removable without touching real records | `services/sampleData.ts` |

### Things FinPilot never does

- Store banking passwords, card numbers, CVVs, OTPs or authentication secrets. The UI warns users not to type them into notes.
- Scrape banking websites, or connect to bank accounts without an authorised provider and explicit consent.
- Initiate payments or transfers.
- Sell personal financial data or use it for undisclosed advertising.
- Show invented numbers as the user's data, or declare a charge fraudulent.

## Required before later milestones

**Milestone 2 (documents)**
- Private object storage (S3-compatible, SSE-KMS, no public ACLs), random object keys, short-lived signed URLs, owner check on every access.
- File validation: allow-list of MIME types checked by magic bytes, size limits, page limits, image re-encoding, malware scanning, SHA-256 dedup.
- OCR/LLM processing only with `DOCUMENT_PROCESSING` consent; a data processing agreement with each provider; zero-retention modes where available; PII minimisation before prompts.
- Redis-backed rate limiting and job queues; per-plan scan quotas.

**Milestone 3 (reminders)**: email/push only with consent; unsubscribe links; no financial amounts in push payloads by default.

**Milestone 4 (AI)**: the assistant reads only data the user has authorised (`AI_PROCESSING` consent), via deterministic, user-scoped query tools; answers cite records and show calculations; prompt-injection defences for document text; no investment advice.

**Milestone 5 (production, bank data)**
- **India.** The *Digital Personal Data Protection Act, 2023* and its Rules (notice, consent managers, purpose limitation, breach notification, children's data, Significant Data Fiduciary duties if designated). Bank data **only** through an RBI-licensed **Account Aggregator** (NBFC-AA) ecosystem, as a registered Financial Information User, with the consent artefacts and purpose codes that requires. No screen scraping. Assess CERT-In incident-reporting (6 hours) and log-retention directions, and data localisation expectations for payment-system data if any payment features are ever considered.
- **International.** GDPR/UK GDPR (lawful basis, DPIA, transfers, DPO), CCPA/CPRA, and local open-banking regimes (PSD2/PSD3 AISP licensing in the EU/UK, CDR in Australia, etc.) before any market launch.
- Independent penetration test, threat model review, secrets in a KMS/secrets manager, key rotation for `FIELD_ENCRYPTION_KEY` (the `v1:` ciphertext prefix supports it), backups encrypted and restore-tested, a documented incident response plan.
- MFA (TOTP/WebAuthn), email verification and enumeration-safe registration.

## Known limitations (Milestone 1)

- Registration returns 409 for an existing email, which reveals that an account exists. Rate limiting reduces the risk; email-verification-based registration (Milestone 2) removes it.
- Rate-limit counters are in memory (single instance). Use the Redis store before scaling horizontally.
- No MFA yet.
