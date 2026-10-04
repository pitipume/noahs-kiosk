import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { GetMenuQuery } from './queries/get-menu/get-menu.query';
import { MenuItemResponse } from './queries/get-menu/get-menu.response';

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  getMenu(): Promise<MenuItemResponse[]> {
    return this.queryBus.execute(new GetMenuQuery());
  }
}
