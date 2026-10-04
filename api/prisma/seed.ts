import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Demo menu. Some items start with low stock so "the last item" is easy to demo.
const MENU = [
  { name: 'Iced Latte', priceCents: 6500, stock: 10 },
  { name: 'Thai Milk Tea', priceCents: 5500, stock: 3 },
  { name: 'Matcha Latte', priceCents: 7500, stock: 1 },
  { name: 'Butter Croissant', priceCents: 4500, stock: 5 },
  { name: 'Mango Sticky Rice', priceCents: 9000, stock: 0 },
];

async function main() {
  // Only seed an empty table. The API container runs this on every start,
  // and re-seeding would silently reset stock that customers already bought.
  const count = await prisma.menuItem.count();
  if (count > 0) {
    console.log(`Seed skipped: menu_item already has ${count} rows`);
    return;
  }
  await prisma.menuItem.createMany({ data: MENU });
  console.log(`Seeded ${MENU.length} menu items`);
}

main().finally(() => prisma.$disconnect());
