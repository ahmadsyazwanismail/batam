'use client';

import { useEffect } from 'react';
import { dayById, type DayId } from '@/data/trip';
import { activeDay } from '@/lib/time';

/**
 * Paints `--line` with the colour of the day that is running.
 *
 * Runs after mount rather than on the server: the colour depends on the clock,
 * and a server-rendered guess would flash the wrong day on the first paint.
 * An explicit `line` wins, so a day's own screen can override the calendar.
 */
export function DayTheme({ line }: { line?: DayId }): null {
  useEffect(() => {
    const { colour, textColour } = line ? dayById(line) : activeDay();
    const root = document.documentElement;
    root.style.setProperty('--line', colour);
    root.style.setProperty('--line-text', textColour);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', colour);
  }, [line]);

  return null;
}
