import type { Category, Place } from '@/data/trip';

/**
 * A picture for every place, without a photograph.
 *
 * There is no free-licence photo of Ranah Minang, and a stock bowl of noodles
 * under a specific restaurant's name is a small lie repeated thirty-eight
 * times. So each place gets a colour field derived from its own name: the same
 * name always produces the same field, which makes it that place's identity
 * rather than decoration.
 *
 * The palettes come from the food itself — rendang, sambal, pandan, matcha,
 * kunyit, teh tarik — so the grid of them reads as a menu rather than as a set
 * of random swatches. All of them are dark enough to carry white text.
 */

export interface Field {
  readonly from: string;
  readonly to: string;
  /**
   * Always white. Every stop below was darkened until white clears 3:1 on it —
   * the name sits over the gradient, so *both* ends have to hold it, not just
   * the dark one. `palette.test.ts` proves it and will fail if a pretty but
   * unreadable pair is ever added.
   */
  readonly on: string;
}

const field = (from: string, to: string): Field => ({ from, to, on: '#FFFFFF' });

/** Something you would actually eat. */
const FOOD_FIELDS: readonly Field[] = [
  field('#D9503C', '#8E2412'), // sambal
  field('#AE8758', '#7A5326'), // rendang
  field('#879261', '#6E8A42'), // pandan
  field('#649785', '#2E7A63'), // matcha
  field('#BA8231', '#A85E12'), // kunyit
  field('#BB8057', '#8A5228'), // teh tarik
  field('#C77B5F', '#A8442A'), // udang
  field('#9C7BB8', '#4C3566'), // terung
  field('#7491B0', '#37628F'), // ikan
  field('#D46A8B', '#8E2F4E'), // bunga telang
];

/**
 * Where a note says what the food is, the colour follows it. Nasi padang comes
 * out rendang brown and seafood comes out the blue of a fish market, which
 * reads as deliberate; leaving it to the hash gives you a purple nasi padang
 * and a green prawn, which reads as random.
 */
const BY_DISH: readonly (readonly [RegExp, Field])[] = [
  [/nasi padang|padang/i, field('#AE8758', '#7A5326')], // rendang
  [/seafood|nelayan|ikan/i, field('#7491B0', '#37628F')], // ikan
  [/sambal|bakar/i, field('#D9503C', '#8E2412')], // sambal
  [/matcha|pandan|hijau/i, field('#649785', '#2E7A63')], // matcha
  [/brownie|kue|donut|cake|layer/i, field('#BB8057', '#8A5228')], // teh tarik
  [/patisserie|bake/i, field('#BA8231', '#A85E12')], // kunyit
  [/mie|udon|tarempa|luti/i, field('#C77B5F', '#A8442A')], // udang
  [/sundanese|resto/i, field('#879261', '#6E8A42')], // pandan
];

const BY_CATEGORY: Partial<Record<Category, readonly Field[]>> = {
  shop: [field('#A08B70', '#6E5638'), field('#948D7D', '#635B49')],
  spa: [field('#749580', '#3F6E52'), field('#7E9291', '#4A6E6C')],
  beach: [field('#5C97A7', '#276E80')],
  dino: [field('#78975A', '#3E6B2C')],
  land: [field('#9A8C76', '#5E5140')],
  hotel: [field('#7C8595', '#3A4151')],
  ferry: [field('#6E8FA8', '#2F4F64')],
};

/** FNV-1a. Small, fast, and stable across runs — which is the whole point. */
export function hashName(name: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i += 1) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function fieldFor(place: Pick<Place, 'name' | 'category'> & { note?: string }): Field {
  if (place.category === 'food') {
    const haystack = `${place.name} ${place.note ?? ''}`;
    for (const [pattern, dish] of BY_DISH) {
      if (pattern.test(haystack)) return dish;
    }
  }
  const pool = BY_CATEGORY[place.category] ?? FOOD_FIELDS;
  return pool[hashName(place.name) % pool.length]!;
}

/** Ready to drop into a `style` prop. */
export function fieldStyle(place: Pick<Place, 'name' | 'category'> & { note?: string }): {
  backgroundImage: string;
  color: string;
} {
  const { from, to, on } = fieldFor(place);
  return {
    backgroundImage: `linear-gradient(140deg, ${from}, ${to})`,
    color: on,
  };
}
