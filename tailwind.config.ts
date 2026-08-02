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
        paper: '#F4F3EE',
        card: '#FBFAF6',
        ink: '#16181C',
        // One step darker than the specified #6B7078, which misses 4.5:1 on
        // paper by a hundredth. Held to the bar by lib/contrast.test.ts.
        muted: '#666B73',
        rule: '#DEDCD3',
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
          'Helvetica Now Display',
          'Söhne',
          'Inter',
          'Helvetica Neue',
          'Arial',
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
        display: ['2.625rem', { lineHeight: '0.98', letterSpacing: '-0.04em' }],
        'display-lg': ['4rem', { lineHeight: '0.9', letterSpacing: '-0.045em' }],
      },
      borderRadius: {
        // Mostly square. Pills are the deliberate exception, and they are `rounded-full`.
        none: '0',
        sm: '2px',
        DEFAULT: '3px',
        md: '4px',
        lg: '6px',
        sheet: '14px',
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
