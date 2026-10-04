# noahs-kiosk: "the last item"

A tiny ordering service for one kiosk menu, built as a take-home for NOAHS.

- **api/**: NestJS + TypeScript + PostgreSQL (Prisma)
- **web/**: Next.js (App Router) *(in progress)*

The guarantees this project is about:
1. **Never sell the same last item twice**, even when two customers order at the same moment.
2. **Confirm each order's payment exactly once**, even when the provider retries, late or out of order.

## Design docs
| Doc | What's inside |
|---|---|
| [01-architecture](docs/01-architecture.md) | Structure, backend layers, error contract, API endpoints |
| [02-database](docs/02-database.md) | ER diagram, schema decisions |
| [03-flows](docs/03-flows.md) | Sequence diagrams + how the concurrency guarantees work |
| [04-ui-states](docs/04-ui-states.md) | What the customer sees for every outcome |
| [PROGRESS](docs/PROGRESS.md) | Plan vs. what actually happened |
| [ai-log](docs/ai-log.md) | What the AI wrote, what I wrote, and AI mistakes caught |

## How to run
> Work in progress: a one-command Docker Compose setup comes later. For now (API only):

```bash
docker compose up -d db          # Postgres on :5432
cd api
cp .env.example .env
npm install
npx prisma migrate dev           # create tables
npx prisma db seed               # demo menu
npm run start:dev                # API on :3001
npm run db:reset                 # demo data back to the starting menu (wipes orders)
```

### Run the tests
```bash
docker compose up -d db     # tests need Postgres (they use a separate kiosk_test database)
cd api && npm test
```
7 integration tests run against a **real Postgres**, not mocks. A race condition only exists in a real database, so a mocked repository couldn't prove anything:
- `test/orders/orders.concurrency.e2e-spec.ts`: 20 customers order the last item at the same moment → exactly 1 succeeds; stock 5 with 20 orders → exactly 5; the same Idempotency-Key 10× at once → 1 order.
- `test/payments/payments.idempotency.e2e-spec.ts`: the same confirmation twice → APPLIED then DUPLICATE (order paid once, `paid_at` unchanged); 10× at once → exactly 1 APPLIED; a late different event → IGNORED; wrong amount → IGNORED.

**Do the tests really catch races?** I checked by temporarily replacing the atomic UPDATE with the classic "read stock, check in code, then write" bug: **19 of 20 customers bought the single last item** and the tests failed. With the real code restored, they pass.

**Try the API:** open **http://localhost:3001/docs** (Swagger UI) → pick an endpoint → *Try it out* → *Execute*.
For `POST /orders`, fill the optional `Idempotency-Key` header and send twice: you get the same order back.

> Run Prisma commands from inside `api/`. From the repo root, `npx` can't find the local Prisma 6 and downloads the newest one instead (currently an 8.0 release candidate, which has no `studio` command).

### Look at the database
| Tool | How |
|---|---|
| Prisma Studio (browser UI, already installed) | `cd api && npm run db:studio` → http://localhost:5555 |
| psql in the container (no install) | `docker compose exec db psql -U kiosk -d kiosk` then `\dt`, `select * from menu_item;` |
| GUI client (DBeaver / TablePlus / VS Code "PostgreSQL" extension) | host `localhost`, port `5432`, user `kiosk`, password `kiosk`, database `kiosk`, auth **Password**, SSL **Disable** (the local Postgres has no SSL) |
