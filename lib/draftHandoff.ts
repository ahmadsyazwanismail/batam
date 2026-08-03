'use client';

import type { DraftState } from '@/components/addPlaceDraft';

/**
 * Carrying a half-filled "add a place" form from Places to the map and back.
 *
 * Only the map can drop a pin, so "Drop a pin" on the Places screen has to
 * navigate. Without this the name you had already typed would be gone when you
 * arrived, which is the sort of small betrayal that stops people using a
 * feature. sessionStorage rather than the trip store: this is in-flight UI
 * state for one navigation, not something to persist across app launches.
 */

const KEY = 'batam-add-draft';

export function stashDraft(draft: DraftState): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Private mode. You lose the typing, not the feature.
  }
}

/** Reads and clears — a handoff is consumed once. */
export function takeDraft(): DraftState | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const d = parsed as Partial<DraftState>;
    // Anything could be in storage — an old shape, another tab, a hand edit —
    // so every field is checked rather than trusted.
    return {
      name: typeof d.name === 'string' ? d.name : '',
      note: typeof d.note === 'string' ? d.note : '',
      category: typeof d.category === 'string' ? (d.category as DraftState['category']) : 'food',
      day: typeof d.day === 'number' && d.day >= 1 && d.day <= 5 ? (d.day as DraftState['day']) : null,
      point:
        d.point && typeof d.point.lat === 'number' && typeof d.point.lon === 'number'
          ? { lat: d.point.lat, lon: d.point.lon }
          : null,
      how: typeof d.how === 'string' ? d.how : null,
    };
  } catch {
    return null;
  }
}
