import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from './common/prisma/prisma.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/orders/orders.module';

@Module({
  imports: [CqrsModule.forRoot(), PrismaModule, MenuModule, OrdersModule],
})
export class AppModule {}
