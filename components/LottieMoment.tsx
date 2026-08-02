'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  celebrateAnimation,
  emptyAnimation,
  splashAnimation,
} from '@/data/lottie';
import { MEALS } from '@/lib/meals';
import { usePrefersReducedMotion } from '@/lib/motion';

// lottie-web is ~250 kB and exists for three decorative moments, so it is
// fetched only when one of them actually happens.
const LottiePlayer = dynamic(() => import('./LottiePlayer'), {
  ssr: false,
  loading: () => null,
});

export type Moment = 'splash' | 'empty' | 'celebrate';

const BUILDERS: Record<
  Moment,
  (colour: string, palette: readonly string[]) => Record<string, unknown>
> = {
  splash: splashAnimation,
  empty: emptyAnimation,
  celebrate: celebrateAnimation,
};

/** The four courses, in the order a day serves them. */
const MEAL_COLOURS = MEALS.map((m) => m.colour);

/**
 * Decoration only, and only in the three places the brief allows.
 *
 * Tinted with whatever line is running, read off the CSS custom property so it
 * cannot drift from the rest of the screen. Reduced motion gets a still frame
 * rather than nothing — the shape still says which line you are on.
 */
export function LottieMoment({
  name,
  loop = true,
  onComplete,
}: {
  name: Moment;
  loop?: boolean;
  onComplete?: () => void;
}): JSX.Element | null {
  const reduced = usePrefersReducedMotion();
  const [colour, setColour] = useState<string | null>(null);

  useEffect(() => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent')
      .trim();
    setColour(value || '#C2410C');
  }, []);

  if (!colour) return null;

  return (
    <LottiePlayer
      animationData={BUILDERS[name](colour, MEAL_COLOURS)}
      loop={reduced ? false : loop}
      autoplay={!reduced}
      onComplete={onComplete}
    />
  );
}
