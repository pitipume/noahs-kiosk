/**
 * Plays the PAYMENT PROVIDER: calls POST /payments/confirm like a real provider's webhook,
 * optionally several times at once with the same eventId (= provider retries).
 *
 *   npm run simulate:payment                         # pay the newest PENDING order, once
 *   npm run simulate:payment -- --times 5            # same confirmation 5x at once
 *   npm run simulate:payment -- --order <uuid>       # a specific order
 *   npm run simulate:payment -- --event evt_123      # reuse an eventId (a late retry)
 *   npm run simulate:payment -- --amount 1           # wrong amount -> IGNORED
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

/** Success body ({ result, note }) or error body ({ code }) from POST /payments/confirm. */
interface ConfirmReply {
  result?: string;
  note?: string;
  code?: string;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  // The provider knows which order and how much it charged; we read that from the DB.
  const prisma = new PrismaClient();
  const orderId = arg('order');
  const order = orderId
    ? await prisma.order.findUnique({ where: { id: orderId } })
    : await prisma.order.findFirst({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });
  await prisma.$disconnect();

  if (!order) {
    console.error(
      orderId
        ? `Order ${orderId} not found`
        : 'No PENDING order. Place one first.',
    );
    process.exit(1);
  }

  const times = Number(arg('times') ?? 1);
  const body = {
    eventId: arg('event') ?? `evt_${randomUUID().slice(0, 8)}`,
    orderId: order.id,
    amountCents: Number(arg('amount') ?? order.totalCents),
  };
  console.log(`Sending ${times}x`, body);

  const results = await Promise.all(
    Array.from({ length: times }, () =>
      fetch(`${API_URL}/payments/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(async (res) => ({
        status: res.status,
        ...((await res.json()) as ConfirmReply),
      })),
    ),
  );
  console.table(
    results.map((r) => ({
      http: r.status,
      result: r.result ?? r.code,
      note: r.note ?? '',
    })),
  );
}

void main();
