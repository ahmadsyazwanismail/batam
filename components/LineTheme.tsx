'use client';

import { useEffect } from 'react';
import { lineById, type LineId } from '@/data/trip';
import { activeLine } from '@/lib/time';

/**
 * Paints `--line` with the colour of the day that is running.
 *
 * Runs after mount rather than on the server: the colour depends on the clock,
 * and a server-rendered guess would flash the wrong day on the first paint.
 * An explicit `line` wins, so a day's own screen can override the calendar.
 */
export function LineTheme({ line }: { line?: LineId }): null {
  useEffect(() => {
    const { colour, textColour } = line ? lineById(line) : activeLine();
    const root = document.documentElement;
    root.style.setProperty('--line', colour);
    root.style.setProperty('--line-text', textColour);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', colour);
  }, [line]);

  return null;
}
