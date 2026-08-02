'use client';

import { useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { PAGE_ENTER, PAGE_EXIT, usePrefersReducedMotion } from '@/lib/motion';
import { tabIndex } from '@/lib/nav';

/** "/days/4" is two deep, "/days" is one, "/" is nought. */
function depth(pathname: string): number {
  return pathname.split('/').filter(Boolean).length;
}

/**
 * Moving between screens.
 *
 * Two journeys, so two gestures. Along the tab bar it slides sideways in the
 * direction you moved, because the five screens are a row. Opening a day from
 * the list comes up from below, because that is going into something rather
 * than across it.
 *
 * The old version ran both halves at 220 ms under `mode="wait"`, so every tap
 * cost 440 ms — a screen leaving in full before the next began to arrive.
 * Leaving is now a fast fade and nothing else; arriving is the half worth
 * watching.
 */
export function PageTransition({ children }: { children: ReactNode }): JSX.Element {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();
  const previous = useRef({ tab: tabIndex(pathname), depth: depth(pathname) });

  const tab = tabIndex(pathname);
  const here = depth(pathname);
  const from = previous.current;
  previous.current = { tab, depth: here };

  const sideways = tab !== from.tab;
  const direction = sideways ? (tab > from.tab ? 1 : -1) : here >= from.depth ? 1 : -1;

  if (reduced) return <>{children}</>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={
          sideways
            ? { opacity: 0, x: 20 * direction }
            : { opacity: 0, y: 12 * direction }
        }
        animate={{ opacity: 1, x: 0, y: 0 }}
        // Opacity only on the way out. Sliding the old screen away as well is
        // what made a tab change feel like it took half a second.
        exit={{ opacity: 0, transition: PAGE_EXIT }}
        transition={PAGE_ENTER}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
