import { Injectable } from '@nestjs/common';
import { MenuItem } from '@prisma/client';
import { Tx } from '../../../common/prisma/prisma.service';

/**
 * The only place that writes SQL for `menu_item`.
 * Exported from MenuModule so OrdersManager can reserve stock without
 * owning its own query on someone else's table.
 */
@Injectable()
export class MenuRepository {
  findAll(db: Tx): Promise<MenuItem[]> {
    return db.menuItem.findMany({ orderBy: { id: 'asc' } });
  }

  findByIds(db: Tx, ids: number[]): Promise<MenuItem[]> {
    return db.menuItem.findMany({ where: { id: { in: ids } } });
  }

  async findStock(db: Tx, id: number): Promise<number> {
    const item = await db.menuItem.findUnique({
      where: { id },
      select: { stock: true },
    });
    return item?.stock ?? 0;
  }

  /**
   * Reserve stock atomically. Check and write are ONE statement:
   *   UPDATE menu_item SET stock = stock - $qty WHERE id = $id AND stock >= $qty
   * Two concurrent calls on the last item: the second waits for the first's row
   * lock, then re-checks `stock >= qty` against the new value and updates 0 rows.
   * @returns true if reserved, false if not enough stock.
   */
  async tryDecrementStock(
    db: Tx,
    id: number,
    quantity: number,
  ): Promise<boolean> {
    const { count } = await db.menuItem.updateMany({
      where: { id, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    });
    return count === 1;
  }
}
