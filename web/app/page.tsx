import { AutoRefresh } from '@/components/auto-refresh';
import { OrderForm } from '@/components/order-form';
import { getMenu } from '@/lib/api';
import { formatPrice, LOW_STOCK } from '@/lib/format';

// Render on every request, never at build time: stock changes constantly.
export const dynamic = 'force-dynamic';

// A Server Component: runs only on the server, can await data directly, ships no JS of its own.
export default async function MenuPage() {
  const menu = await getMenu();

  return (
    <main>
      <h1>Kiosk Menu</h1>
      <ul className="menu">
        {menu.map((item) => (
          <li key={item.id} className="card">
            <div className="card-header">
              <span className="name">{item.name}</span>
              <span className="price">{formatPrice(item.priceCents)}</span>
            </div>
            <StockLabel stock={item.stock} />
            <OrderForm item={item} />
          </li>
        ))}
      </ul>
      <AutoRefresh />
    </main>
  );
}

function StockLabel({ stock }: { stock: number }) {
  if (stock === 0) return <p className="stock out">Sold out</p>;
  if (stock <= LOW_STOCK) return <p className="stock low">Only {stock} left</p>;
  return <p className="stock">{stock} in stock</p>;
}
