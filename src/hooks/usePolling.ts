import { useEffect, useRef, useState } from 'react';

export type FeedStatus = 'loading' | 'ok' | 'error';

export interface Feed<T> {
  data: T | undefined;
  status: FeedStatus;
  /** Epoch ms of the last successful fetch. */
  updatedAt: number | undefined;
}

/**
 * Calls `load` immediately and every `intervalMs` while the tab is visible,
 * refreshing on return to the tab when the data has gone stale. A failed
 * refresh keeps the last good data and only reports `error` when there is none.
 */
export function usePolling<T>(load: (signal: AbortSignal) => Promise<T>, intervalMs: number): Feed<T> {
  const [feed, setFeed] = useState<Feed<T>>({ data: undefined, status: 'loading', updatedAt: undefined });
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let lastSuccess = 0;

    const run = async () => {
      clearTimeout(timer);
      controller?.abort();
      controller = new AbortController();
      const { signal } = controller;
      try {
        const data = await loadRef.current(signal);
        lastSuccess = Date.now();
        setFeed({ data, status: 'ok', updatedAt: lastSuccess });
      } catch (err) {
        if (signal.aborted) return;
        console.warn('Feed refresh failed:', err);
        setFeed((prev) => (prev.data === undefined ? { ...prev, status: 'error' } : prev));
      }
      if (!document.hidden) timer = setTimeout(run, intervalMs);
    };

    const onVisibility = () => {
      if (document.hidden) clearTimeout(timer);
      else if (Date.now() - lastSuccess >= intervalMs) void run();
      else timer = setTimeout(run, intervalMs - (Date.now() - lastSuccess));
    };

    void run();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);

  return feed;
}

export async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}
