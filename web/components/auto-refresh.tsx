'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Re-fetches the server-rendered page every few seconds so stock changes made by
 * OTHER customers show up. router.refresh() keeps client state (form inputs, messages).
 * Simple polling on purpose; live push (SSE) is a "next day" item in the README.
 */
export function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh(); // skip background tabs
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
