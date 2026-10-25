'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export interface Loaded<T> { data: T | null; error: string | null; loading: boolean; reload: () => void }

// Fetches `path` (null = don't fetch). Keeps the previous data while reloading so charts don't flicker.
export function useApi<T>(path: string | null, pollMs = 0): Loaded<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (path === null) return;
    let cancelled = false;
    const run = () => api<T>(path)
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    run();
    const timer = pollMs > 0 ? setInterval(run, pollMs) : undefined;
    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, [path, pollMs, tick]);

  return { data, error, loading, reload };
}
