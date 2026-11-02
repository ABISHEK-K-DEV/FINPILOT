# Architecture

```
┌──────────────────────────┐        same-site HTTPS         ┌──────────────────────────────┐
│ apps/web  (React + Vite) │  ───────  /api/v1/*  ───────▶  │ apps/api  (Express + TS)     │
│ Router · TanStack Query  │   httpOnly session cookie      │ auth · RBAC · CSRF · limits  │
│ Tailwind · Recharts      │   X-FinPilot-Client header     │ modules/* (user-scoped)      │
└────────────┬─────────────┘                                └───────┬─────────────┬────────┘
             │ imports                                              │ Prisma      │ (M2+) queue
┌────────────▼─────────────────────────────────────────────┐ ┌──────▼──────┐ ┌────▼─────────┐
│ packages/shared  — platform-agnostic domain logic         │ │ PostgreSQL  │ │ Redis +      │
│ money (decimal.js) · dates/time zones · budget & report   │ │ NUMERIC $   │ │ workers      │
│ maths · zod schemas · DTO types · constants               │ └─────────────┘ │ (OCR, remind)│
└───────────────────────────────────────────────────────────┘                 └──────────────┘
          ▲ reused unchanged by a future React Native / Expo app
```

## Principles

1. **One source of financial truth.** All money maths (sums, budget progress, projections, comparisons) lives in
   `packages/shared` as pure, unit-tested functions. The API uses them to build reports; the web uses the same
   schemas for form validation. Nothing does arithmetic on JavaScript floats. Charts convert to numbers only for
   pixel geometry and never for displayed figures.
2. **User-scoped by construction.** Handlers get `userId` from the session (`authOf(req)`) and every Prisma
   query includes it. Cross-user access returns 404.
3. **Replaceable providers.** OCR, LLM, storage, email and push sit behind small interfaces (Milestone 2+), chosen
   by env vars, so Gemini or any other model, S3 or GCS, and similar can be swapped without touching domain code.
4. **Explainable before intelligent.** Insights come from deterministic rules with recorded evidence. AI may
   *explain* a finding but never invents figures or declares fraud.
5. **Honest UI.** Unbuilt features render clear "coming in Milestone N" states. Sample data is opt-in and labelled.
6. **Mobile-ready.** The API is a plain JSON REST API that also accepts `Authorization: Bearer` sessions; the shared
   package has no DOM or Node dependencies, so an Expo app can reuse it.

## Repository layout

```
apps/api/
  prisma/schema.prisma, migrations/, seed.ts
  src/config/env.ts           validated configuration
  src/lib/                    prisma, crypto, password, session, audit, logger, errors, validate
  src/middleware/             auth (requireAuth/requireRole), csrf, rateLimit, errorHandler
  src/modules/<feature>/      routes (+ service) per feature: auth, me, categories, transactions,
                              budgets, reports (dashboard, monthly, trend, CSV), plans, admin
  src/services/sampleData.ts  labelled demo data
  test/                       supertest integration tests against a *_test database
apps/web/src/
  lib/ (api client, formatting, query keys, observations), hooks/, components/{ui,layout,charts,transactions}, pages/
packages/shared/src/
  money.ts, dates.ts, budget.ts, reports.ts, schemas.ts, constants.ts, types.ts (+ *.test.ts)
```

## API surface (v1)

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `POST /auth/logout-all` · `GET /auth/me` · `POST /auth/change-password` | — / session | Authentication |
| `GET/POST /transactions`, `GET/PATCH/DELETE /transactions/:id` | session | Filters: `month`, `from`, `to`, `type`, `categoryId`, `search`, `sample`, `sort`, `page`, `pageSize` |
| `GET/POST /categories`, `PATCH/DELETE /categories/:id` | session | System + custom categories |
| `GET/POST /budgets`, `PATCH/DELETE /budgets/:id` | session | Budgets with progress for `?month=` |
| `GET /dashboard?month=` | session | Composite dashboard payload |
| `GET /reports/monthly?month=` · `GET /reports/trend?month=&months=` · `GET /reports/monthly.csv?month=` | session | Reports & export |
| `PATCH /me/preferences` · `GET/POST /me/consents` · `GET /me/sessions` · `GET /me/activity` · `GET /me/export` · `DELETE /me` · `POST/DELETE /me/sample-data` | session | Account, privacy and data rights |
| `GET /plans` | public | Plan catalogue |
| `GET /admin/overview` | ADMIN | Aggregate operational metrics |
| `GET /health` | public | Liveness + DB check |

Errors are always `{ "error": { "code", "message", "fields?", "requestId" } }`.
