import { Module } from '@nestjs/common';
import { MenuModule } from '../menu/menu.module';
import { OrdersController } from './orders.controller';
import { OrdersManager } from './managers/orders.manager';
import { OrdersRepository } from './repositories/orders.repository';
import { PlaceOrderHandler } from './commands/place-order/place-order.handler';

@Module({
  imports: [MenuModule], // for MenuRepository (stock reservation)
  controllers: [OrdersController],
  providers: [PlaceOrderHandler, OrdersManager, OrdersRepository],
  exports: [OrdersRepository], // used by PaymentsManager
})
export class OrdersModule {}
