# Database design

PostgreSQL 16 via Prisma. Source of truth: [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma);
the initial migration also adds CHECK constraints that Prisma cannot express.

## Conventions

- **UUID primary keys.** No sequential ids that leak volume or invite enumeration.
- **Money is `NUMERIC(19,4)`**, always paired with an ISO-4217 `CHAR(3)` currency. Amounts are never floats,
  travel as decimal strings in JSON, and use `decimal.js` for arithmetic (`packages/shared/src/money.ts`).
  `CHECK (amount > 0)`: direction comes from `type`, never from the sign.
- **Dates vs instants.** Things people think of as days (transaction date, due date, renewal) are `DATE`, in the
  user's own frame of reference, so a month never shifts with server time zones. Events (`createdAt`, `remindAt`)
  are `TIMESTAMPTZ` stored in UTC. "Today" is resolved in the user's time zone (`user_preferences.timezone`).
- **Every user-owned table has `userId`**, `ON DELETE CASCADE` (account deletion removes everything), and an index
  that starts with `userId`. Every query is scoped by `userId`.
- **Encrypted columns end in `Enc`** (AES-256-GCM, with the owner's id as additional authenticated data).
- **Multi-currency.** Each record keeps its own currency. Reports total the user's base currency and **say how many
  records were left out**. There is no silent FX conversion; FX rates come in a later milestone.

## Tables

| Table | Purpose | Milestone |
|---|---|---|
| `users` | Identity, role (`USER`/`SUPPORT`/`ADMIN`), plan, lockout counters. argon2id hash only. | 1 |
| `user_preferences` | Base currency, locale, time zone, budget warning threshold, notification opt-ins. | 1 |
| `sessions` | Server-side sessions; stores only the SHA-256 of the token, plus HMAC'd IP. | 1 |
| `consent_records` | Append-only consent history (latest record per type is the current state). | 1 |
| `financial_accounts` | User-described accounts (cash, card, UPI). **No credentials; at most 4 masked digits** (CHECK). | 1 (schema), UI later |
| `expense_categories` | System categories (`userId NULL`, `isSystem`) + custom per-user categories. | 1 |
| `transactions` | Manual / scanned / imported money movement. `isSample` flags demo data. | 1 |
| `budgets` | Monthly limit per category or overall (`scopeKey` = category id or `OVERALL`, unique per user). | 1 |
| `receipts` | Uploaded documents: private storage key, hash, status, raw extraction pending review. | 2 |
| `bills`, `bill_line_items` | Structured bills (tax, fees, usage, due date) with line items. | 2 |
| `recurring_payments` | Recurring obligations (manual, rule-detected or from documents), next due date. | 3 |
| `subscriptions`, `subscription_price_changes` | Third-party subscriptions the user pays for + price history. | 3 |
| `purchased_products`, `warranties` | Products from invoices; warranty period, expiry and service schedule. | 3 |
| `payment_reminders` | Scheduled reminders with typed foreign keys (bill / subscription / recurring / warranty). | 3 |
| `notifications` | In-app / push / email delivery records. | 3 |
| `financial_insights` | Explainable rule output: `ruleId`, `ruleVersion`, JSON `evidence` (record ids + maths), status. | 4 |
| `ai_conversations`, `ai_messages` | Assistant history; encrypted content, citations, calculations. | 4 |
| `audit_logs` | Security/access trail. Never holds amounts or document contents. `userId` set NULL on deletion. | 1 |
| `subscription_plans` | FinPilot's own Free / Premium / Business plans: prices, features, limits as data. | 1 (catalogue), 5 (billing) |

> Naming: `subscriptions` are services the **user** pays for (streaming, gym). `subscription_plans` are **FinPilot's** tiers.

## Key indexes

- `transactions (userId, transactionDate DESC)`, `(userId, categoryId, transactionDate)`, `(userId, type, transactionDate)`, `(userId, isSample)`, `(userId, merchant)`
- `budgets UNIQUE (userId, scopeKey, period)`
- `expense_categories UNIQUE (userId, slug)` + partial unique index on `slug WHERE userId IS NULL`
- `payment_reminders (status, remindAt)` for the reminder worker scan
- `financial_insights UNIQUE (userId, dedupeKey)` so re-running rules is idempotent
- `audit_logs (userId, createdAt DESC)`, `(action, createdAt DESC)`

## Migrations

```bash
npm run db:migrate     # create/apply migrations in development (prisma migrate dev)
npm run db:deploy      # apply pending migrations in CI/production (prisma migrate deploy)
npm run db:seed        # reference data (+ demo accounts outside production)
```
