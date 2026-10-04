# CLAUDE.md: noahs-kiosk

A take-home for a NOAHS interview: a tiny kiosk ordering service ("the last item"). Read `docs/` before changing code.

## Hard rules
- **Scope is the brief only:** menu, orders, payment confirmation, SSR menu page, the 2 required tests. No auth, styling, deployment or admin screens.
- **Time box ≤ 8h.** Prefer the simplest thing that meets the requirement and is explainable live.
- **The owner must understand every line.** No clever abstractions, no libraries beyond those listed below without asking.
- **Don't commit.** Propose a commit message; the owner commits and pushes.
- After each phase, update `docs/PROGRESS.md`. When the AI makes a mistake that gets caught, add it to `docs/ai-log.md` truthfully.

## Stack
- `api/`: NestJS 11, `@nestjs/cqrs`, Prisma 6, PostgreSQL 16, class-validator, Jest + supertest
- `web/`: Next.js (App Router), React, no UI library, minimal CSS
- `docker-compose.yml`: db + api + web

## Backend layering (see docs/01-architecture.md)
Controller → Handler → Manager → Repository → PrismaService
- Controller: no logic, only `commandBus/queryBus.execute`
- Request DTO: validation via class-validator decorators
- Handler: calls the manager, shapes the response
- Manager: business rules, owns `$transaction`, passes `tx` to repositories
- Repository: one Prisma query per method, no decisions

## Correctness invariants (don't break these)
1. Stock decrement is a single conditional UPDATE (`WHERE stock >= qty`), never read-then-write.
2. Order lines are merged and sorted by `menuItemId` before reserving (deadlock avoidance).
3. Payment events are deduped by `UNIQUE(provider_event_id)` + `ON CONFLICT DO NOTHING`.
4. Order status transitions only via conditional UPDATE (`WHERE status = 'PENDING'`).
5. The menu page is never statically cached (`cache: 'no-store'`).
6. Errors carry a stable `code`; the UI maps codes to messages in `web/lib/messages.ts` (see docs/04-ui-states.md). No try/catch in handlers.
7. `POST /orders` honours the `Idempotency-Key` header: same key → same order, never a second one.
8. DB: snake_case via Prisma `@map`, all timestamps `timestamptz` (UTC).

## Commands
- `docker compose up --build`: everything (web :3000, api :3001, db :5432)
- `cd api && npm test`: integration tests (needs the db container running)
