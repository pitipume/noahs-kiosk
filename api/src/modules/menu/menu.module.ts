import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller';
import { MenuManager } from './managers/menu.manager';
import { MenuRepository } from './repositories/menu.repository';
import { GetMenuHandler } from './queries/get-menu/get-menu.handler';

@Module({
  controllers: [MenuController],
  providers: [GetMenuHandler, MenuManager, MenuRepository],
  exports: [MenuRepository], // used by OrdersManager to reserve stock
})
export class MenuModule {}
