import type { Place } from '@/data/trip';

/**
 * A drawing for every place.
 *
 * The colour field (lib/palette.ts) says what *kind* of thing a place is at a
 * glance, but a grid of coloured squares still needs reading. A pictogram does
 * not: a fish over a seafood place, a bridge over Barelang.
 *
 * This is deliberately not a photograph. There is no free-licence photo of
 * Ranah Minang, and a stock plate of rendang under a specific restaurant's
 * name would be a claim about that restaurant. A pictogram claims only what
 * the trip data already says — "this one is seafood", "this one is a mosque" —
 * which is exactly as much as is actually known.
 */

export type GlyphKey =
  // Food, where the note or the name says what the food is.
  | 'padang'
  | 'fish'
  | 'grill'
  | 'noodles'
  | 'cake'
  | 'donut'
  | 'bread'
  | 'matcha'
  | 'plate'
  // Everything else, by category.
  | 'bed'
  | 'boat'
  | 'beach'
  | 'dino'
  | 'lotus'
  | 'bag'
  | 'cart'
  | 'cosmetics'
  | 'toys'
  | 'bridge'
  | 'mosque'
  | 'sign';

/**
 * First match wins, so the order is the ruling.
 *
 * Ikan Bakar Cianjur matches both `ikan` and `bakar`; it is a fish restaurant
 * that grills, so fish comes first. Maru Bake House matches both `bake` and
 * `donut`, and the note is the more specific of the two, so donut comes first.
 */
const BY_WORD: readonly (readonly [RegExp, GlyphKey])[] = [
  [/nasi padang|padang/i, 'padang'],
  [/seafood|nelayan|ikan/i, 'fish'],
  [/bakar|sambal|lamongan/i, 'grill'],
  [/mie|udon|tarempa|luti/i, 'noodles'],
  [/donut/i, 'donut'],
  [/cake|layer|brownie|kue/i, 'cake'],
  [/matcha|patisserie/i, 'matcha'],
  [/baker|bake|roti/i, 'bread'],
];

/** Shops and landmarks are too varied for one icon each to be useful. */
const BY_WORD_PLACE: readonly (readonly [RegExp, GlyphKey])[] = [
  [/supermarket/i, 'cart'],
  [/cosmetic|sociolla/i, 'cosmetics'],
  [/baby|kids|play area|toy/i, 'toys'],
  [/bridge/i, 'bridge'],
  [/masjid|mosque|surau/i, 'mosque'],
  [/sign|welcome/i, 'sign'],
];

const BY_CATEGORY: Record<Place['category'], GlyphKey> = {
  food: 'plate',
  hotel: 'bed',
  ferry: 'boat',
  beach: 'beach',
  dino: 'dino',
  spa: 'lotus',
  shop: 'bag',
  land: 'sign',
};

export function glyphFor(place: Place): GlyphKey {
  // A mall's note is a list of its tenants, so reading it describes somebody
  // else's business: Grand Batam Mall came out as a bottle of cosmetics
  // because Sociolla is one of the shops inside it.
  const haystack =
    place.tenants && place.tenants.length > 0
      ? place.name
      : `${place.name} ${place.note}`;

  // A dish only means something on somewhere that serves food — "Kue Jongkong"
  // is a stall inside DC Mall, and DC Mall is not a cake shop.
  if (place.category === 'food') {
    for (const [pattern, key] of BY_WORD) {
      if (pattern.test(haystack)) return key;
    }
  } else {
    for (const [pattern, key] of BY_WORD_PLACE) {
      if (pattern.test(haystack)) return key;
    }
  }

  return BY_CATEGORY[place.category];
}
