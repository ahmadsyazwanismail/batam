import type { Category, DayId, Place } from '@/data/trip';
import type { LatLon } from './geo';

/**
 * Places you add yourself, while you are there.
 *
 * The 38 places in `data/trip.ts` are the trip as booked, and nothing writes to
 * that file at runtime — it is the record of what was actually planned. This is
 * the other half: somewhere you hear about on the second day and want on the
 * map by the third. It lives in localStorage, on the phone, and nothing syncs.
 *
 * Saved places are deliberately kept distinguishable everywhere they appear —
 * their own pin, their own badge — so the app never blurs the line between "we
 * booked this" and "we might go here".
 */

export interface SavedPlace {
  readonly id: string;
  /**
   * Namespaced so it can never collide with a curated key, and so anything
   * keyed by place — the done list, the open sheet — works unchanged.
   */
  readonly key: string;
  readonly name: string;
  /** Free text. Empty is fine; not every place needs a description. */
  readonly note: string;
  readonly category: Category;
  /**
   * Which day you might go. Null is a real answer — "found this, no idea when"
   * — and is not silently turned into a day, because that would be the app
   * inventing a plan.
   */
  readonly day: DayId | null;
  readonly lat: number;
  readonly lon: number;
  /** Epoch ms, for stable ordering when two places are the same distance away. */
  readonly addedAt: number;
}

export type SavedPlaceDraft = Omit<SavedPlace, 'id' | 'key' | 'addedAt'>;

export const SAVED_PREFIX = 'saved:';

export const isSavedKey = (key: string): boolean => key.startsWith(SAVED_PREFIX);

/**
 * Ids come from the platform where it exists. The fallback is not a security
 * question — these never leave the phone — it only has to not collide with the
 * handful of places one family adds over five days.
 */
export function newId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function createSavedPlace(draft: SavedPlaceDraft, now = Date.now()): SavedPlace {
  const id = newId();
  return {
    ...draft,
    name: draft.name.trim(),
    note: draft.note.trim(),
    id,
    key: `${SAVED_PREFIX}${id}`,
    addedAt: now,
  };
}

/**
 * A saved place, shaped like a curated one.
 *
 * Everything that draws a place — the colour field, the pictogram, the distance
 * row, the directions link — reads `name`, `note`, `category` and the
 * coordinates, so a saved place can go through all of it untouched. The one
 * field it cannot honestly supply is `day`, which on a curated place means
 * "this is on the itinerary for day N". An unplaced saved place is given day 1
 * here *only* to satisfy the type: `asPlace` is for rendering, and no caller
 * uses `.day` off the result. Filtering and the day sections read
 * `SavedPlace.day`, which keeps the null.
 */
export function asPlace(saved: SavedPlace): Place {
  return {
    key: saved.key,
    name: saved.name,
    lat: saved.lat,
    lon: saved.lon,
    category: saved.category,
    day: saved.day ?? 1,
    note: saved.note,
  };
}

export const savedPoint = (saved: SavedPlace): LatLon => ({ lat: saved.lat, lon: saved.lon });

/** Newest first — the one you just added is the one you are looking for. */
export function byNewest(places: readonly SavedPlace[]): readonly SavedPlace[] {
  return [...places].sort((a, b) => b.addedAt - a.addedAt);
}

export function savedOnDay(places: readonly SavedPlace[], day: DayId): readonly SavedPlace[] {
  return byNewest(places.filter((p) => p.day === day));
}

/** The words a saved place answers to, matching `searchTerms` for curated ones. */
export function savedSearchTerms(saved: SavedPlace): readonly string[] {
  return [saved.name, saved.note, saved.category].map((t) => t.toLowerCase());
}

/**
 * What is wrong with a draft, or nothing.
 *
 * A name is the only thing genuinely required — the coordinates are supplied by
 * the form, and everything else has a sensible answer.
 */
export function draftProblem(draft: Pick<SavedPlaceDraft, 'name'>): string | null {
  if (!draft.name.trim()) return 'Give it a name so you can find it later.';
  if (draft.name.trim().length > 60) return 'That name is too long for a list row — keep it under 60.';
  return null;
}

export const CATEGORY_CHOICES: readonly { value: Category; label: string }[] = [
  { value: 'food', label: 'Food' },
  { value: 'shop', label: 'Shop' },
  { value: 'beach', label: 'Beach' },
  { value: 'land', label: 'Landmark' },
  { value: 'spa', label: 'Spa' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'dino', label: 'Dinosaurs' },
  { value: 'ferry', label: 'Ferry' },
];
