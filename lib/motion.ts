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

/** Tab changes: a short horizontal slide, under 250 ms. */
export const TAB_TRANSITION: Transition = {
  duration: 0.22,
  ease: [0.2, 0.8, 0.2, 1],
};

/** Stations stagger in from the top, ~40 ms apart. */
export const STATION_STAGGER = 0.04;

export const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: STATION_STAGGER } },
};

export const stationVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  show: { opacity: 1, y: 0, transition: SPRING },
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
