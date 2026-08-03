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
        // Makan. Warm paper, roasted ink, and a sambal accent.
        //
        // These were literal hex until dark mode, which meant `bg-paper` stayed
        // cream whatever the theme said. They now point at the custom
        // properties in globals.css, which are the single place either theme is
        // written down. The `<alpha-value>` form keeps `bg-card/95` working.
        paper: 'rgb(var(--paper-rgb) / <alpha-value>)',
        card: 'rgb(var(--card-rgb) / <alpha-value>)',
        ink: 'rgb(var(--ink-rgb) / <alpha-value>)',
        muted: 'rgb(var(--muted-rgb) / <alpha-value>)',
        rule: 'rgb(var(--rule-rgb) / <alpha-value>)',
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        'on-accent': 'rgb(var(--on-accent-rgb) / <alpha-value>)',
        warn: 'rgb(var(--warn-rgb) / <alpha-value>)',
        meal: {
          sarapan: 'rgb(var(--meal-sarapan-rgb) / <alpha-value>)',
          tengahari: 'rgb(var(--meal-tengahari-rgb) / <alpha-value>)',
          petang: 'rgb(var(--meal-petang-rgb) / <alpha-value>)',
          malam: 'rgb(var(--meal-malam-rgb) / <alpha-value>)',
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
        // warmth, not signage precision.
        //
        // One radius per job, so corners never look accidental:
        //   sm    thumbnails and the small tiles inside a card
        //   md    every card, panel, list box and input — the common case
        //   sheet the bottom sheet and the day-complete card
        //   full  chips and pills
        // `DEFAULT` is buttons, via `.btn`. Nothing should be square except
        // full-bleed chrome — the tab bar and the sheet's own grab strip.
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
