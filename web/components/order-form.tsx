'use client';

import { useActionState, useRef, useState } from 'react';
import { placeOrder } from '@/app/actions';
import { describeResult } from '@/lib/messages';
import { MAX_QUANTITY } from '@/lib/format';
import { MenuItem, OrderResult } from '@/lib/types';

export function OrderForm({ item }: { item: MenuItem }) {
  // One idempotency key per order attempt (docs/03-flows.md §4). A ref, not state:
  // it's never shown on screen, so changing it shouldn't re-render anything.
  const idempotencyKey = useRef<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [failures, setFailures] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null); // see startOver()

  // [last result, action for <form>, true while the request is in flight]
  const [result, formAction, isPending] = useActionState<OrderResult, FormData>(
    async (previous, formData) => {
      idempotencyKey.current ??= crypto.randomUUID(); // reuse it on "Try again"
      formData.set('idempotencyKey', idempotencyKey.current);

      const next = await placeOrder(previous, formData);

      if (next.status === 'unknown') {
        setFailures((n) => n + 1); // keep the SAME key: a retry can't create a second order
      } else {
        setFailures(0);
        idempotencyKey.current = null; // definite answer → the next order is a new order
      }
      return next;
    },
    { status: 'idle' },
  );

  // Derived, not stored: if stock drops under the selected quantity (auto-refresh), clamp it.
  const maxQuantity = Math.min(MAX_QUANTITY, item.stock);
  const selectedQuantity = Math.min(quantity, Math.max(maxQuantity, 1));

  // useActionState has no "reset", so "Start over" hides the current result instead.
  const shown: OrderResult = result.status !== 'idle' && result.at === dismissedAt ? { status: 'idle' } : result;
  const awaitingRetry = shown.status === 'unknown';
  const soldOut = item.stock === 0;
  const message = describeResult(shown, item.name, failures);

  function startOver() {
    if (result.status !== 'idle') setDismissedAt(result.at);
    idempotencyKey.current = null;
    setFailures(0);
    setQuantity(1);
  }

  return (
    <form action={formAction} className="order-form">
      <input type="hidden" name="menuItemId" value={item.id} />
      {/* A disabled <select> is not submitted, so the value travels in a hidden input. */}
      <input type="hidden" name="quantity" value={selectedQuantity} />

      <div className="order-controls">
        <label>
          Qty{' '}
          <select
            value={selectedQuantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            disabled={soldOut || isPending || awaitingRetry} // locked during a retry: the key means "this exact order"
          >
            {Array.from({ length: Math.max(maxQuantity, 1) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={(soldOut && !awaitingRetry) || isPending}>
          {isPending ? 'Placing your order…' : awaitingRetry ? 'Try again' : soldOut ? 'Sold out' : 'Order'}
        </button>

        {awaitingRetry && !isPending && (
          <button type="button" className="secondary" onClick={startOver}>
            Start over
          </button>
        )}
      </div>

      {message && !isPending && (
        <div className={`message ${message.tone}`} role="status" aria-live="polite">
          <strong>{message.title}</strong>
          {message.details.map((d) => (
            <p key={d}>{d}</p>
          ))}
        </div>
      )}
    </form>
  );
}
