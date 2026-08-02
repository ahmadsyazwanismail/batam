'use client';

import { useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { TAB_TRANSITION, usePrefersReducedMotion } from '@/lib/motion';
import { tabIndex } from '@/lib/nav';

/**
 * Tab changes slide horizontally in the direction you moved along the tab bar,
 * so the five screens feel like a row rather than a stack. Under 250 ms.
 */
export function PageTransition({ children }: { children: ReactNode }): JSX.Element {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();
  const previous = useRef(tabIndex(pathname));

  const current = tabIndex(pathname);
  const direction = current >= previous.current ? 1 : -1;
  previous.current = current;

  if (reduced) return <>{children}</>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, x: 18 * direction }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -18 * direction }}
        transition={TAB_TRANSITION}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
