'use client';

import { useEffect, useState } from 'react';
import type { Transition, Variants } from 'framer-motion';

/**
 * Motion vocabulary.
 *
 * All of it goes through here so that `prefers-reduced-motion` has exactly one
 * switch to throw, and so tab slides and sheet physics stay consistent.
 */

export const SPRING: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 38,
  mass: 0.9,
};

/** Sheets need a softer landing than chrome does. */
export const SHEET_SPRING: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 34,
  mass: 0.8,
};

/**
 * Arriving on a screen. Decelerating, so it settles rather than stopping.
 */
export const PAGE_ENTER: Transition = {
  duration: 0.24,
  ease: [0.16, 1, 0.3, 1],
};

/**
 * Leaving one. Half the arrival and opacity only — with `mode="wait"` this
 * time is spent staring at a screen you have already left, so it is the one
 * duration in the app worth minimising rather than shaping.
 */
export const PAGE_EXIT: Transition = {
  duration: 0.11,
  ease: [0.4, 0, 1, 1],
};

/**
 * List items stagger in from the top.
 *
 * 40 ms felt right on a day's half-dozen stops and awful on the Places list,
 * where thirty-three of them meant the last row arrived a second and a third
 * after the first. It runs behind the page transition, so the two were adding
 * up into what reads as a slow app.
 */
export const STATION_STAGGER = 0.022;

export const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: STATION_STAGGER } },
};

export const stationVariants: Variants = {
  hidden: { opacity: 0, y: -6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
};

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
