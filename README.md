# noahs-kiosk: "the last item"

A tiny ordering service for one kiosk menu, built as a take-home for NOAHS.

- **api/**: NestJS + TypeScript + PostgreSQL (Prisma)
- **web/**: Next.js 16 (App Router)

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

### One command (Docker)
Requires Docker Desktop. Free ports 3000, 3001 and 5432 first (stop any local dev servers).
```bash
docker compose up --build
```
| URL | What |
|---|---|
| http://localhost:3000 | Kiosk menu page |
| http://localhost:3001/docs | API (Swagger UI) |

On start, the API applies migrations and seeds the demo menu (only if empty). **Matcha Latte has 1 in stock**, so you can try "the last item" right away.

Then, in a second terminal:
```bash
docker compose exec api npm test                               # the 7 integration tests
docker compose exec api npm run simulate:payment               # act as the payment provider: pay the newest PENDING order
docker compose exec api npm run simulate:payment -- --times 5  # same confirmation 5x at once → 1 APPLIED, 4 DUPLICATE
docker compose exec api npm run db:reset                       # back to the starting menu (wipes orders)
docker compose down                                            # stop (add -v to also delete the database volume)
```

### Without Docker (local dev, hot reload)
```bash
docker compose up -d db                     # only Postgres
cd api && cp .env.example .env && npm install
npm run db:reset                            # create tables + demo menu
npm run start:dev                           # API on :3001 (watch mode)

cd web && cp .env.example .env.local && npm install
npm run dev                                 # http://localhost:3000
```

### Payment simulator
The brief's payment provider is simulated by `api/scripts/simulate-payment.ts`: it calls `POST /payments/confirm` exactly like a provider's webhook would.
```bash
npm run simulate:payment                          # pay the newest PENDING order once
npm run simulate:payment -- --times 5             # same confirmation 5x at once (retries)
npm run simulate:payment -- --event evt_abc123    # resend an old eventId (a late retry) → DUPLICATE
npm run simulate:payment -- --amount 1            # wrong amount → IGNORED
npm run simulate:payment -- --order <uuid>        # a specific order
```
Demo: order something on the kiosk page → run the simulator → see the order turn `PAID` in Prisma Studio (`npm run db:studio`).

### Run the tests
```bash
docker compose exec api npm test      # with the Docker stack running
# or locally: docker compose up -d db && cd api && npm test
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
