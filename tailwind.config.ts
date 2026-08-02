import type { Config } from 'tailwindcss';

/**
 * Design tokens for Batam Lines.
 *
 * The five line colours are the only saturated colour in the system and they are
 * never decorative: a line colour always encodes which day something belongs to.
 * Everything else is paper, ink and hairline rules.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Makan. Warm paper, roasted ink, and a sambal accent. Every value
        // here was measured before it was chosen — see lib/contrast.test.ts.
        paper: '#FBF3E6',
        card: '#FFFDF8',
        ink: '#2A1A10',
        muted: '#7A6250',
        rule: '#E7D8BE',
        accent: '#C2410C',
        meal: {
          sarapan: '#E39B3C',
          tengahari: '#C2410C',
          petang: '#7E9A4E',
          malam: '#6B4A8C',
        },
        line: {
          1: '#D93F3F',
          2: '#E08A1E',
          3: '#2E9E6B',
          4: '#2C74BC',
          5: '#7D4FB0',
        },
      },
      fontFamily: {
        // A grotesque stack. Inter is loaded via next/font; the rest are fallbacks
        // for anyone who already has the real thing installed.
        sans: [
          'var(--font-inter)',
          'Helvetica Now Text',
          'Inter',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        // Warung signboard: condensed, set large and uppercase. Self-hosted,
        // so it looks the same on every phone rather than only on Apple ones.
        display: [
          'var(--font-signboard)',
          'Avenir Next Condensed',
          'Arial Narrow',
          'var(--font-inter)',
          'sans-serif',
        ],
      },
      fontSize: {
        // Transit signage: numbers set large, tight and bold. Tracking opens up
        // as the type gets smaller and closes as it gets larger — the thing that
        // separates typography that has been set from typography that has been
        // typed.
        eyebrow: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.14em' }],
        caption: ['0.8125rem', { lineHeight: '1.25rem', letterSpacing: '0.005em' }],
        body: ['0.9375rem', { lineHeight: '1.45rem', letterSpacing: '-0.005em' }],
        lede: ['1.0625rem', { lineHeight: '1.5rem', letterSpacing: '-0.012em' }],
        title: ['1.375rem', { lineHeight: '1.6rem', letterSpacing: '-0.022em' }],
        display: ['3rem', { lineHeight: '0.92', letterSpacing: '0.004em' }],
        'display-lg': ['4.4rem', { lineHeight: '0.88', letterSpacing: '0.004em' }],
      },
      borderRadius: {
        // Makan is softer than the transit system it replaced — food wants
        // warmth, not signage precision. Pills stay `rounded-full`.
        none: '0',
        sm: '6px',
        DEFAULT: '10px',
        md: '12px',
        lg: '14px',
        sheet: '20px',
      },
      borderWidth: {
        // A true hairline on a retina screen. `1px` is two device pixels on a
        // phone and reads as a drawn line; this reads as an edge.
        hairline: '0.5px',
      },
      spacing: {
        gutter: '1.25rem',
        tabbar: '4.25rem',
        'safe-b': 'env(safe-area-inset-bottom)',
      },
      maxWidth: {
        app: '32rem',
      },
      transitionTimingFunction: {
        transit: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
