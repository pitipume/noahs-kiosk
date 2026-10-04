import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { MenuManager } from '../../managers/menu.manager';
import { GetMenuQuery } from './get-menu.query';
import { MenuItemResponse } from './get-menu.response';

@QueryHandler(GetMenuQuery)
export class GetMenuHandler implements IQueryHandler<
  GetMenuQuery,
  MenuItemResponse[]
> {
  constructor(private readonly menuManager: MenuManager) {}

  async execute(): Promise<MenuItemResponse[]> {
    const items = await this.menuManager.listMenu();
    // Shape the response explicitly: never leak DB columns (created_at, ...) by accident.
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      priceCents: item.priceCents,
      stock: item.stock,
    }));
  }
}
