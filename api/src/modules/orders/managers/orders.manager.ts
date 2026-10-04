import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MenuRepository } from '../../menu/repositories/menu.repository';
import { OrderLineInput } from '../commands/place-order/place-order.command';
import {
  OrdersRepository,
  OrderWithLines,
} from '../repositories/orders.repository';

@Injectable()
export class OrdersManager {
  constructor(
    private readonly prisma: PrismaService,
    private readonly menuRepository: MenuRepository,
    private readonly ordersRepository: OrdersRepository,
  ) {}

  /**
   * Places an order and reserves its stock, all-or-nothing.
   * Same idempotencyKey again → returns the existing order, never creates a second one.
   * Flow + reasoning: docs/03-flows.md §2 and §4.
   */
  async placeOrder(
    lines: OrderLineInput[],
    idempotencyKey?: string,
  ): Promise<OrderWithLines> {
    // Fast path for a retry: the order already exists → hand it back, touch nothing.
    if (idempotencyKey) {
      const existing = await this.ordersRepository.findByIdempotencyKey(
        this.prisma,
        idempotencyKey,
      );
      if (existing) return existing;
    }

    try {
      return await this.prisma.$transaction((tx) =>
        this.reserveStockAndCreateOrder(
          tx,
          normalizeLines(lines),
          idempotencyKey,
        ),
      );
    } catch (error) {
      // Two requests with the same key raced past the fast path. The UNIQUE index let
      // one commit; ours rolled back (stock released). Return the winner's order.
      // This is the one place a try/catch earns its keep: translating a DB error.
      if (idempotencyKey && isUniqueViolation(error, 'idempotency_key')) {
        const winner = await this.ordersRepository.findByIdempotencyKey(
          this.prisma,
          idempotencyKey,
        );
        if (winner) return winner;
      }
      throw error;
    }
  }

  private async reserveStockAndCreateOrder(
    tx: Prisma.TransactionClient,
    lines: OrderLineInput[],
    idempotencyKey?: string,
  ): Promise<OrderWithLines> {
    const items = await this.menuRepository.findByIds(
      tx,
      lines.map((l) => l.menuItemId),
    );
    const itemsById = new Map(items.map((item) => [item.id, item]));

    for (const line of lines) {
      const item = itemsById.get(line.menuItemId);
      if (!item) {
        throw new NotFoundException({
          statusCode: 404,
          code: 'MENU_ITEM_NOT_FOUND',
          message: `Menu item ${line.menuItemId} does not exist`,
          menuItemId: line.menuItemId,
        });
      }

      const reserved = await this.menuRepository.tryDecrementStock(
        tx,
        line.menuItemId,
        line.quantity,
      );
      if (!reserved) {
        // Throwing inside $transaction rolls back every reservation made so far.
        const available = await this.menuRepository.findStock(
          tx,
          line.menuItemId,
        );
        throw new ConflictException({
          statusCode: 409,
          code: 'OUT_OF_STOCK',
          message: `Only ${available} left of ${item.name}`,
          menuItemId: line.menuItemId,
          name: item.name,
          available,
        });
      }
    }

    const orderLines = lines.map((line) => ({
      menuItemId: line.menuItemId,
      quantity: line.quantity,
      unitPriceCents: itemsById.get(line.menuItemId)!.priceCents, // price snapshot
    }));
    const totalCents = orderLines.reduce(
      (sum, l) => sum + l.quantity * l.unitPriceCents,
      0,
    );

    return this.ordersRepository.create(tx, {
      idempotencyKey,
      totalCents,
      lines: orderLines,
    });
  }
}

/**
 * Merge duplicate lines for the same item, then sort by id.
 * Sorting means every transaction locks menu_item rows in the same order,
 * so two multi-item orders can never deadlock each other.
 */
export function normalizeLines(lines: OrderLineInput[]): OrderLineInput[] {
  const quantityById = new Map<number, number>();
  for (const { menuItemId, quantity } of lines) {
    quantityById.set(
      menuItemId,
      (quantityById.get(menuItemId) ?? 0) + quantity,
    );
  }
  return [...quantityById.entries()]
    .map(([menuItemId, quantity]) => ({ menuItemId, quantity }))
    .sort((a, b) => a.menuItemId - b.menuItemId);
}

/** Prisma error P2002 = unique constraint violated (on the given column). */
function isUniqueViolation(error: unknown, column: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    JSON.stringify(error.meta?.target ?? '').includes(column)
  );
}
