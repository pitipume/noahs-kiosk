const thb = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });

/** 6500 → "฿65.00" */
export const formatPrice = (cents: number) => thb.format(cents / 100);

/** First 8 chars of the UUID, enough for a customer to read out to staff. */
export const shortOrderId = (orderId: string) => orderId.slice(0, 8).toUpperCase();

export const LOW_STOCK = 3;
export const MAX_QUANTITY = 10;
