'use client';

import { useEffect, useRef, useState } from 'react';
import { DEBOUNCE_MS, searchByName, type GeocodeHit } from './geocode';

/**
 * Search-as-you-type, debounced, with only one request ever in flight.
 *
 * Two things make this more than a `setTimeout`. Every new keystroke aborts the
 * request the last one started, so a slow answer for "Nag" can never arrive
 * after a fast one for "Nagoya" and overwrite it. And picking a result sets the
 * name field to that result's name — which would immediately search for it
 * again and reopen the list you just dismissed — so a pick is remembered and
 * that exact query is skipped once.
 */
export interface PlaceSearch {
  readonly hits: readonly GeocodeHit[];
  readonly searching: boolean;
  readonly error: string | null;
  /** True once a query long enough to search has been answered. */
  readonly answered: boolean;
  /** Call when a result is chosen, so its name does not trigger a new search. */
  readonly accept: (query: string) => void;
  /** Call to close the list without choosing, e.g. on Escape. */
  readonly dismiss: () => void;
}

export function usePlaceSearch(query: string, enabled = true): PlaceSearch {
  const [hits, setHits] = useState<readonly GeocodeHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const skip = useRef<string | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const q = query.trim();
    if (skip.current !== null && skip.current === q) return;
    skip.current = null;

    setError(null);
    if (q.length < 3) {
      setHits([]);
      setAnswered(false);
      setSearching(false);
      return;
    }

    // Shown immediately, before the debounce elapses: the field should look
    // busy from the keystroke, not from whenever the request happens to leave.
    setSearching(true);

    const timer = setTimeout(() => {
      const controller = new AbortController();
      inFlight.current = controller;
      void searchByName(q, { signal: controller.signal }).then((result) => {
        if (controller.signal.aborted) return;
        setSearching(false);
        setAnswered(true);
        if (result.ok) {
          setHits(result.hits);
        } else if (!('aborted' in result)) {
          setHits([]);
          setError(result.reason);
        }
      });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      inFlight.current?.abort();
    };
  }, [query, enabled]);

  // Nothing should be left running once the form goes away.
  useEffect(() => () => inFlight.current?.abort(), []);

  const accept = (chosen: string): void => {
    skip.current = chosen.trim();
    inFlight.current?.abort();
    setHits([]);
    setSearching(false);
    setAnswered(false);
    setError(null);
  };

  const dismiss = (): void => {
    inFlight.current?.abort();
    setHits([]);
    setSearching(false);
    setError(null);
    // Deliberately not `skip`: typing another character should search again.
  };

  return { hits, searching, error, answered, accept, dismiss };
}
