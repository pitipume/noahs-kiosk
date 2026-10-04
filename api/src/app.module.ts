import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from './common/prisma/prisma.module';

@Module({
  imports: [CqrsModule.forRoot(), PrismaModule],
})
export class AppModule {}
