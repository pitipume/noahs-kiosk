import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * The DbContext of this app: one shared PrismaClient (with its connection pool).
 * Managers use `prisma.$transaction(...)`; repositories use the `tx` they are given.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

/** The client type a repository method receives: either the root client or a transaction. */
export type Tx = Prisma.TransactionClient;
