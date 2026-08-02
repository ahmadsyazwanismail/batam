'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * The only state the app keeps: what has been ticked off.
 *
 * Persisted to localStorage so it survives the app being killed on a phone with
 * no signal, which is the situation it was written for. There is no server and
 * nothing syncs.
 */
interface TripState {
  /** Place keys already visited. The advisor stops suggesting these. */
  readonly done: readonly string[];
  /** Packing checklist keys already ticked. */
  readonly packed: readonly string[];
  toggleDone: (key: string) => void;
  togglePacked: (key: string) => void;
  isDone: (key: string) => boolean;
  isPacked: (key: string) => boolean;
  reset: () => void;
}

const toggle = (list: readonly string[], key: string): string[] =>
  list.includes(key) ? list.filter((k) => k !== key) : [...list, key];

export const useTrip = create<TripState>()(
  persist(
    (set, get) => ({
      done: [],
      packed: [],
      toggleDone: (key) => set((s) => ({ done: toggle(s.done, key) })),
      togglePacked: (key) => set((s) => ({ packed: toggle(s.packed, key) })),
      isDone: (key) => get().done.includes(key),
      isPacked: (key) => get().packed.includes(key),
      reset: () => set({ done: [], packed: [] }),
    }),
    { name: 'batam-lines' },
  ),
);

/**
 * Zustand rehydrates from localStorage after mount, so anything reading the
 * store has to wait a tick or the server and client markup disagree.
 *
 * The `persist` API is absent when there is no localStorage at all — which is
 * every prerendered page at build time, and a browser with storage blocked. In
 * both cases there is nothing to wait for, so this reports hydrated and the
 * store simply runs in memory.
 */
export function useHydrated(): boolean {
  const persistApi = useTrip.persist as typeof useTrip.persist | undefined;
  const [hydrated, setHydrated] = useState(() => persistApi?.hasHydrated() ?? false);

  useEffect(() => {
    if (!persistApi) {
      setHydrated(true);
      return;
    }
    if (persistApi.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return persistApi.onFinishHydration(() => setHydrated(true));
  }, [persistApi]);

  return hydrated;
}
