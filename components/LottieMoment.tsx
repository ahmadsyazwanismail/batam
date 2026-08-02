'use client';

import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import {
  celebrateAnimation,
  emptyAnimation,
  splashAnimation,
} from '@/data/lottie';
import { usePrefersReducedMotion } from '@/lib/motion';

export type Moment = 'splash' | 'empty' | 'celebrate';

const BUILDERS: Record<Moment, (colour: string) => Record<string, unknown>> = {
  splash: splashAnimation,
  empty: emptyAnimation,
  celebrate: celebrateAnimation,
};

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
      .getPropertyValue('--line')
      .trim();
    setColour(value || '#D93F3F');
  }, []);

  if (!colour) return null;

  return (
    <Lottie
      animationData={BUILDERS[name](colour)}
      loop={reduced ? false : loop}
      autoplay={!reduced}
      onComplete={onComplete}
      aria-hidden
      role="presentation"
    />
  );
}
