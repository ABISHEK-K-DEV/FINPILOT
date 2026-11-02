# FinPilot

**AI-powered personal financial intelligence — privacy first.**
FinPilot helps people understand where their money goes, keep budgets on track, and (in upcoming milestones) make sense of
bills, subscriptions, warranties and recurring commitments.

> **Status: Milestone 1.** Landing page, authentication, dashboard, manual expenses and income, categories, monthly reports,
> budgets, privacy controls and an admin overview. Scanner, subscriptions, calendar and the AI assistant are planned. See
> [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Highlights

- **Exact money maths.** Postgres `NUMERIC`, decimal strings over the wire, `decimal.js` everywhere. Never floats.
- **Honest by design.** No invented numbers. Sample data is opt-in, badged "Sample" and removable. Insights show how they were calculated.
- **Privacy & security.** argon2id, hashed revocable sessions, CSRF protection, rate limiting and lockout, RBAC, strict per-user isolation, encrypted notes, audit log, full data export, one-step account deletion, consent management. See [docs/SECURITY.md](docs/SECURITY.md).
- **India first, global-ready.** INR and Indian digit grouping by default; multi-currency records, IANA time zones, locales.
- **Mobile-first UI.** Bottom navigation and sheets on phones; shared domain package ready for React Native.

## Tech stack

| Layer | Choice |
|---|---|
| Web | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, TanStack Query 5, Recharts |
| API | Node.js 22, Express 5, TypeScript, Prisma 6, PostgreSQL 16, zod, pino, helmet |
| Shared | `@finpilot/shared`: money, dates, budget and report maths, validation schemas, DTO types |
| Tests | Vitest (unit + API integration with supertest) |
| Later | Redis + workers (OCR, reminders), object storage, OCR + LLM (Gemini or another provider) |

## Run locally

**Prerequisites:** Node.js ≥ 22.9, PostgreSQL 16 (or Docker).

1. Install dependencies:

```bash
npm install
```

2. Start PostgreSQL. Either use Docker (creates `finpilot` and `finpilot_test` databases):

```bash
docker compose up -d postgres
```

or, with a local PostgreSQL, create a role and the two databases yourself:

```bash
psql -U postgres -c "CREATE ROLE finpilot LOGIN PASSWORD 'finpilot_dev' CREATEDB;" -c "CREATE DATABASE finpilot OWNER finpilot;" -c "CREATE DATABASE finpilot_test OWNER finpilot;"
```

3. Configure the API, then fill in `FIELD_ENCRYPTION_KEY` and `AUDIT_HASH_SECRET` (the commands to generate them are in the file):

```bash
cp apps/api/.env.example apps/api/.env
```

4. Create the schema and seed reference data plus local demo accounts:

```bash
npm run db:deploy && npm run db:seed
```

5. Start the API (http://localhost:4000) and web app (http://localhost:5173) together:

```bash
npm run dev
```

Open http://localhost:5173. Local demo accounts (created only when `NODE_ENV` is not production):

| Email | Password | Notes |
|---|---|---|
| `demo@finpilot.local` | `FinPilotDemo2026` | Has clearly labelled **sample** data |
| `admin@finpilot.local` | `FinPilotAdmin2026` | `ADMIN` role, sees the aggregate admin overview |

Or register your own account and choose "Explore with sample data" on the empty dashboard.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Build the shared package, run API (watch) + web (Vite) |
| `npm test` | Shared unit tests + API integration tests (needs `TEST_DATABASE_URL`, a `*_test` database) |
| `npm run typecheck` | Strict type-check of every workspace |
| `npm run build` | Production build of shared, API (`apps/api/dist`) and web (`apps/web/dist`) |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:studio` | Prisma workflows |

## Documentation

- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md): milestones, status and decisions
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): system design, layout and API surface
- [docs/DATABASE.md](docs/DATABASE.md): schema, conventions and indexes
- [docs/SECURITY.md](docs/SECURITY.md): controls, regulatory checklist and known limitations
- [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md): every environment variable

## Product boundaries

FinPilot is an information tool about your own records. It is **not** a bank, payment service or investment adviser. It
never asks for banking passwords, card CVVs or OTPs, doesn't scrape banks, doesn't initiate payments, and doesn't sell
personal financial data.
