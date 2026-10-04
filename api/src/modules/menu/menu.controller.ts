import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetMenuQuery } from './queries/get-menu/get-menu.query';
import { MenuItemResponse } from './queries/get-menu/get-menu.response';

@Controller('menu')
export class MenuController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  getMenu(): Promise<MenuItemResponse[]> {
    return this.queryBus.execute(new GetMenuQuery());
  }
}
