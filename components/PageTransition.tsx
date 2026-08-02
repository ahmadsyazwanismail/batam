'use client';

import { useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { PAGE_ENTER, usePrefersReducedMotion } from '@/lib/motion';
import { tabIndex } from '@/lib/nav';

/** "/days/4" is two deep, "/days" is one, "/" is nought. */
function depth(pathname: string): number {
  return pathname.split('/').filter(Boolean).length;
}

/**
 * Moving between screens.
 *
 * Only the arrival is animated, and that is deliberate rather than lazy.
 *
 * This used to run an exit through `AnimatePresence mode="wait"`, which looked
 * right and was not: `usePathname` updates the moment you tap, but the
 * `children` this template is handed have *already* been swapped by the router.
 * So the element that was supposedly playing the old page out was in fact
 * holding the new page's content, and the sequence on screen was — new content
 * appears, fades to fully invisible, fades back in. Traced at 40 ms intervals
 * it went 0.81, 0.28, 0.00, 0.74, 1.00. That flash is what a page change felt
 * like, and no amount of tuning the durations was going to fix it, because the
 * bug was the structure.
 *
 * Keying a plain motion.div on the pathname re-mounts it on every navigation,
 * so the new screen simply starts slightly offset and transparent and settles.
 * Opacity only ever goes up.
 *
 * The direction still says something: sideways along the tab bar in the way you
 * moved, upward when you open a day out of the list, downward coming back.
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
    <motion.div
      key={pathname}
      initial={
        sideways ? { opacity: 0, x: 18 * direction } : { opacity: 0, y: 10 * direction }
      }
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={PAGE_ENTER}
    >
      {children}
    </motion.div>
  );
}
