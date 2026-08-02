'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Screen } from '@/components/Screen';
import { LocationBar } from '@/components/LocationBar';
import { FilterChips } from '@/components/FilterChips';
import { Distance } from '@/components/Distance';
import { PlaceField } from '@/components/PlaceField';
import { PlaceSheet } from '@/components/PlaceSheet';
import { EmptyState } from '@/components/EmptyState';
import {
  MAP_PLACES,
  searchTerms,
  type Category,
  type DayId,
  type Place,
} from '@/data/trip';
import { haversineKm } from '@/lib/geo';
import { distanceVerdict } from '@/lib/geo';
import { runningOrder, type Station } from '@/lib/route';
import { useLocation } from '@/lib/useLocation';
import { wibDate } from '@/lib/time';
import { useHydrated, useTrip } from '@/lib/store';

/**
 * Every place, searchable.
 *
 * Sorted by distance, because the question this screen answers is "what is
 * near me" — and the distance is measured from you if that means anything and
 * from the day's hotel if it does not. Either way the bar at the top says which.
 */
export function PlacesScreen(): JSX.Element {
  const [now, setNow] = useState<Date | null>(null);
  const [query, setQuery] = useState('');
  const [lines, setLines] = useState<ReadonlySet<DayId>>(new Set());
  const [categories, setCategories] = useState<ReadonlySet<Category>>(new Set());
  const [openKey, setOpenKey] = useState<string | null>(null);
  const listTop = useRef<HTMLParagraphElement | null>(null);
  const filtersTouched = useRef(false);

  // Promoting the matches to the top only helps if you are looking at the top.
  // Tapping a filter half way down the list would otherwise reorder something
  // above your viewport and leave you where you were.
  useEffect(() => {
    if (!filtersTouched.current) {
      filtersTouched.current = true;
      return;
    }
    listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [lines, categories]);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const location = useLocation(now ?? new Date());
  const done = useTrip((s) => s.done);
  const hydrated = useHydrated();

  const isoDate = now ? wibDate(now) : undefined;
  const origin = location.origin;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return MAP_PLACES.map((place) => {
      const km = haversineKm(origin.point, place);
      return {
        place,
        km,
        verdict: distanceVerdict(km, isoDate),
        matchesQuery: q === '' || searchTerms(place).some((t) => t.includes(q)),
        matchesCategory: categories.size === 0 || categories.has(place.category),
        onSelectedLine: lines.size === 0 || lines.has(place.day),
      };
    })
      .filter((row) => row.matchesQuery && row.matchesCategory)
      // A day filter promotes rather than dims. It used to grey the other
      // rows where they stood, which kept the shape of the trip visible and
      // made you scroll past greyed-out places to reach the ones you asked
      // for. Matches come to the top, nearest first, and the rest keep their
      // own order underneath.
      .sort((a, b) =>
        a.onSelectedLine === b.onSelectedLine
          ? a.km - b.km
          : a.onSelectedLine
            ? -1
            : 1,
      );
  }, [origin.point, isoDate, query, categories, lines]);

  const visible = rows.filter((r) => r.onSelectedLine);
  const categoriesPresent = useMemo(
    () => [...new Set(MAP_PLACES.map((p) => p.category))].sort(),
    [],
  );

  const openStation = useMemo((): { station: Station; line: DayId } | null => {
    if (!openKey) return null;
    const place = MAP_PLACES.find((p) => p.key === openKey);
    if (!place) return null;
    const station = runningOrder(place.day).find((s) => s.place.key === openKey);
    return station ? { station, line: place.day } : null;
  }, [openKey]);

  // Everything below depends on the clock and on where the phone is. This page
  // is prerendered at build time, so rendering any of it before mount would
  // bake in the build machine's idea of "today" and mismatch on hydration.
  if (!now) {
    return (
      <Screen eyebrow={`Everywhere on the list · ${MAP_PLACES.length} places`} title="Places">
        <p className="px-gutter text-muted">Working out where you are…</p>
      </Screen>
    );
  }

  return (
    <Screen eyebrow={`Everywhere on the list · ${MAP_PLACES.length} places`} title="Places">
      <div className="px-gutter pb-3">
        <LocationBar location={location} />
      </div>

      {/* Sticky, so the filters stay reachable however far the list runs. */}
      <div className="sticky top-0 z-30 border-b-hairline border-rule bg-paper/95 px-gutter pb-2.5 pt-2.5 backdrop-blur-sm">
        <label className="sr-only" htmlFor="place-search">
          Search places
        </label>
        <input
          id="place-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search — try “Renuin” or “nasi padang”"
          className="tap mb-2.5 w-full rounded border border-hairline border-rule bg-card px-3 py-2.5 text-[1rem] placeholder:text-muted"
        />
        <FilterChips
          lines={lines}
          categories={categories}
          categoriesPresent={categoriesPresent}
          onToggleLine={(line) =>
            setLines((prev) => {
              const next = new Set(prev);
              if (!next.delete(line)) next.add(line);
              return next;
            })
          }
          onToggleCategory={(category) =>
            setCategories((prev) => {
              const next = new Set(prev);
              if (!next.delete(category)) next.add(category);
              return next;
            })
          }
        />
      </div>

      <p
        ref={listTop}
        className="numeric scroll-mt-3 px-gutter pb-1 pt-3 text-caption text-muted"
      >
        {visible.length} of {MAP_PLACES.length} · {origin.label}
      </p>

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing matches"
          body={
            query
              ? `Nothing answers to “${query.trim()}”. Mall tenants count — try “Chikuro” or “Zhuko”.`
              : 'Nothing is in every category you picked.'
          }
          actionLabel="Clear the filters"
          onAction={() => {
            setQuery('');
            setCategories(new Set());
            setLines(new Set());
          }}
        />
      ) : (
        <ul>
          {rows.map((row, i) => (
            <Fragment key={row.place.key}>
              {/* Where the days you picked stop and everything else begins.
                  Without it the promoted rows just look like a reordering. */}
              {!row.onSelectedLine && rows[i - 1]?.onSelectedLine && (
                <li className="rule-t px-gutter pb-1 pt-4">
                  <p className="eyebrow">Other days</p>
                </li>
              )}
              <PlaceRow
                place={row.place}
                km={row.km}
                verdict={row.verdict.text}
                done={hydrated && done.includes(row.place.key)}
                onOpen={() => setOpenKey(row.place.key)}
              />
            </Fragment>
          ))}
        </ul>
      )}

      <PlaceSheet
        station={openStation?.station ?? null}
        line={openStation?.line ?? 1}
        from={location.origin.point}
        onClose={() => setOpenKey(null)}
      />
    </Screen>
  );
}

/**
 * A plain `li`, not a motion one.
 *
 * Thirty-three motion components cost about 120 ms of main thread on a
 * mid-range phone — measured, repeatably — and bought nothing: the stagger
 * variant each row was given was overridden by an explicit `animate` on the
 * same element, so it never ran. The page transition already provides the
 * movement.
 */
function PlaceRow({
  place,
  km,
  verdict,
  done,
  onOpen,
}: {
  place: Place;
  km: number;
  verdict: string;
  done: boolean;
  onOpen: () => void;
}): JSX.Element {
  return (
    <li className="rule-b">
      <button
        type="button"
        onClick={onOpen}
        className="tap flex w-full items-start gap-3 px-gutter py-3 text-left"
      >
        <PlaceField place={place} glyphSize={19} className="h-11 w-11 shrink-0 rounded-sm" />

        <span className="min-w-0 flex-1">
          <span
            className={`block font-semibold tracking-[-0.015em] ${
              done ? 'text-muted line-through' : ''
            }`}
          >
            {place.name}
          </span>
          <span className="mt-0.5 block text-caption text-muted">{place.note}</span>
        </span>

        <span className="shrink-0 text-right">
          <span className="block font-semibold">
            <Distance km={km} />
          </span>
          <span className="mt-0.5 block text-caption text-muted">{verdict}</span>
        </span>
      </button>
    </li>
  );
}
