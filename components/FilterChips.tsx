'use client';

import { DAYS, type Category, type DayId } from '@/data/trip';
import { CATEGORY_LABEL } from './CategoryIcon';

/**
 * Fully rounded pills — the other exception to the square shapes, alongside the
 * line bullets. The row is sticky, so it stays under your thumb while a long
 * list scrolls past.
 *
 * A selected chip fills with the day's `textColour`, not its `colour`, and
 * always sets white on it. On the bright fills two of the five days are too
 * light to carry white (Crosstown 2.68:1, Batam Centre 3.38:1), so they used
 * ink while the other three used white — a chip row that changed its text
 * colour halfway along. The darkened siblings carry white on all five
 * (5.20–5.81:1), so the row reads as one thing. The bright `colour` stays on
 * the dot of an *unselected* chip, which is where the colour is a shape.
 */
const ON_SELECTED = '#FFFFFF';
export function FilterChips({
  lines,
  categories,
  onToggleLine,
  onToggleCategory,
  categoriesPresent,
}: {
  lines: ReadonlySet<DayId>;
  categories: ReadonlySet<Category>;
  onToggleLine: (line: DayId) => void;
  onToggleCategory: (category: Category) => void;
  categoriesPresent: readonly Category[];
}): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="-mx-gutter flex gap-1.5 overflow-x-auto px-gutter pb-0.5"
        role="group"
        aria-label="Filter by line"
      >
        {DAYS.map((line) => {
          const on = lines.has(line.id);
          return (
            <button
              key={line.id}
              type="button"
              onClick={() => onToggleLine(line.id)}
              aria-pressed={on}
              className="tap flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors"
              style={
                on
                  ? {
                      backgroundColor: line.textColour,
                      color: ON_SELECTED,
                      borderColor: line.textColour,
                    }
                  : { borderColor: 'var(--rule)', color: 'var(--muted)' }
              }
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: on ? ON_SELECTED : line.colour }}
              />
              {line.name}
            </button>
          );
        })}
      </div>

      <div
        className="-mx-gutter flex gap-1.5 overflow-x-auto px-gutter pb-0.5"
        role="group"
        aria-label="Filter by category"
      >
        {categoriesPresent.map((category) => {
          const on = categories.has(category);
          return (
            <button
              key={category}
              type="button"
              onClick={() => onToggleCategory(category)}
              aria-pressed={on}
              className="tap shrink-0 rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors"
              style={
                on
                  ? { backgroundColor: 'var(--ink)', color: 'var(--card)', borderColor: 'var(--ink)' }
                  : { borderColor: 'var(--rule)', color: 'var(--muted)' }
              }
            >
              {CATEGORY_LABEL[category]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
