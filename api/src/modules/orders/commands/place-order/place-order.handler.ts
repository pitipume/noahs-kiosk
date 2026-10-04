import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OrdersManager } from '../../managers/orders.manager';
import { PlaceOrderCommand } from './place-order.command';
import { PlaceOrderResponse } from './place-order.response';

@CommandHandler(PlaceOrderCommand)
export class PlaceOrderHandler implements ICommandHandler<
  PlaceOrderCommand,
  PlaceOrderResponse
> {
  constructor(private readonly ordersManager: OrdersManager) {}

  async execute(command: PlaceOrderCommand): Promise<PlaceOrderResponse> {
    const order = await this.ordersManager.placeOrder(
      command.lines,
      command.idempotencyKey,
    );
    return {
      orderId: order.id,
      status: order.status,
      totalCents: order.totalCents,
      createdAt: order.createdAt.toISOString(),
      lines: order.lines.map((line) => ({
        menuItemId: line.menuItemId,
        name: line.menuItem.name,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
      })),
    };
  }
}
