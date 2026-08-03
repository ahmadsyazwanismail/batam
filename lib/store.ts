'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  createSavedPlace,
  SAVED_PREFIX,
  type SavedPlace,
  type SavedPlaceDraft,
} from './savedPlaces';

/**
 * The state the app keeps: what has been ticked off, and what you have added.
 *
 * Persisted to localStorage so it survives the app being killed on a phone with
 * no signal, which is the situation it was written for. There is no server and
 * nothing syncs.
 *
 * Saved places sit here rather than in their own store so there is one
 * rehydration to wait for rather than two — a second store would mean a second
 * gate on every screen that reads both.
 */
interface TripState {
  /** Place keys already visited. The advisor stops suggesting these. */
  readonly done: readonly string[];
  /** Packing checklist keys already ticked. */
  readonly packed: readonly string[];
  /** Places added on the trip. See lib/savedPlaces.ts. */
  readonly saved: readonly SavedPlace[];
  toggleDone: (key: string) => void;
  togglePacked: (key: string) => void;
  isDone: (key: string) => boolean;
  isPacked: (key: string) => boolean;
  addSaved: (draft: SavedPlaceDraft) => SavedPlace;
  updateSaved: (id: string, patch: Partial<SavedPlaceDraft>) => void;
  removeSaved: (id: string) => void;
  reset: () => void;
}

const toggle = (list: readonly string[], key: string): string[] =>
  list.includes(key) ? list.filter((k) => k !== key) : [...list, key];

export const useTrip = create<TripState>()(
  persist(
    (set, get) => ({
      done: [],
      packed: [],
      saved: [],
      toggleDone: (key) => set((s) => ({ done: toggle(s.done, key) })),
      togglePacked: (key) => set((s) => ({ packed: toggle(s.packed, key) })),
      isDone: (key) => get().done.includes(key),
      isPacked: (key) => get().packed.includes(key),
      addSaved: (draft) => {
        const place = createSavedPlace(draft);
        set((s) => ({ saved: [...s.saved, place] }));
        return place;
      },
      updateSaved: (id, patch) =>
        set((s) => ({
          saved: s.saved.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...patch,
                  ...(patch.name === undefined ? {} : { name: patch.name.trim() }),
                  ...(patch.note === undefined ? {} : { note: patch.note.trim() }),
                }
              : p,
          ),
        })),
      // Also drops the tick, so re-adding the same place does not come back
      // already crossed out.
      removeSaved: (id) =>
        set((s) => ({
          saved: s.saved.filter((p) => p.id !== id),
          done: s.done.filter((k) => k !== `${SAVED_PREFIX}${id}`),
        })),
      // Starting the trip over clears the ticks. It does not throw away places
      // you went to the trouble of adding — those are your data, not progress.
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
