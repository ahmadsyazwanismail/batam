import { describe, expect, it } from 'vitest';
import { glyphFor } from './glyph';
import { MAP_PLACES, PLACES, requirePlace } from '@/data/trip';

describe('glyphFor', () => {
  it('gives every place a drawing', () => {
    for (const place of PLACES) {
      expect(glyphFor(place), place.name).toBeTruthy();
    }
  });

  it('reads the dish off the name or the note', () => {
    expect(glyphFor(requirePlace('garuda'))).toBe('padang');
    expect(glyphFor(requirePlace('ranahminang'))).toBe('padang');
    expect(glyphFor(requirePlace('loveseafood'))).toBe('fish');
    expect(glyphFor(requirePlace('gerai'))).toBe('fish');
    expect(glyphFor(requirePlace('sambal'))).toBe('grill');
    expect(glyphFor(requirePlace('mietarempa'))).toBe('noodles');
    expect(glyphFor(requirePlace('marugame'))).toBe('noodles');
    expect(glyphFor(requirePlace('alya'))).toBe('cake');
    expect(glyphFor(requirePlace('mula'))).toBe('matcha');
    expect(glyphFor(requirePlace('mornbakery'))).toBe('bread');
  });

  it('lets the more specific word win where two match', () => {
    // Ikan Bakar Cianjur is `ikan` and `bakar`; it is a fish restaurant.
    expect(glyphFor(requirePlace('ikanbakar'))).toBe('fish');
    // Maru Bake House is `bake`, but the note says what it actually sells.
    expect(glyphFor(requirePlace('maru'))).toBe('donut');
  });

  it('falls back to a plate rather than guessing the menu', () => {
    // Nothing in the data says what Dapur Nina serves, so nothing here claims to.
    expect(glyphFor(requirePlace('dapurnina'))).toBe('plate');
  });

  it('does not describe a mall by the shops inside it', () => {
    // Grand Batam Mall's note lists Sociolla; the mall is not a cosmetics shop.
    const gbm = requirePlace('gbm');
    expect(gbm.note).toMatch(/Sociolla/);
    expect(glyphFor(gbm)).toBe('bag');
    expect(glyphFor(requirePlace('nagoyahill'))).toBe('bag');
  });

  it('does not read dish words on things that are not restaurants', () => {
    // DC Mall's note lists its tenants, one of which is Kue Jongkong. A mall
    // is not a cake shop.
    const dc = requirePlace('dcmall');
    expect(dc.note).toMatch(/Kue/);
    expect(glyphFor(dc)).toBe('bag');
  });

  it('tells the landmarks apart', () => {
    expect(glyphFor(requirePlace('barelang'))).toBe('bridge');
    expect(glyphFor(requirePlace('masjid'))).toBe('mosque');
    expect(glyphFor(requirePlace('welcome'))).toBe('sign');
  });

  it('tells the shops apart', () => {
    expect(glyphFor(requirePlace('top100'))).toBe('cart');
    expect(glyphFor(requirePlace('sociolla'))).toBe('cosmetics');
    expect(glyphFor(requirePlace('moni'))).toBe('cosmetics');
    expect(glyphFor(requirePlace('kakimini'))).toBe('toys');
    expect(glyphFor(requirePlace('nagoyahill'))).toBe('bag');
  });

  it('covers the categories that have no dish at all', () => {
    expect(glyphFor(requirePlace('radisson'))).toBe('bed');
    expect(glyphFor(requirePlace('ferry'))).toBe('boat');
    expect(glyphFor(requirePlace('pinkbeach'))).toBe('beach');
    expect(glyphFor(requirePlace('dinogate'))).toBe('dino');
    expect(glyphFor(requirePlace('eska'))).toBe('lotus');
  });

  it('does not leave a whole category on the generic fallback', () => {
    // If every restaurant came out a plate the pictograms would be pointless.
    const food = MAP_PLACES.filter((p) => p.category === 'food');
    const plates = food.filter((p) => glyphFor(p) === 'plate');
    expect(plates.length).toBeLessThan(food.length / 2);
  });
});
