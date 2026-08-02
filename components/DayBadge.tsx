'use client';

import { motion } from 'framer-motion';
import { dayById, type DayId } from '@/data/trip';
import { SPRING } from '@/lib/motion';

type Size = 'sm' | 'md' | 'lg';

/**
 * Never below 20px bold. Below that the numeral is "normal text" and the
 * lighter lines cannot carry it at 4.5:1; at 20px bold the large-text bar
 * applies and every line clears it. See lib/contrast.test.ts.
 */
const SIZES: Record<Size, string> = {
  sm: 'h-8 min-w-[2rem] text-[1.25rem]',
  md: 'h-10 min-w-[2.5rem] text-[1.5rem]',
  lg: 'h-12 min-w-[3rem] text-[1.75rem]',
};

/**
 * The line bullet. Fully rounded — one of only two rounded shapes in the app —
 * and it carries a shared layout id so it flies from a list row into the day
 * header rather than cutting.
 */
export function DayBadge({
  line,
  size = 'md',
  withName = false,
  shared = false,
}: {
  line: DayId;
  size?: Size;
  withName?: boolean;
  shared?: boolean;
}): JSX.Element {
  const { colour, onColour, name } = dayById(line);

  const bullet = (
    <motion.span
      {...(shared ? { layoutId: `line-badge-${line}` } : {})}
      transition={SPRING}
      // The numeral is a graphic here — the sr-only label beside it says
      // "Line 3, Batam Centre", and announcing both reads as "3 Line 3".
      aria-hidden
      className={`numeric inline-flex items-center justify-center rounded-full px-2 font-bold leading-none ${SIZES[size]}`}
      style={{ backgroundColor: colour, color: onColour }}
    >
      {line}
    </motion.span>
  );

  if (!withName) {
    return (
      <span className="inline-flex items-center">
        {bullet}
        <span className="sr-only">{`Line ${line}, ${name}. `}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      {bullet}
      <span className="font-semibold tracking-[-0.01em]">
        <span className="sr-only">{`Line ${line}, `}</span>
        {name}
      </span>
    </span>
  );
}
