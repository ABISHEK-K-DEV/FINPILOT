# FinPilot — Implementation plan

Mission: *give every individual a clear understanding of their money, bills, subscriptions and recurring
financial commitments.* Initial market: India. Architecture: ready for other markets.

Status legend: ✅ done · 🟡 partly done (schema/foundations only) · ⬜ not started

## Milestone 1 — Foundations ✅ (this release)

| Item | Status | Notes |
|---|---|---|
| Monorepo (npm workspaces): `apps/api`, `apps/web`, `packages/shared` | ✅ | Strict TypeScript everywhere |
| Full database schema for all milestones + CHECK constraints | ✅ | See `docs/DATABASE.md` |
| Landing page | ✅ | Feature statuses labelled honestly |
| Authentication (register/login/logout/sign out everywhere/change password) | ✅ | argon2id, hashed opaque sessions, lockout, CSRF, rate limits |
| Financial dashboard | ✅ | Spent, income, net/savings rate, daily average, 6-month trend, categories, budgets, recent transactions, rule-based observations that show their basis |
| Manual expense & income entry (create/edit/delete, notes encrypted) | ✅ | Shared validation; decimal strings |
| Expense categories (19 system + custom) | ✅ | |
| Monthly reports (category change, largest expenses, income sources, 12-month trend, CSV export) | ✅ | |
| Basic budgets (overall + per category, warning threshold, linear projection, daily allowance) | ✅ | |
| Responsive, mobile-first UI | ✅ | Bottom nav + bottom-sheet dialogs on phones |
| Settings: preferences, categories, consent, sessions, activity, export, sample data, account deletion | ✅ | |
| Minimal admin overview (aggregate only) + RBAC | ✅ | |
| Tests: shared financial maths (unit) + API (integration) | ✅ | Including cross-user isolation tests |
| `FinancialAccounts` UI | 🟡 | Table and API ownership check exist; management UI comes in M2 |

## Milestone 2 — Receipt & bill scanner ⬜

1. Storage abstraction (`StorageProvider`: local disk in dev, S3/GCS in prod) with private buckets, SSE-KMS and signed URLs.
2. Upload endpoint with checks: magic-byte MIME allow-list (JPEG/PNG/WebP/HEIC/PDF), size and page limits, SHA-256 dedup, malware scan hook. Gated by `DOCUMENT_PROCESSING` consent.
3. Redis + BullMQ worker: `ocr` → `extract` jobs. `OcrProvider` and `LlmProvider` interfaces (Gemini first, replaceable); JSON-schema-constrained extraction of merchant, dates, totals, tax, line items, payment method, due date, recurrence hints and warranty duration, with a confidence score per field.
4. Review & correction UI: side-by-side document preview and editable fields; nothing is saved until the user confirms. Confirmation creates `Bill` + `BillLineItem` + `Transaction` atomically.
5. Bills list and detail with history; per-plan scan quotas (from `subscription_plans.limits`).
6. Email verification, enumeration-safe registration, Redis rate-limit store, accounts UI.

## Milestone 3 — Recurring intelligence ⬜

1. Recurring detection rules (same merchant ± amount tolerance at a regular cadence), each producing evidence. The user confirms before anything becomes a `RecurringPayment` or `Subscription`.
2. Subscription manager: monthly and annual cost, next renewal, price-change history, curated provider catalogue with **official** cancellation links and guidance. FinPilot never claims to cancel anything without a supported integration.
3. Warranty manager: product and warranty from purchase invoices, expiry and service reminders.
4. Financial calendar (bills, renewals, user-entered EMIs, insurance, warranties).
5. Reminder worker (`payment_reminders` scan) → in-app, web push (VAPID) and email, each only with consent.

## Milestone 4 — Intelligence ⬜

1. Unusual-expense rules: duplicates (same amount/merchant within N days), unexpected recurring charges, bill increases beyond a threshold or the bill's own history, subscription price increases, possible billing errors (line items ≠ total). Stored in `financial_insights` with `ruleId`, `ruleVersion` and evidence. The UI says "worth checking", never "fraud".
2. AI financial assistant: with `AI_PROCESSING` consent only. LLM tool calling over **deterministic, user-scoped query functions** (the same shared maths); answers cite transaction ids, show calculations and list missing data. Guardrails: no investment advice, no promised returns, refuse out-of-scope requests, resist prompt injection from document text.
3. Bill comparison: historical comparison first; alternatives only from verified plan data, with eligibility and all charges checked.
4. Pre-aggregated monthly totals for large histories.

## Milestone 5 — Scale & monetisation ⬜

1. Premium/Business billing through a licensed payment gateway (FinPilot charges its own subscription only; it never moves user money). Entitlements from `subscription_plans`.
2. React Native / Expo app reusing `packages/shared` and Bearer sessions; push notifications.
3. Optional bank data **only** via RBI-licensed Account Aggregators (India) / licensed open-banking providers elsewhere, after a legal and regulatory review (DPDP Act 2023, AA framework, GDPR, etc.) and with explicit consent artefacts.
4. Production: containerised deploy, managed Postgres with encryption at rest and PITR, Redis, CDN, WAF, secrets manager/KMS, OpenTelemetry + error monitoring, MFA, pen test, incident response runbook.
5. Business tier: team workspaces, employee expense intelligence, document-analysis API with scoped API keys.

## Risks and decisions log

| Decision | Rationale |
|---|---|
| Money as `NUMERIC(19,4)` + decimal strings + decimal.js | Exact arithmetic; 4 dp leaves room for tax and unit prices; presentation rounds to currency minor units |
| Transaction date is a `DATE` in the user's frame of reference | Month totals don't move when server or user time zones differ |
| No FX conversion in M1; other-currency records excluded *and counted* | Showing a converted figure without a sourced rate would be an invented number |
| Opaque DB sessions instead of JWT | Instant revocation, simpler key management, works for web (cookie) and mobile (Bearer) |
| Rules before AI for insights | Explainable, testable, auditable; AI only explains |
| Prisma 6 (not 7/8 RC) | Stable, well-known API; upgrade path documented by Prisma |
