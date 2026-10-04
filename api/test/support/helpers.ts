import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { createValidationPipe } from '../../src/common/validation';

/** Boots the real app (same modules + validation as main.ts) on a random port. */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(createValidationPipe());
  await app.listen(0);
  return app;
}

/** Empties every table so each test starts from a known state. */
export async function resetDb(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE payment_event, order_line, orders, menu_item RESTART IDENTITY CASCADE',
  );
}

export function seedItem(
  prisma: PrismaService,
  stock: number,
  priceCents = 5000,
) {
  return prisma.menuItem.create({
    data: { name: 'Last Croissant', priceCents, stock },
  });
}

export function placeOrder(
  app: INestApplication,
  menuItemId: number,
  quantity = 1,
  key?: string,
) {
  const req = request(app.getHttpServer())
    .post('/orders')
    .send({ lines: [{ menuItemId, quantity }] });
  return key ? req.set('Idempotency-Key', key) : req;
}

export function confirmPayment(
  app: INestApplication,
  body: { eventId: string; orderId: string; amountCents: number },
) {
  return request(app.getHttpServer()).post('/payments/confirm').send(body);
}

/** Fires `count` requests at the same moment and waits for all of them. */
export function concurrently<T>(
  count: number,
  fn: (i: number) => Promise<T>,
): Promise<T[]> {
  return Promise.all(Array.from({ length: count }, (_, i) => fn(i)));
}
