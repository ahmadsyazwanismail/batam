import { describe, expect, it } from 'vitest';
import { AA_LARGE, AA_NORMAL, contrastRatio } from './contrast';
import { CARD_BG, INK, LINES, PAPER } from '@/data/trip';

/** Kept in step with globals.css and tailwind.config.ts. */
const MUTED = '#666B73';
const RULE = '#DEDCD3';

describe('contrast ratio', () => {
  it('is 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('is 1:1 for a colour against itself', () => {
    expect(contrastRatio(PAPER, PAPER)).toBeCloseTo(1, 10);
  });

  it('does not care about the order of the arguments', () => {
    expect(contrastRatio(INK, PAPER)).toBeCloseTo(contrastRatio(PAPER, INK), 10);
  });
});

describe('body text', () => {
  it('clears AA on both backgrounds', () => {
    for (const bg of [PAPER, CARD_BG]) {
      expect(contrastRatio(INK, bg)).toBeGreaterThanOrEqual(AA_NORMAL);
      expect(contrastRatio(MUTED, bg)).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });

  it('keeps muted readable on paper, which is the tight one', () => {
    // The specified #6B7078 lands at 4.49 here — a hundredth short — so the
    // token is one step darker. Everything else in the palette is untouched.
    expect(contrastRatio(MUTED, PAPER)).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(contrastRatio('#6B7078', PAPER)).toBeLessThan(AA_NORMAL);
  });
});

describe('line colours', () => {
  it('reads the numeral inside every bullet', () => {
    // Bullets are 20px bold and up, so the large-text bar applies.
    for (const line of LINES) {
      expect(
        contrastRatio(line.onColour, line.colour),
        `line ${line.id}`,
      ).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it('reads every line colour set as text, on paper and on card', () => {
    for (const line of LINES) {
      for (const bg of [PAPER, CARD_BG]) {
        expect(
          contrastRatio(line.textColour, bg),
          `line ${line.id} on ${bg}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL);
      }
    }
  });

  it('shows why the text variant is needed at all', () => {
    // Crosstown orange as text on paper is 2.4:1 — it fails even the large-text
    // bar, which is the whole reason `textColour` exists.
    const crosstown = LINES[1]!;
    expect(contrastRatio(crosstown.colour, PAPER)).toBeLessThan(AA_LARGE);
    expect(contrastRatio(crosstown.textColour, PAPER)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('leaves the specified colours untouched', () => {
    expect(LINES.map((l) => l.colour)).toEqual([
      '#D93F3F',
      '#E08A1E',
      '#2E9E6B',
      '#2C74BC',
      '#7D4FB0',
    ]);
  });

  it('keeps each text variant recognisably its own line', () => {
    // A darkened sibling, not a different colour: no two lines may collide.
    expect(new Set(LINES.map((l) => l.textColour)).size).toBe(LINES.length);
  });
});

describe('hairlines', () => {
  it('is deliberately low contrast', () => {
    // Rules separate, they do not carry meaning or state, so 1.4.11 does not
    // apply. Recorded so the number is a decision rather than an oversight.
    expect(contrastRatio(RULE, PAPER)).toBeLessThan(AA_LARGE);
  });
});
