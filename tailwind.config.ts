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
        // Transit signage: numbers set large, tight and bold.
        eyebrow: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.12em' }],
        caption: ['0.75rem', { lineHeight: '1.1rem', letterSpacing: '0.04em' }],
        display: ['2.75rem', { lineHeight: '1', letterSpacing: '-0.035em' }],
        'display-lg': ['3.75rem', { lineHeight: '0.94', letterSpacing: '-0.04em' }],
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
        hairline: '1px',
      },
      spacing: {
        gutter: '1rem',
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
