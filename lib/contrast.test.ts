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
    warn: t.warn,
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

  it('has a modal shadow per theme, since a tinted one vanishes on a dark ground', () => {
    // Light casts in the ink's own hue; dark casts in black, because a tinted
    // shadow on a green-black ground is invisible.
    expect(CSS).toMatch(/--shadow-modal:.*rgba\(22, 32, 27/);
    expect(CSS).toMatch(/--shadow-modal:.*rgba\(0, 0, 0/);
  });

  it('keeps the light ground and the dark ground in the same hue family', () => {
    // Bone and jade is one palette in two weights, not two palettes.
    const hue = (hex: string): number => {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16));
      return g! - Math.min(r!, b!);
    };
    expect(hue(LIGHT.paper), 'light ground has no green in it').toBeGreaterThan(0);
    expect(hue(DARK.paper), 'dark ground has no green in it').toBeGreaterThan(0);
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

  it('reads the warning colour as text, which is the only way it is used', () => {
    for (const [where, bg] of grounds) {
      expect(contrastRatio(t.warn, bg), `warn on ${where}`).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });

  it('keeps the warning colour a different hue from the accent', () => {
    // Two semantics, so two colours. Deliberately not a contrast ratio: warn
    // and accent are matched in *lightness* so neither shouts louder than the
    // other, which puts them at 1.0:1 — and they are still obviously a salmon
    // and a jade. Luminance is the wrong question here; hue is the right one.
    const hue = (hex: string): number => {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255);
      const max = Math.max(r!, g!, b!);
      const min = Math.min(r!, g!, b!);
      if (max === min) return 0;
      const d = max - min;
      const h =
        max === r! ? ((g! - b!) / d) % 6 : max === g! ? (b! - r!) / d + 2 : (r! - g!) / d + 4;
      return (h * 60 + 360) % 360;
    };
    const apart = Math.abs(hue(t.warn) - hue(t.accent));
    expect(Math.min(apart, 360 - apart), 'warn and accent are the same hue').toBeGreaterThan(60);
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

  it('gives the dark ground a colour rather than a neutral charcoal', () => {
    // Light is cream and sambal; dark is bone and jade. What both must avoid is
    // the default — a grey with no hue in it, which is what a dark theme looks
    // like when nobody chose one.
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(DARK.paper.slice(1 + i, 3 + i), 16));
    const spread = Math.max(r!, g!, b!) - Math.min(r!, g!, b!);
    expect(spread, 'dark ground is neutral grey').toBeGreaterThanOrEqual(4);
    // Green leads, which is what makes it jade rather than charcoal.
    expect(g!).toBeGreaterThan(r!);
  });

  it('keeps the light ground warm, which is what Makan is', () => {
    const [r, , b] = [0, 2, 4].map((i) => parseInt(LIGHT.paper.slice(1 + i, 3 + i), 16));
    expect(r!).toBeGreaterThan(b!);
  });
});

describe('day colours', () => {
  it('reads the day name in white on a selected filter chip', () => {
    // The chip prints the day's name at 13px, so this is the normal-text bar,
    // not the large one. It fills with `textColour` precisely so that one text
    // colour works on all five: white on the bright `colour` would be 2.68:1
    // on Crosstown and 3.38:1 on Batam Centre.
    for (const day of DAYS) {
      expect(
        contrastRatio('#FFFFFF', day.textColour),
        `day ${day.id} ${day.name}`,
      ).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });

  it('keeps a selected chip distinct from the card behind it', () => {
    // The fill is what separates a chip that is on from one that is off, so it
    // has to stand off both grounds. Non-text, so the bar is low, but a fill
    // that vanished into the paper would make the filter state invisible.
    for (const day of DAYS) {
      for (const [label, theme] of [
        ['light', LIGHT],
        ['dark', DARK],
      ] as const) {
        expect(
          contrastRatio(day.textColour, theme.card),
          `day ${day.id} on ${label} card`,
        ).toBeGreaterThan(1.6);
      }
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
