import { describe, expect, it } from 'vitest';
import { fieldFor, fieldStyle, hashName } from './palette';
import { contrastRatio, AA_LARGE } from './contrast';
import { MAP_PLACES, PLACES } from '@/data/trip';

describe('hashName', () => {
  it('is stable — the same name always gives the same number', () => {
    expect(hashName('Ranah Minang')).toBe(hashName('Ranah Minang'));
  });

  it('separates names that differ by one character', () => {
    expect(hashName('Garuda')).not.toBe(hashName('Garudb'));
  });

  it('handles an empty string without exploding', () => {
    expect(Number.isFinite(hashName(''))).toBe(true);
  });
});

describe('fieldFor', () => {
  it('gives every place a field', () => {
    for (const place of PLACES) {
      const f = fieldFor(place);
      expect(f.from, place.name).toMatch(/^#[0-9A-F]{6}$/i);
      expect(f.to, place.name).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('is the same field every time — it is the place’s identity, not a mood', () => {
    for (const place of PLACES) {
      expect(fieldFor(place)).toEqual(fieldFor(place));
    }
  });

  it('carries white text at both ends of every gradient', () => {
    // The name sits on top of the field, so both stops have to hold it. These
    // are large, bold names, so the large-text bar applies.
    for (const place of PLACES) {
      const f = fieldFor(place);
      expect(contrastRatio(f.on, f.from), `${place.name} light end`).toBeGreaterThanOrEqual(
        AA_LARGE,
      );
      expect(contrastRatio(f.on, f.to), `${place.name} dark end`).toBeGreaterThanOrEqual(
        AA_LARGE,
      );
    }
  });

  it('always runs light to dark, so the name at the bottom is legible', () => {
    for (const place of PLACES) {
      const f = fieldFor(place);
      expect(
        contrastRatio('#FFFFFF', f.to),
        `${place.name}`,
      ).toBeGreaterThanOrEqual(contrastRatio('#FFFFFF', f.from));
    }
  });

  it('keeps the food palette for food and something quieter for the rest', () => {
    const beach = fieldFor({ name: 'Pink Beach · Bluefire', category: 'beach' });
    const food = fieldFor({ name: 'Pink Beach · Bluefire', category: 'food' });
    expect(beach).not.toEqual(food);
  });

  it('spreads the food places across the palette rather than clumping', () => {
    const food = MAP_PLACES.filter((p) => p.category === 'food');
    const distinct = new Set(food.map((p) => fieldFor(p).from));
    // Ten pairs, sixteen or so food places — most should differ.
    expect(distinct.size).toBeGreaterThanOrEqual(6);
  });
});

describe('fieldStyle', () => {
  it('produces something a style prop can use directly', () => {
    const style = fieldStyle({ name: 'Ranah Minang', category: 'food' });
    expect(style.backgroundImage).toMatch(/^linear-gradient\(140deg, #[0-9A-F]{6}, #[0-9A-F]{6}\)$/i);
    expect(style.color).toBe('#FFFFFF');
  });
});
