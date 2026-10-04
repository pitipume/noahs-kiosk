import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Tx } from '../../../common/prisma/prisma.service';

// What every order query returns: the order + its lines + each line's item name.
const withLines = {
  lines: { include: { menuItem: { select: { name: true } } } },
} as const;

/** The type Prisma returns for `withLines`: order row + lines + each line's item name. */
export type OrderWithLines = Prisma.OrderGetPayload<{
  include: typeof withLines;
}>;

export interface NewOrderLine {
  menuItemId: number;
  quantity: number;
  unitPriceCents: number;
}

/** The only place that writes SQL for `orders` and `order_line`. */
@Injectable()
export class OrdersRepository {
  findById(db: Tx, id: string): Promise<OrderWithLines | null> {
    return db.order.findUnique({ where: { id }, include: withLines });
  }

  findByIdempotencyKey(
    db: Tx,
    idempotencyKey: string,
  ): Promise<OrderWithLines | null> {
    return db.order.findUnique({
      where: { idempotencyKey },
      include: withLines,
    });
  }

  /** Inserts the order and all its lines in one statement group (inside the caller's tx). */
  create(
    db: Tx,
    data: {
      idempotencyKey?: string;
      totalCents: number;
      lines: NewOrderLine[];
    },
  ): Promise<OrderWithLines> {
    return db.order.create({
      data: {
        idempotencyKey: data.idempotencyKey,
        totalCents: data.totalCents,
        lines: { create: data.lines },
      },
      include: withLines,
    });
  }
}
