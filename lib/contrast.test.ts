import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AA_LARGE, AA_NORMAL, contrastRatio } from './contrast';
import { DARK, LIGHT, THEMES, type ThemeName, type ThemeTokens } from './theme';
import { DAYS } from '@/data/trip';

/**
 * The palette, held to the bar — in both themes.
 *
 * This file used to import INK, PAPER and CARD_BG from the trip data, which
 * were the transit design's values. It had been passing for weeks against a
 * palette the app no longer used. So the tokens now live in lib/theme.ts, and
 * the first test below reads app/globals.css and fails if the stylesheet and
 * the tokens have drifted — the failure mode that made the old test useless.
 */

const CSS = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

/** Pull `--name-rgb: r g b;` out of a given selector block. */
function tokensFromCss(selector: string): Record<string, string> {
  const start = CSS.indexOf(selector);
  expect(start, `${selector} missing from globals.css`).toBeGreaterThan(-1);
  const open = CSS.indexOf('{', start);
  const end = CSS.indexOf('}', open);
  const block = CSS.slice(open, end);

  const found: Record<string, string> = {};
  for (const [, name, r, g, b] of block.matchAll(
    /--([a-z-]+)-rgb:\s*(\d+)\s+(\d+)\s+(\d+);/g,
  )) {
    const hex = [r, g, b]
      .map((v) => Number(v ?? 0).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    if (name) found[name] = `#${hex}`;
  }
  return found;
}

function expected(t: ThemeTokens): Record<string, string> {
  return {
    paper: t.paper,
    card: t.card,
    ink: t.ink,
    muted: t.muted,
    rule: t.rule,
    accent: t.accent,
    'on-accent': t.onAccent,
    'meal-sarapan': t.meal.sarapan,
    'meal-tengahari': t.meal.tengahari,
    'meal-petang': t.meal.petang,
    'meal-malam': t.meal.malam,
    'meal-sarapan-text': t.mealText.sarapan,
    'meal-tengahari-text': t.mealText.tengahari,
    'meal-petang-text': t.mealText.petang,
    'meal-malam-text': t.mealText.malam,
  };
}

describe('the stylesheet and the tokens agree', () => {
  it('matches :root to LIGHT', () => {
    expect(tokensFromCss(':root {')).toEqual(expected(LIGHT));
  });

  it('matches the prefers-color-scheme block to DARK', () => {
    expect(tokensFromCss('@media (prefers-color-scheme: dark)')).toEqual(expected(DARK));
  });

  it('matches both toggle overrides, which must beat the media query', () => {
    expect(tokensFromCss(":root[data-theme='dark']")).toEqual(expected(DARK));
    expect(tokensFromCss(":root[data-theme='light']")).toEqual(expected(LIGHT));
  });
});

describe('places the stylesheet could hard-code a colour and break one theme', () => {
  it('paints selected text with the accent’s own foreground, not white', () => {
    const block = CSS.slice(CSS.indexOf('::selection'), CSS.indexOf('::selection') + 260);
    expect(block).toContain('var(--on-accent)');
    expect(block).not.toMatch(/color:\s*#fff/i);
  });

  it('has a modal shadow per theme, since a warm one vanishes on warm black', () => {
    expect(CSS).toMatch(/--shadow-modal:.*rgba\(42, 26, 16/);
    expect(CSS).toMatch(/--shadow-modal:.*rgba\(0, 0, 0/);
  });
});

describe('contrast ratio', () => {
  it('is 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('is 1:1 for a colour against itself', () => {
    expect(contrastRatio(LIGHT.paper, LIGHT.paper)).toBeCloseTo(1, 10);
  });

  it('does not care about the order of the arguments', () => {
    expect(contrastRatio(LIGHT.ink, LIGHT.paper)).toBeCloseTo(
      contrastRatio(LIGHT.paper, LIGHT.ink),
      10,
    );
  });
});

const NAMES = Object.keys(THEMES) as ThemeName[];

describe.each(NAMES)('%s theme', (name) => {
  const t = THEMES[name];
  const grounds = [
    ['paper', t.paper],
    ['card', t.card],
  ] as const;

  it('reads body text on both grounds', () => {
    for (const [where, bg] of grounds) {
      expect(contrastRatio(t.ink, bg), `ink on ${where}`).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });

  it('reads secondary text on both grounds — the one that is always tight', () => {
    for (const [where, bg] of grounds) {
      expect(contrastRatio(t.muted, bg), `muted on ${where}`).toBeGreaterThanOrEqual(
        AA_NORMAL,
      );
    }
  });

  it('reads the accent as text, which it is on every Google Maps link', () => {
    for (const [where, bg] of grounds) {
      expect(contrastRatio(t.accent, bg), `accent on ${where}`).toBeGreaterThanOrEqual(
        AA_NORMAL,
      );
    }
  });

  it('reads a label on an accent fill — every solid button', () => {
    expect(contrastRatio(t.onAccent, t.accent)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('reads all four meal names, on both grounds', () => {
    for (const key of ['sarapan', 'tengahari', 'petang', 'malam'] as const) {
      for (const [where, bg] of grounds) {
        expect(
          contrastRatio(t.mealText[key], bg),
          `${key} on ${where}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL);
      }
    }
  });

  it('keeps the hairline visible without it becoming a border', () => {
    for (const [where, bg] of grounds) {
      const ratio = contrastRatio(t.rule, bg);
      expect(ratio, `rule on ${where}`).toBeGreaterThan(1.15);
      expect(ratio, `rule on ${where}`).toBeLessThan(4);
    }
  });

  it('never lands a meal shape on top of its own ground', () => {
    // A bar the same colour as the card behind it is an invisible bar.
    for (const key of ['sarapan', 'tengahari', 'petang', 'malam'] as const) {
      expect(contrastRatio(t.meal[key], t.card), key).toBeGreaterThan(1.5);
    }
  });
});

describe('the two themes are actually different', () => {
  it('inverts the ground and the text rather than tinting them', () => {
    expect(contrastRatio(LIGHT.paper, DARK.paper)).toBeGreaterThan(10);
    expect(contrastRatio(LIGHT.ink, DARK.ink)).toBeGreaterThan(10);
  });

  it('keeps the dark ground warm rather than blue', () => {
    // Inverted cream goes blue-grey, which is wrong for an app about food.
    const [r, , b] = [0, 2, 4].map((i) => parseInt(DARK.paper.slice(1 + i, 3 + i), 16));
    expect(r!).toBeGreaterThan(b!);
  });
});

describe('day colours', () => {
  it('reads the day name on a selected filter chip', () => {
    // The chip prints the day's name on its colour at 13px, so this is the
    // normal-text bar, not the large one. Day one used to be 4.44:1.
    for (const day of DAYS) {
      expect(
        contrastRatio(day.onColour, day.colour),
        `day ${day.id} ${day.name}`,
      ).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });

  it('reads a bullet numeral, which is large and bold', () => {
    for (const day of DAYS) {
      expect(contrastRatio(day.onColour, day.colour), `day ${day.id}`).toBeGreaterThanOrEqual(
        AA_LARGE,
      );
    }
  });

  it('shows the unselected chip dot on either card', () => {
    for (const day of DAYS) {
      for (const [name, card] of [['light', LIGHT.card], ['dark', DARK.card]] as const) {
        expect(
          contrastRatio(day.colour, card),
          `day ${day.id} dot on ${name}`,
        ).toBeGreaterThan(1.5);
      }
    }
  });
});
