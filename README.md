# noahs-kiosk: "the last item"

A tiny ordering service for one kiosk menu, built for the NOAHS take-home.

- **api/**: NestJS + TypeScript + PostgreSQL (Prisma)
- **web/**: Next.js 16 (App Router)

The whole project is about two promises:
1. **Never sell the last item twice**, even when two people order it at the same moment.
2. **Confirm each payment exactly once**, even when the payment provider sends the same confirmation again, late, or out of order.

---

## Run it

### Option A: one command with Docker (recommended)
You need **Docker Desktop**, and ports **3000, 3001, 5432** free.

**Step 1: get the code**
```bash
git clone git@github.com:pitipume/noahs-kiosk.git
cd noahs-kiosk
```

**Step 2: start everything** (the first build takes a few minutes)
```bash
docker compose up --build
```
Wait until the logs say `Nest application successfully started` and `Ready`.

**Step 3: open it**

| What | URL |
|---|---|
| Kiosk menu page | http://localhost:3000 |
| API (Swagger UI, try the endpoints) | http://localhost:3001/docs |

The demo menu loads automatically. **Matcha Latte has only 1 left**, so you can try "the last item" straight away.

**Step 4: run the tests** (in a second terminal, while step 2 is running)
```bash
docker compose exec api npm test
```

**Step 5: act as the payment provider** (after placing an order on the page)
```bash
docker compose exec api npm run simulate:payment -- --times 5
```
You'll see **1 × APPLIED and 4 × DUPLICATE**: the order was paid once, the retries changed nothing.

**Step 6: stop**
```bash
docker compose down        # stop (your data is kept)
docker compose down -v     # stop and delete the database too
```

### All commands at a glance

| Command | What it does |
|---|---|
| `docker compose up --build` | Build and start db + api + web |
| `docker compose exec api npm test` | Run the 7 integration tests |
| `docker compose exec api npm run simulate:payment` | Pay the newest pending order once |
| `… simulate:payment -- --times 5` | Send the same confirmation 5 times at once |
| `… simulate:payment -- --event <id>` | Resend an old confirmation (a late retry) → DUPLICATE |
| `… simulate:payment -- --amount 1` | Wrong amount → IGNORED |
| `… simulate:payment -- --order <uuid>` | Pay a specific order |
| `docker compose exec api npm run db:reset` | Back to the starting menu (deletes orders) |
| `docker compose logs -f api` | Watch the API logs |
| `docker compose down` | Stop everything |

### Connect to the database

| Setting | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `kiosk` (tests use `kiosk_test`) |
| Username | `kiosk` |
| Password | `kiosk` |
| Auth type | Password |
| SSL | Disable (the local database has no SSL) |

Use any SQL client (DBeaver, TablePlus, the VS Code PostgreSQL extension), or:
```bash
docker compose exec db psql -U kiosk -d kiosk      # then: \dt   or   select * from menu_item;
cd api && npm run db:studio                        # Prisma Studio in the browser: http://localhost:5555
```
Tables: `menu_item`, `orders`, `order_line`, `payment_event`.

### Option B: without Docker (for development, with hot reload)
You need **Node.js 22** and Docker (only for the database). Use three terminals:

```bash
# Terminal 1: database only
docker compose up -d db

# Terminal 2: API on http://localhost:3001
cd api
cp .env.example .env
npm install
npm run db:reset          # create the tables + demo menu
npm run start:dev

# Terminal 3: web on http://localhost:3000
cd web
cp .env.example .env.local
npm install
npm run dev
```
Tests in this mode: `cd api && npm test`.
Run Prisma commands from inside `api/`, otherwise `npx` downloads a different Prisma version.

---

## Tests

7 integration tests run against a **real Postgres database**, not mocks. A race condition only happens in a real database, so a mock couldn't prove anything.

- **Last item:** 20 customers order the last item at the same moment → exactly 1 gets it, 19 are told it's sold out.
- **No overselling:** stock 5, 20 orders at once → exactly 5 succeed.
- **Same payment twice:** the first confirmation pays the order, the second is recognised as a duplicate, and the order isn't touched again.
- **Same payment 10× at once:** exactly one is applied.
- Plus: a late confirmation for an already-paid order, a wrong amount, and a retried order with the same idempotency key.

**Do the tests really catch races?** I checked by breaking the code on purpose: I replaced the safe stock update with the classic "read stock, check it, then save" version. **19 out of 20 customers bought the single last item**, and the tests failed. With the real code back, they pass.

---

## How it works (the short version)

**Never selling the last item twice.** Stock is reduced with one SQL statement:

```sql
UPDATE menu_item SET stock = stock - 1 WHERE id = 7 AND stock >= 1
```

The check and the change happen in a single step, so there's no gap where two orders can both see "1 left". If two orders arrive together, Postgres makes the second one wait, then re-checks: stock is now 0, so it updates nothing and that customer gets "sold out".

**Confirming a payment exactly once.** Two safety nets:
1. Every confirmation has an event ID from the provider, and the database won't store the same ID twice. A retry is recognised and ignored.
2. An order only moves from *pending* to *paid* if it's still pending (`UPDATE … WHERE status = 'PENDING'`). So even two *different* confirmations can only pay it once, and a late one can't change anything.

The endpoint answers 200 for these, because providers keep retrying until they get a success response.

**A safe "Try again".** If the order request times out, the screen can't know whether the order went through. Each attempt carries an idempotency key, so pressing "Try again" returns the same order instead of creating a second one.

More detail, with diagrams: [architecture](docs/01-architecture.md) · [database](docs/02-database.md) · [flows](docs/03-flows.md) · [UI states](docs/04-ui-states.md) · [progress log](docs/PROGRESS.md)

---

## My decisions, and what I gave up

- **PostgreSQL over MongoDB.** Both promises above rely on things a relational database does well: row locks, conditional updates and unique constraints. It's also closest to the MSSQL I use at work. *Gave up:* a flexible schema, which this small, relational data doesn't need.
- **NestJS over Express.** It has the same building blocks as ASP.NET Core (modules, dependency injection, controllers), so I could keep my usual layers: Controller → Handler → Manager → Repository. *Gave up:* simplicity; it's more framework than 3 endpoints strictly need.
- **No Service layer.** Here it would only pass calls along. Business rules live in the Manager, database queries in the Repository. I'd add a Service once two managers need to share logic.
- **A mediator (`@nestjs/cqrs`) for handlers,** like MediatR in .NET. One handler per use case, and controllers stay one line. *Gave up:* one extra step to follow. It's easy to remove if the team prefers.
- **Stock is reserved when the order is placed, not when it's paid.** The customer at the kiosk needs to know right away if they got the item. *Gave up:* unpaid orders keep their stock (see below).
- **Money stored as whole cents (satang).** No rounding errors.
- **Slightly older versions** (NestJS 11, Prisma 6) that I already knew, to reduce risk in an 8-hour build. Upgrading is a separate task, protected by the tests.
- **Simple Docker images** that include dev tools, so the same container can run the tests and the simulator. *Gave up:* smaller production images.

### Caching
**There's no cache for stock, on purpose.** Stock is the one number that must never be out of date.

- The menu page is rendered on the server **for every request**, with fresh data from the database. It never needs a rebuild or redeploy.
- After an order (successful or not), the page refreshes itself, so you immediately see the new stock or "Sold out".
- Other people's orders show up on your screen within about 5 seconds, through a light background refresh.

I didn't use Redis because it would create a second copy of the stock that has to be kept in sync. If that copy is ever wrong, the kiosk shows a sold-out item as available, which is exactly what this project must prevent. With one kiosk, there's no traffic that would justify the risk.

---

## What's missing (honest list)

- **Unpaid orders hold stock forever.** There's no expiry yet.
- **The payment endpoint doesn't check who's calling it.** A real provider signs its requests; checking that signature comes before going live. (Left out because the brief excludes authentication.)
- **The customer never sees "Paid"** on screen; it stays at "Waiting for payment".
- **No automated frontend tests.** The UI was tested by hand.
- Swagger documents the requests but not the responses.

## What I'd do with another day

1. Expire unpaid orders after a few minutes and return their stock.
2. Verify the payment provider's signature.
3. Show "Paid" to the customer once the payment is confirmed.
4. Push stock updates live (Server-Sent Events) instead of refreshing every 5 seconds.
5. A cart for several items. The API already supports it; only the screen is missing.
6. A few browser tests (e.g. the last-item race in two tabs), and full response docs in Swagger.

---

## Coming from .NET and Angular
*My own notes. The AI only tidied the English.*

**What carried over.** Most of my backend thinking carried over: system design, design patterns, and the modular architecture I use at work (Controller → Handler → Manager → Repository). NestJS made this easy because it has the same building blocks as ASP.NET Core. Database design carried over too, though I'm still a beginner there; my MSSQL experience made Postgres feel familiar. So did my way of working with Claude Code at work.

**What surprised me.** TypeScript types are much less strict than C#: a lot is inferred, so at first I couldn't see what a method returned without hovering over it (I asked for explicit return types because of this). Prisma was new to me. Swagger wasn't part of the stack, so I added it, because that's how I'm used to testing APIs. And keeping my code in an iCloud-synced folder broke my packages and cost me uncommitted work.

**What I got wrong at first.** I assumed I needed a Service layer like in my .NET projects. In review we found it would only pass calls through, because the Manager and Repository already cover everything, so we left it out. I also wanted a "Pay" button on the kiosk, until we realised that if the customer's screen could confirm payment, anyone could mark any order as paid. Only the provider should confirm it.

**Where I'm still weak.** The Next.js frontend is where I know the least. HTML, CSS and basic TypeScript are fine, but Server vs Client Components and TSX are still new to me. I can map NestJS to .NET at the architecture level, but I don't yet know NestJS's own conventions well. Docker is easy to *use* (`docker compose up`), but I can't write Dockerfiles fluently yet. My strength is seeing the whole backend flow.

---

## How I used AI

I used **Claude Code**, as I do at work. The full log is in [docs/ai-log.md](docs/ai-log.md).

**Who did what.** The AI wrote most of the code and the first drafts of the docs. I made the decisions (stack, database, what to leave out, such as a cart, a payment page and Redis), reviewed every phase, and asked for changes. For example, my question about timeouts led to the idempotency key, and I set the retry rule (no limit, but suggest asking staff after two failures). I committed every step myself after reading it.

**How I checked it.** Every step was run, not just read: each success and error case by hand, the type checker and linter, a fresh install with Docker, and tests on a real database. The concurrency tests were themselves checked by breaking the code on purpose.

**Times the AI got it wrong** (9 in the log), for example:
- **Swagger showed empty forms.** The page loaded fine, so it looked done, but the generated spec was empty. The plugin only reads files named `*.dto.ts`, and ours are `*.request.ts`.
- **It designed with old Next.js functions** that changed in version 16. Caught by reading the docs that ship inside Next.js itself, instead of trusting memory.
- **A "Start over" button that did nothing visible**, and some React patterns the linter flagged as wrong.
- **A small JavaScript trap** (`flatMap(fn)` passing an extra argument) that the TypeScript compiler caught.
