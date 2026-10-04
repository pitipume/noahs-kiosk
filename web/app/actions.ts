'use server';

import { refresh } from 'next/cache';
import { API_TIMEOUT_MS, API_URL } from '@/lib/api';
import { OrderResult } from '@/lib/types';

/**
 * Server Action: runs on the Next.js server when the order form is submitted.
 * Calls the API, then refresh() re-renders the page so the new stock shows up,
 * on success AND on failure (a customer who lost the race should see "Sold out").
 */
export async function placeOrder(_previous: OrderResult, formData: FormData): Promise<OrderResult> {
  const menuItemId = Number(formData.get('menuItemId'));
  const quantity = Number(formData.get('quantity'));
  const idempotencyKey = String(formData.get('idempotencyKey'));
  const at = Date.now();

  let result: OrderResult;
  try {
    const res = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ lines: [{ menuItemId, quantity }] }),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    const body = await res.json();

    if (res.ok) result = { status: 'success', at, order: body };
    else if (res.status < 500) result = { status: 'rejected', at, code: body.code, available: body.available };
    else result = { status: 'unknown', at }; // 5xx: the API failed, the order may or may not exist
  } catch {
    result = { status: 'unknown', at }; // timeout or network error: same uncertainty
  }

  refresh();
  return result;
}
