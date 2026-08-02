'use client';

import { LINES, type Category, type LineId } from '@/data/trip';
import { CATEGORY_LABEL } from './CategoryIcon';

/**
 * Fully rounded pills — the other exception to the square shapes, alongside the
 * line bullets. The row is sticky, so it stays under your thumb while a long
 * list scrolls past.
 */
export function FilterChips({
  lines,
  categories,
  onToggleLine,
  onToggleCategory,
  categoriesPresent,
}: {
  lines: ReadonlySet<LineId>;
  categories: ReadonlySet<Category>;
  onToggleLine: (line: LineId) => void;
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
        {LINES.map((line) => {
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
                  ? { backgroundColor: line.colour, color: line.onColour, borderColor: line.colour }
                  : { borderColor: 'var(--rule)', color: 'var(--muted)' }
              }
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: on ? line.onColour : line.colour }}
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
