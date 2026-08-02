'use client';

import { useEffect, useState } from 'react';
import { forecastUrl, parseForecast, type Forecast } from './weather';

/**
 * The forecast, fetched once and then remembered.
 *
 * Everything else in this app works with no signal because it is compiled into
 * the bundle. A forecast cannot be, so this is the one place that has to cope
 * with the network being absent, slow or lying — which on a roaming phone in
 * Batam is the normal case, not the edge case.
 *
 * So: the last good answer is kept in localStorage and shown immediately, the
 * network is only asked again once it is a few hours stale, and a failure is
 * never fatal — it just leaves you with the older forecast and a note saying
 * when it came from.
 */

const CACHE_KEY = 'batam-weather';
/** Open-Meteo updates hourly; asking more often than this is just traffic. */
const STALE_AFTER_MS = 3 * 3_600_000;
/** A forecast this old is not worth showing at all. */
const USELESS_AFTER_MS = 5 * 86_400_000;

export type WeatherState =
  | { readonly status: 'loading'; readonly forecast: Forecast | null }
  | { readonly status: 'ready'; readonly forecast: Forecast; readonly stale: boolean }
  | { readonly status: 'unavailable'; readonly forecast: null };

function readCache(now: number): Forecast | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { days, fetchedAt } = parsed as Partial<Forecast>;
    if (!Array.isArray(days) || typeof fetchedAt !== 'number') return null;
    if (now - fetchedAt > USELESS_AFTER_MS) return null;
    return { days, fetchedAt };
  } catch {
    // Private mode, a full quota, or somebody else's key. None of it matters.
    return null;
  }
}

export function useWeather(): WeatherState {
  const [state, setState] = useState<WeatherState>({ status: 'loading', forecast: null });

  useEffect(() => {
    let cancelled = false;
    const now = Date.now();
    const cached = readCache(now);

    if (cached) {
      setState({ status: 'ready', forecast: cached, stale: now - cached.fetchedAt > STALE_AFTER_MS });
      if (now - cached.fetchedAt <= STALE_AFTER_MS) return;
    }

    // Don't even try when the browser already knows there is nothing out there.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      if (!cached) setState({ status: 'unavailable', forecast: null });
      return;
    }

    const controller = new AbortController();
    // A forecast is a nicety. It does not get to hold anything up.
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    fetch(forecastUrl(), { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('bad status'))))
      .then((payload: unknown) => {
        const fresh = parseForecast(payload, Date.now());
        if (cancelled) return;
        if (!fresh) {
          if (!cached) setState({ status: 'unavailable', forecast: null });
          return;
        }
        try {
          window.localStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
        } catch {
          // Not being able to remember it is not a reason not to show it.
        }
        setState({ status: 'ready', forecast: fresh, stale: false });
      })
      .catch(() => {
        if (cancelled || cached) return;
        setState({ status: 'unavailable', forecast: null });
      })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);

  return state;
}
