import { OrderResult } from './types';
import { formatPrice, shortOrderId } from './format';

// Every customer-facing message in one place. Spec: docs/04-ui-states.md

export interface Message {
  tone: 'success' | 'error' | 'warning';
  title: string;
  details: string[];
}

export function describeResult(result: OrderResult, itemName: string, failures: number): Message | null {
  switch (result.status) {
    case 'idle':
      return null;

    case 'success': {
      const { order } = result;
      const lines = order.lines.map((l) => `${l.quantity} × ${l.name}`).join(', ');
      return {
        tone: 'success',
        title: 'Order placed!',
        details: [
          `Order #${shortOrderId(order.orderId)} · ${lines} · Total ${formatPrice(order.totalCents)}`,
          'Status: Waiting for payment. Please complete payment at the payment terminal.',
        ],
      };
    }

    case 'rejected':
      return rejectedMessage(result.code, itemName, result.available);

    case 'unknown':
      return {
        tone: 'warning',
        title: "We couldn't confirm your order.",
        details: [
          "Please tap Try again. You won't be charged twice.",
          ...(failures >= 2 ? ['If this keeps happening, please ask staff.'] : []),
        ],
      };
  }
}

function rejectedMessage(code: string, itemName: string, available?: number): Message {
  const notCharged = 'You have not been charged.';
  switch (code) {
    case 'OUT_OF_STOCK':
      return available
        ? {
            tone: 'error',
            title: `Only ${available} ${itemName} left.`,
            details: [`Please lower the quantity and try again. ${notCharged}`],
          }
        : {
            tone: 'error',
            title: `Sorry, ${itemName} just sold out.`,
            details: [`Someone ordered the last one a moment before you. ${notCharged}`],
          };
    case 'MENU_ITEM_NOT_FOUND':
      return { tone: 'error', title: 'This item is no longer on the menu.', details: [notCharged] };
    case 'VALIDATION_FAILED':
      return { tone: 'error', title: 'Please choose a quantity between 1 and 10.', details: [] };
    default:
      return { tone: 'error', title: 'Something went wrong.', details: [`${notCharged} Please try again.`] };
  }
}
