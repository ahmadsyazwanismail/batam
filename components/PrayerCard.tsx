'use client';

import {
  IS_PRAYER,
  PRAYER_LABEL,
  PRAYER_ORDER,
  nextPrayer,
  prayerTimes,
} from '@/lib/prayer';
import { formatMinutes, wibDate, wibMinutes } from '@/lib/time';
import { formatCountdown } from '@/lib/upcoming';
import type { LatLon } from '@/lib/geo';

/**
 * Prayer times for wherever the phone is, worked out on the phone.
 *
 * Labelled as computed, because it is — and because a family that keeps them
 * deserves to know whether a number came from an authority or from a
 * calculation before they rely on it.
 */
export function PrayerCard({ now, from }: { now: Date; from: LatLon }): JSX.Element {
  const times = prayerTimes(wibDate(now), from);
  const minutes = wibMinutes(now);
  const next = nextPrayer(times, minutes);

  return (
    <section
      aria-labelledby="prayer-heading"
      className="overflow-hidden rounded-md border border-hairline border-rule bg-card"
    >
      <div className="flex items-baseline justify-between gap-3 border-b-hairline border-rule px-4 py-3">
        <h2 id="prayer-heading" className="eyebrow">
          Waktu solat · WIB
        </h2>
        {next && (
          <p className="text-caption text-muted">
            {PRAYER_LABEL[next.name]} {formatCountdown(next.inMinutes)}
          </p>
        )}
      </div>

      <ul className="grid grid-cols-3">
        {PRAYER_ORDER.map((name, i) => {
          const at = times.times[name];
          const isNext = next?.name === name && !next.tomorrow;
          const passed = at !== null && at <= minutes;

          return (
            <li
              key={name}
              className={`border-hairline border-rule px-3 py-3 ${
                i % 3 !== 2 ? 'border-r' : ''
              } ${i < 3 ? 'border-b' : ''}`}
              style={isNext ? { backgroundColor: 'color-mix(in srgb, var(--line) 8%, transparent)' } : undefined}
            >
              {/* Syuruk is not a prayer, but it is not less legible either —
                  fading it broke contrast, so the distinction is carried by
                  the label rather than by the ink. */}
              <p className="eyebrow" style={isNext ? { color: 'var(--line-text)' } : undefined}>
                {PRAYER_LABEL[name]}
                {!IS_PRAYER[name] && <span className="sr-only"> (sunrise, not a prayer)</span>}
              </p>
              <p
                className={`numeric mt-1 text-lede font-bold tabular-nums ${
                  passed && !isNext ? 'text-muted' : ''
                }`}
                style={isNext ? { color: 'var(--line-text)' } : undefined}
              >
                {at === null ? '—' : formatMinutes(at)}
              </p>
            </li>
          );
        })}
      </ul>

      <p className="px-4 py-2.5 text-caption leading-relaxed text-muted">
        Calculated on this phone from the sun’s position — Subuh 20°, Isyak 18°,
        Asar Syafie. No signal needed. Check against the local masjid for the
        exact azan.
      </p>
    </section>
  );
}
