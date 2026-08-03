import type { Category, DayId } from '@/data/trip';
import type { LatLon } from '@/lib/geo';
import type { SavedPlace } from '@/lib/savedPlaces';

/**
 * The in-progress "add a place" form, separated from the form itself.
 *
 * Both screens own a draft — it survives the sheet being closed, and on Places
 * it survives navigating to the map to drop a pin — but neither should have to
 * load the whole form to declare a piece of state. {@link AddPlaceSheet} is
 * loaded on demand; this is not.
 */
export interface DraftState {
  readonly name: string;
  readonly note: string;
  readonly category: Category;
  readonly day: DayId | null;
  readonly point: LatLon | null;
  /** How the point arrived, so the sheet can say so. Null when picked on the map. */
  readonly how: string | null;
}

export const EMPTY_DRAFT: DraftState = {
  name: '',
  note: '',
  category: 'food',
  day: null,
  point: null,
  how: null,
};

export function draftFrom(saved: SavedPlace): DraftState {
  return {
    name: saved.name,
    note: saved.note,
    category: saved.category,
    day: saved.day,
    point: { lat: saved.lat, lon: saved.lon },
    how: null,
  };
}
