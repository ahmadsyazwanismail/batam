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
 * Bone and jade, in both themes. It replaced Makan's cream and sambal, which
 * was warm and appetising and also the single most common look an interface
 * lands on by default. Bone is an off-white with a green cast rather than a
 * cream one, so the two themes are one family rather than two apps.
 *
 * Dark is not that palette dimmed: the ground is a green-black, chosen over
 * the neutral charcoal every dark theme defaults to, and jade has to come a
 * long way up to be legible on it.
 *
 * The four meal colours stay warm in both. They are the app's semantics —
 * amber breakfast, sambal lunch, olive tea, purple dinner — not chrome, and
 * turning them green because the accent went green would lose the meaning.
 * Each was re-checked against the new grounds rather than assumed.
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
  // Bone: an off-white with a green cast rather than a cream one, so it is the
  // same family as the dark ground rather than a different app in daylight.
  paper: '#F6F4EF',
  card: '#FDFDFA',
  ink: '#16201B',
  muted: '#5F6B63',
  rule: '#DFE0D8',
  // Jade, deep enough to be read as text as well as used as a fill.
  accent: '#1F5D4C',
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
  // Bone and jade. A green-black ground rather than a neutral charcoal —
  // a charcoal is the default and reads as one; this has a colour in it.
  paper: '#0F1613',
  card: '#182421',
  ink: '#EDEFE8',
  muted: '#9DACA4',
  rule: '#2B3A35',
  // Jade has to come up a long way to be readable on this ground.
  accent: '#5FC9A6',
  // …which makes it a light fill, so its label goes dark.
  onAccent: '#0D1512',
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
