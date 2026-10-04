import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import {
  concurrently,
  createTestApp,
  placeOrder,
  resetDb,
  seedItem,
} from '../support/helpers';

// Requirement 2: "It must never sell the same last item twice,
// even when two customers order it at the same moment."
describe('POST /orders under concurrency', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });
  beforeEach(() => resetDb(prisma));
  afterAll(() => app.close());

  it('sells the last item exactly once when 20 customers order it at the same moment', async () => {
    const item = await seedItem(prisma, 1);

    const responses = await concurrently(20, () => placeOrder(app, item.id));

    const statuses = responses.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(19);
    expect(responses.find((r) => r.status === 409)!.body.code).toBe(
      'OUT_OF_STOCK',
    );

    const after = await prisma.menuItem.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(after.stock).toBe(0);
    expect(await prisma.order.count()).toBe(1);
  });

  it('never oversells: stock 5, 20 concurrent orders -> exactly 5 succeed', async () => {
    const item = await seedItem(prisma, 5);

    const responses = await concurrently(20, () => placeOrder(app, item.id));

    expect(responses.filter((r) => r.status === 201)).toHaveLength(5);
    expect(responses.filter((r) => r.status === 409)).toHaveLength(15);
    const after = await prisma.menuItem.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(after.stock).toBe(0);
    const sold = await prisma.orderLine.aggregate({ _sum: { quantity: true } });
    expect(sold._sum.quantity).toBe(5);
  });

  it('same Idempotency-Key sent 10 times at once -> one order, stock taken once', async () => {
    const item = await seedItem(prisma, 3);

    const responses = await concurrently(10, () =>
      placeOrder(app, item.id, 1, 'retry-key-1'),
    );

    expect(responses.every((r) => r.status === 201)).toBe(true);
    const orderIds = new Set(responses.map((r) => r.body.orderId));
    expect(orderIds.size).toBe(1);
    expect(await prisma.order.count()).toBe(1);
    const after = await prisma.menuItem.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(after.stock).toBe(2);
  });
});
