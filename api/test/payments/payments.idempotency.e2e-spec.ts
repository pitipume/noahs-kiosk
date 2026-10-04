import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import {
  concurrently,
  confirmPayment,
  createTestApp,
  placeOrder,
  resetDb,
  seedItem,
} from '../support/helpers';

// Requirement 3: "Payment providers retry: the same confirmation can arrive
// more than once, late, or out of order. An order must be confirmed exactly once."
describe('POST /payments/confirm idempotency', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let orderId: string;
  let totalCents: number;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });
  beforeEach(async () => {
    await resetDb(prisma);
    const item = await seedItem(prisma, 10, 6500);
    const res = await placeOrder(app, item.id);
    orderId = res.body.orderId;
    totalCents = res.body.totalCents;
  });
  afterAll(() => app.close());

  it('same confirmation twice -> confirmed once, second is a DUPLICATE no-op', async () => {
    const event = { eventId: 'evt_1', orderId, amountCents: totalCents };

    const first = await confirmPayment(app, event);
    const paidAtAfterFirst = (
      await prisma.order.findUniqueOrThrow({ where: { id: orderId } })
    ).paidAt;
    const second = await confirmPayment(app, event);

    expect(first.status).toBe(200);
    expect(first.body.result).toBe('APPLIED');
    expect(second.status).toBe(200); // 2xx so the provider stops retrying
    expect(second.body.result).toBe('DUPLICATE');

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(order.status).toBe('PAID');
    expect(order.paidAt).toEqual(paidAtAfterFirst); // the retry did not touch the order
    expect(await prisma.paymentEvent.count()).toBe(1);
  });

  it('same confirmation 10 times at once -> exactly one APPLIED', async () => {
    const event = { eventId: 'evt_race', orderId, amountCents: totalCents };

    const responses = await concurrently(10, () => confirmPayment(app, event));

    const results = responses.map((r) => r.body.result);
    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect(results.filter((r) => r === 'APPLIED')).toHaveLength(1);
    expect(results.filter((r) => r === 'DUPLICATE')).toHaveLength(9);
    expect(await prisma.paymentEvent.count()).toBe(1);
  });

  it('a different, late event for an already-paid order is IGNORED (recorded, changes nothing)', async () => {
    await confirmPayment(app, {
      eventId: 'evt_1',
      orderId,
      amountCents: totalCents,
    });

    const late = await confirmPayment(app, {
      eventId: 'evt_2',
      orderId,
      amountCents: totalCents,
    });

    expect(late.status).toBe(200);
    expect(late.body.result).toBe('IGNORED');
    const events = await prisma.paymentEvent.findMany({
      orderBy: { id: 'asc' },
    });
    expect(events.map((e) => e.result)).toEqual(['APPLIED', 'IGNORED']);
  });

  it('wrong amount is IGNORED and the order stays PENDING', async () => {
    const res = await confirmPayment(app, {
      eventId: 'evt_bad',
      orderId,
      amountCents: 1,
    });

    expect(res.body.result).toBe('IGNORED');
    expect(res.body.note).toContain('Amount mismatch');
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(order.status).toBe('PENDING');
  });
});
