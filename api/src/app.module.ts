import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from './common/prisma/prisma.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    CqrsModule.forRoot(),
    PrismaModule,
    MenuModule,
    OrdersModule,
    PaymentsModule,
  ],
})
export class AppModule {}
