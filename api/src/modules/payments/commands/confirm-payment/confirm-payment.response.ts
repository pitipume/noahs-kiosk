/**
 * APPLIED   - this event moved the order PENDING -> PAID
 * DUPLICATE - we already processed this eventId (a provider retry); nothing changed
 * IGNORED   - a new event that changed nothing (order already paid, or amount mismatch); see note
 */
export type ConfirmPaymentResult = 'APPLIED' | 'DUPLICATE' | 'IGNORED';

export interface ConfirmPaymentResponse {
  result: ConfirmPaymentResult;
  orderId: string;
  orderStatus: 'PENDING' | 'PAID';
  note?: string;
}
