/**
 * Every colour in the app, in one place, for both themes.
 *
 * This exists because the contrast test used to import `INK`, `PAPER` and
 * `CARD_BG` from the trip data — values left over from the transit design —
 * and cheerfully proved that a palette the app had stopped using was legible.
 * A test that checks the wrong numbers is worse than no test, so these are now
 * the numbers, and `contrast.test.ts` reads `app/globals.css` and fails if the
 * stylesheet has drifted from them.
 *
 * Dark is not an inversion. Warm paper inverted goes blue-grey and cold, which
 * is wrong for an app about food; these grounds keep the brown in them. Every
 * foreground below was moved until it cleared the same bar on the dark grounds
 * that its light counterpart clears on paper — several of them had to change a
 * lot, because a colour tuned to sit on cream is nearly always too dark to sit
 * on brown-black.
 */

export interface ThemeTokens {
  /** Page background. */
  readonly paper: string;
  /** Raised surfaces: cards, sheets, the tab bar. */
  readonly card: string;
  /** Body text. */
  readonly ink: string;
  /** Secondary text. Must clear 4.5:1 on *both* grounds. */
  readonly muted: string;
  /** Hairlines. Not text, so no contrast requirement — but it must be visible. */
  readonly rule: string;
  /** The one saturated colour. Used as text and as a button fill. */
  readonly accent: string;
  /** Text on top of an accent fill. */
  readonly onAccent: string;
  /** The four meal colours as *shapes* — bars, dots, fills. */
  readonly meal: Readonly<Record<'sarapan' | 'tengahari' | 'petang' | 'malam', string>>;
  /** The same four as *words*. Different values: text has a higher bar. */
  readonly mealText: Readonly<Record<'sarapan' | 'tengahari' | 'petang' | 'malam', string>>;
}

export const LIGHT: ThemeTokens = {
  paper: '#FBF3E6',
  card: '#FFFDF8',
  ink: '#2A1A10',
  muted: '#7A6250',
  rule: '#E7D8BE',
  accent: '#C2410C',
  onAccent: '#FFFFFF',
  meal: {
    sarapan: '#E39B3C',
    tengahari: '#C2410C',
    petang: '#7E9A4E',
    malam: '#6B4A8C',
  },
  mealText: {
    // Sarapan's amber is 2.0:1 on paper as a word, so the text form is darker.
    sarapan: '#916326',
    tengahari: '#C2410C',
    petang: '#60753B',
    malam: '#6B4A8C',
  },
};

export const DARK: ThemeTokens = {
  // Warm, not blue: the same hue family as the paper, taken right down.
  paper: '#17110C',
  card: '#211913',
  ink: '#F4EADB',
  muted: '#B7A18B',
  rule: '#3A2C21',
  // Sambal has to come up a long way to be readable on this ground.
  accent: '#FF8A5B',
  // …which means it is now a light fill, so its label goes dark.
  onAccent: '#1A120C',
  meal: {
    sarapan: '#E8A64B',
    tengahari: '#FF8A5B',
    petang: '#9FBE6A',
    malam: '#B392D8',
  },
  mealText: {
    sarapan: '#E8A64B',
    tengahari: '#FF8A5B',
    petang: '#A9C776',
    malam: '#BFA1E0',
  },
};

export const THEMES = { light: LIGHT, dark: DARK } as const;
export type ThemeName = keyof typeof THEMES;
