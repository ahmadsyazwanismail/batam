'use client';

import { PACKING } from '@/data/trip';
import { useHydrated, useTrip } from '@/lib/store';

/**
 * Ticks persist to localStorage. No sync, no account — it is one family and one
 * phone each.
 */
export function PackingList(): JSX.Element {
  const packed = useTrip((s) => s.packed);
  const togglePacked = useTrip((s) => s.togglePacked);
  const hydrated = useHydrated();

  const count = hydrated ? packed.length : 0;

  return (
    <>
      <ul>
        {PACKING.map((item) => {
          const isPacked = hydrated && packed.includes(item.key);
          return (
            <li key={item.key} className="rule-b">
              <label className="tap flex cursor-pointer items-center gap-3 px-gutter py-3">
                <input
                  type="checkbox"
                  checked={isPacked}
                  onChange={() => togglePacked(item.key)}
                  className="h-5 w-5 shrink-0 accent-[var(--line)]"
                />
                <span
                  className={
                    isPacked ? 'text-muted line-through' : 'tracking-[-0.01em]'
                  }
                >
                  {item.label}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="numeric px-gutter pt-3 text-caption text-muted">
        {count} of {PACKING.length} packed
      </p>
    </>
  );
}
