'use client';

import { useEffect, useState } from 'react';
import { archiveUrls, parseArchiveYear, summarise, type Climate } from './climate';
import { DAYS } from '@/data/trip';

/**
 * The climate normals, fetched once and then kept.
 *
 * What happened in previous Augusts does not change, so unlike the forecast
 * this is cached for a year rather than for three hours. It is also entirely
 * optional: it fills the gap before a forecast exists, and if it never arrives
 * the app is exactly as it was.
 */

const CACHE_KEY = 'batam-climate';
const KEEP_MS = 365 * 86_400_000;

export type ClimateState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly climate: Climate }
  | { readonly status: 'unavailable' };

function readCache(now: number): Climate | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { normals, fetchedAt, fromYear, toYear } = parsed as Partial<Climate>;
    if (!Array.isArray(normals) || typeof fetchedAt !== 'number') return null;
    if (typeof fromYear !== 'number' || typeof toYear !== 'number') return null;
    if (now - fetchedAt > KEEP_MS) return null;
    return { normals, fetchedAt, fromYear, toYear };
  } catch {
    return null;
  }
}

export function useClimate(enabled: boolean): ClimateState {
  const [state, setState] = useState<ClimateState>({ status: 'loading' });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const now = Date.now();

    const cached = readCache(now);
    if (cached) {
      setState({ status: 'ready', climate: cached });
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setState({ status: 'unavailable' });
      return;
    }

    const tripYear = Number((DAYS[0]?.date ?? '').slice(0, 4));
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);

    Promise.all(
      archiveUrls(tripYear).map((url) =>
        fetch(url, { signal: controller.signal })
          .then((r) => (r.ok ? r.json() : null))
          .then(parseArchiveYear)
          // One year missing is not a reason to lose the other nine.
          .catch(() => []),
      ),
    )
      .then((years) => {
        if (cancelled) return;
        const climate = summarise(years, tripYear, Date.now());
        if (!climate) {
          setState({ status: 'unavailable' });
          return;
        }
        try {
          window.localStorage.setItem(CACHE_KEY, JSON.stringify(climate));
        } catch {
          // Fine. It will be fetched again next time.
        }
        setState({ status: 'ready', climate });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'unavailable' });
      })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [enabled]);

  return state;
}
