import { beforeEach, describe, expect, it } from 'vitest';
import {
  asPlace,
  byNewest,
  createSavedPlace,
  draftProblem,
  isSavedKey,
  savedOnDay,
  savedSearchTerms,
  type SavedPlaceDraft,
} from './savedPlaces';
import { PLACES } from '@/data/trip';
import { glyphFor } from './glyph';
import { fieldStyle } from './palette';
import { useTrip } from './store';

// Node has no localStorage, so zustand's persist middleware logs on every
// write. The app is built to survive exactly that (private browsing), but the
// warnings drown the test output, so give it somewhere to write.
const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
    clear: () => memory.clear(),
    key: () => null,
    length: 0,
  },
});

const draft = (over: Partial<SavedPlaceDraft> = {}): SavedPlaceDraft => ({
  name: 'Kopi Kenangan',
  note: 'iced pandan latte',
  category: 'food',
  day: null,
  lat: 1.1301,
  lon: 104.0529,
  ...over,
});

describe('creating one', () => {
  it('namespaces the key so it can never collide with a curated place', () => {
    const place = createSavedPlace(draft());
    expect(isSavedKey(place.key)).toBe(true);
    expect(PLACES.some((p) => p.key === place.key)).toBe(false);
  });

  it('gives two places added in the same millisecond different keys', () => {
    const a = createSavedPlace(draft(), 1_000);
    const b = createSavedPlace(draft(), 1_000);
    expect(a.key).not.toBe(b.key);
  });

  it('trims the name and note, so a stray space is not part of the name', () => {
    const place = createSavedPlace(draft({ name: '  Pagi Sore  ', note: '  nice  ' }));
    expect(place.name).toBe('Pagi Sore');
    expect(place.note).toBe('nice');
  });

  it('keeps "no day yet" as no day rather than defaulting to one', () => {
    // The app must not decide which day you are going. Null survives.
    expect(createSavedPlace(draft({ day: null })).day).toBeNull();
  });
});

describe('rendering as a place', () => {
  it('carries the fields every place component reads', () => {
    const place = asPlace(createSavedPlace(draft()));
    expect(place).toMatchObject({
      name: 'Kopi Kenangan',
      note: 'iced pandan latte',
      category: 'food',
      lat: 1.1301,
      lon: 104.0529,
    });
  });

  it('goes through the real glyph and colour-field code, not a parallel copy', () => {
    // The whole reason asPlace exists. If a saved place ever needed its own
    // pictogram table and its own palette, they would drift.
    const place = asPlace(createSavedPlace(draft({ name: 'Ikan Bakar Sederhana' })));
    expect(glyphFor(place)).toBe('fish');
    expect(fieldStyle(place).backgroundImage).toMatch(/^linear-gradient/);
  });

  it('picks the pictogram off the name you typed, the same rule curated places use', () => {
    expect(glyphFor(asPlace(createSavedPlace(draft({ name: 'Nasi Padang Sari' }))))).toBe('padang');
    expect(glyphFor(asPlace(createSavedPlace(draft({ name: 'Toko Roti', category: 'food' }))))).toBe('bread');
    expect(glyphFor(asPlace(createSavedPlace(draft({ name: 'Some Shop', category: 'shop', note: '' }))))).toBe('bag');
  });
});

describe('ordering and grouping', () => {
  const older = createSavedPlace(draft({ name: 'First' }), 1_000);
  const newer = createSavedPlace(draft({ name: 'Second' }), 2_000);

  it('puts the most recently added first', () => {
    expect(byNewest([older, newer]).map((p) => p.name)).toEqual(['Second', 'First']);
  });

  it('does not mutate the list it was given', () => {
    const list = [older, newer];
    byNewest(list);
    expect(list.map((p) => p.name)).toEqual(['First', 'Second']);
  });

  it('groups by day and leaves the undated ones out of every day', () => {
    const onThree = createSavedPlace(draft({ name: 'Three', day: 3 }), 3_000);
    const undated = createSavedPlace(draft({ name: 'Someday', day: null }), 4_000);
    expect(savedOnDay([onThree, undated], 3).map((p) => p.name)).toEqual(['Three']);
    expect(savedOnDay([onThree, undated], 4)).toHaveLength(0);
  });
});

describe('search', () => {
  it('finds a place by its name, its note, or what kind of thing it is', () => {
    const terms = savedSearchTerms(createSavedPlace(draft()));
    expect(terms).toContain('kopi kenangan');
    expect(terms).toContain('iced pandan latte');
    expect(terms).toContain('food');
  });

  it('lower-cases everything, matching how curated places are searched', () => {
    const terms = savedSearchTerms(createSavedPlace(draft({ name: 'RANAH MINANG' })));
    expect(terms.every((t) => t === t.toLowerCase())).toBe(true);
  });
});

describe('what the form will not accept', () => {
  it('needs a name', () => {
    expect(draftProblem({ name: '   ' })).toMatch(/name/i);
  });

  it('accepts an ordinary name', () => {
    expect(draftProblem({ name: 'Mie Tarempa' })).toBeNull();
  });

  it('turns down a name too long to render in a row', () => {
    expect(draftProblem({ name: 'x'.repeat(61) })).toMatch(/60/);
  });
});

describe('the store', () => {
  beforeEach(() => {
    useTrip.setState({ done: [], packed: [], saved: [] });
  });

  it('adds a place and hands back the one it stored', () => {
    const added = useTrip.getState().addSaved(draft());
    expect(useTrip.getState().saved).toHaveLength(1);
    expect(useTrip.getState().saved[0]!.key).toBe(added.key);
  });

  it('edits in place without disturbing the others', () => {
    const a = useTrip.getState().addSaved(draft({ name: 'A' }));
    useTrip.getState().addSaved(draft({ name: 'B' }));
    useTrip.getState().updateSaved(a.id, { name: 'A changed', day: 2 });

    const saved = useTrip.getState().saved;
    expect(saved.find((p) => p.id === a.id)).toMatchObject({ name: 'A changed', day: 2 });
    expect(saved.find((p) => p.name === 'B')).toBeDefined();
    expect(saved).toHaveLength(2);
  });

  it('keeps the key stable across an edit, so an open sheet does not lose its place', () => {
    const a = useTrip.getState().addSaved(draft());
    useTrip.getState().updateSaved(a.id, { name: 'Renamed' });
    expect(useTrip.getState().saved[0]!.key).toBe(a.key);
  });

  it('trims on edit too, not only on create', () => {
    const a = useTrip.getState().addSaved(draft());
    useTrip.getState().updateSaved(a.id, { name: '  Spaced  ' });
    expect(useTrip.getState().saved[0]!.name).toBe('Spaced');
  });

  it('removes a place and the tick that went with it', () => {
    const a = useTrip.getState().addSaved(draft());
    useTrip.getState().toggleDone(a.key);
    expect(useTrip.getState().done).toContain(a.key);

    useTrip.getState().removeSaved(a.id);
    expect(useTrip.getState().saved).toHaveLength(0);
    // Otherwise re-adding the same place comes back already crossed out.
    expect(useTrip.getState().done).not.toContain(a.key);
  });

  it('leaves curated ticks alone when a saved place is removed', () => {
    const a = useTrip.getState().addSaved(draft());
    useTrip.getState().toggleDone('nagoya');
    useTrip.getState().removeSaved(a.id);
    expect(useTrip.getState().done).toContain('nagoya');
  });

  it('does not throw away your places when the trip is reset', () => {
    // Reset clears progress. Places you went to the trouble of adding are data,
    // not progress, and losing them to a "start over" would be unforgivable.
    useTrip.getState().addSaved(draft());
    useTrip.getState().toggleDone('nagoya');
    useTrip.getState().reset();
    expect(useTrip.getState().done).toHaveLength(0);
    expect(useTrip.getState().saved).toHaveLength(1);
  });

  it('ignores an edit for an id that is not there', () => {
    useTrip.getState().addSaved(draft());
    expect(() => useTrip.getState().updateSaved('nope', { name: 'x' })).not.toThrow();
    expect(useTrip.getState().saved[0]!.name).toBe('Kopi Kenangan');
  });
});
