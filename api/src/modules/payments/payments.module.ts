import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsController } from './payments.controller';
import { PaymentsManager } from './managers/payments.manager';
import { PaymentsRepository } from './repositories/payments.repository';
import { ConfirmPaymentHandler } from './commands/confirm-payment/confirm-payment.handler';

@Module({
  imports: [OrdersModule], // for OrdersRepository (order lookup + status update)
  controllers: [PaymentsController],
  providers: [ConfirmPaymentHandler, PaymentsManager, PaymentsRepository],
})
export class PaymentsModule {}
