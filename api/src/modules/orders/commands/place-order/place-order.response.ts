export interface PlaceOrderResponse {
  orderId: string;
  status: 'PENDING' | 'PAID';
  totalCents: number;
  createdAt: string; // ISO-8601 UTC
  lines: {
    menuItemId: number;
    name: string;
    quantity: number;
    unitPriceCents: number;
  }[];
}
