import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { IdempotencyKey } from '../../common/decorators/idempotency-key.decorator';
import { PlaceOrderCommand } from './commands/place-order/place-order.command';
import { PlaceOrderRequest } from './commands/place-order/place-order.request';
import { PlaceOrderResponse } from './commands/place-order/place-order.response';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly commandBus: CommandBus
  ) {}

  // 201 for a new order AND for a replayed key: a retry gets the same answer
  // the first request would have got (same as Stripe's idempotency behaviour).
  @Post()
  place(
    @Body() body: PlaceOrderRequest,
    @IdempotencyKey() idempotencyKey: string | undefined,
  ): Promise<PlaceOrderResponse> {
    return this.commandBus.execute(
      new PlaceOrderCommand(body.lines, idempotencyKey),
    );
  }
}
