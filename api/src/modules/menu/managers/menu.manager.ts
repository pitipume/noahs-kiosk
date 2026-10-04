import { Injectable } from '@nestjs/common';
import { MenuItem } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MenuRepository } from '../repositories/menu.repository';

@Injectable()
export class MenuManager {
  constructor(
    private readonly prisma: PrismaService,
    private readonly menuRepository: MenuRepository,
  ) {}

  // Returns domain entities; the Handler shapes them into MenuItemResponse.
  listMenu(): Promise<MenuItem[]> {
    return this.menuRepository.findAll(this.prisma);
  }
}
