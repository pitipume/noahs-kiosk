import 'server-only'; // this file must never be bundled for the browser
import { MenuItem } from './types';

// Server-side only: the browser never talks to the API directly (no CORS, URL stays internal).
export const API_URL = process.env.API_URL ?? 'http://localhost:3001';
export const API_TIMEOUT_MS = 5000;

export async function getMenu(): Promise<MenuItem[]> {
  const res = await fetch(`${API_URL}/menu`, {
    cache: 'no-store', // stock must never be stale (see README → Caching)
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`GET /menu failed with ${res.status}`);
  return res.json();
}
