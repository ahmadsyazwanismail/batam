'use client';

import { motion } from 'framer-motion';
import { formatCountdown, upcoming } from '@/lib/upcoming';
import { formatMinutes } from '@/lib/time';
import type { LatLon } from '@/lib/geo';
import { listVariants, stationVariants, usePrefersReducedMotion } from '@/lib/motion';

/**
 * The next few things with a real time on them.
 *
 * Everything here is scheduled by someone other than us — a ferry, a shutter,
 * the sun. The running order deliberately carries no clock, and this does not
 * sneak one in.
 */
export function UpNext({ now, from }: { now: Date; from: LatLon }): JSX.Element | null {
  const rows = upcoming(now, from, 3);
  const reduced = usePrefersReducedMotion();

  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="upnext-heading">
      <h2 id="upnext-heading" className="eyebrow px-gutter pb-2 pt-7">
        Up next
      </h2>
      <motion.ul
        variants={listVariants}
        initial={reduced ? false : 'hidden'}
        animate="show"
        className="mx-gutter overflow-hidden rounded-md border border-hairline border-rule bg-card"
      >
        {rows.map((row) => (
          <motion.li
            key={`${row.kind}-${row.label}`}
            variants={stationVariants}
            className="flex items-baseline gap-3 border-b-hairline border-rule px-gutter py-3 last:border-b-0"
          >
            <span
              className="numeric w-[3.4rem] shrink-0 text-lede font-bold tabular-nums"
              style={row.urgent ? { color: 'var(--line-text)' } : undefined}
            >
              {formatMinutes(row.at)}
            </span>
            <span className="min-w-0 flex-1 truncate text-body">{row.label}</span>
            <span className="shrink-0 text-caption text-muted">
              {formatCountdown(row.inMinutes)}
            </span>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}
