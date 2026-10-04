// Shapes returned by the API (api/src/modules/*/...response.ts).

export interface MenuItem {
  id: number;
  name: string;
  priceCents: number;
  stock: number;
}

export interface PlacedOrder {
  orderId: string;
  status: 'PENDING' | 'PAID';
  totalCents: number;
  lines: { menuItemId: number; name: string; quantity: number; unitPriceCents: number }[];
}

/** What the placeOrder Server Action returns to the form. `at` makes every result unique. */
export type OrderResult =
  | { status: 'idle' }
  | { status: 'success'; at: number; order: PlacedOrder }
  | { status: 'rejected'; at: number; code: string; available?: number } // definite "no" (4xx)
  | { status: 'unknown'; at: number }; // timeout / 5xx: we don't know if the order exists
