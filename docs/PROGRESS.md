# Progress log

Time budget: **≤ 8 hours total** (brief). Status: ⬜ todo · 🟨 in progress · ✅ done · ⏭️ skipped (with reason)

## Plan

| # | Phase | Est. | Status |
|---|---|---|---|
| 1 | Read brief, decide stack, write design docs (architecture, DB, flows) | 1h | ✅ |
| 2 | API scaffold: NestJS + Prisma schema + migration + seed + Docker Postgres | 1h | ⬜ |
| 3 | `GET /menu` | 0.25h | ⬜ |
| 4 | `POST /orders` with atomic stock reservation | 1h | ⬜ |
| 4b | `Idempotency-Key` on `POST /orders` (safe retry after timeout) | 0.5h | ⬜ |
| 5 | `POST /payments/confirm` idempotent | 1h | ⬜ |
| 6 | Integration tests: concurrent orders + duplicate confirmations | 1h | ⬜ |
| 7 | Web: Next.js menu page (SSR) + order form + Server Action + refresh | 1.25h | ⬜ |
| 8 | Docker Compose one-command run, payment simulator script | 0.5h | ⬜ |
| 9 | README: run, decisions, trade-offs, next day, .NET/Angular reflection, AI usage | 0.5h | ⬜ |

## Log (what actually happened)

### 2026-10-04
- Read brief. Chose NestJS + PostgreSQL + Prisma, Next.js App Router, Jest integration tests, Docker Compose.
- Design docs written: `01-architecture.md`, `02-database.md`, `03-flows.md`.
- Design review round 1 (my feedback): added the Service-layer rationale, module table ownership, use-case folder (Request/Response), no-try/catch error handling with stable error `code`s, an honest note on CQRS (mediator only); DB naming (snake_case), UTC `timestamptz`, why there's no `created_by` yet; why there's no queue; new `04-ui-states.md` covering every happy/fail path the customer can hit.

- Design review round 2: clarified `timestamptz` (a type, not a naming choice); added idempotency key on orders so "Try again" after a timeout can't create a second order. Round 3: retry policy = manual, no hard cap, escalate to staff after 2 failures; lock quantity during retry.

## Out of scope (by brief): auth, styling, deployment, admin screens

## Next (if another day): see README → "What I would do next"
