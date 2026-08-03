'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Screen } from '@/components/Screen';
import { LocationBar } from '@/components/LocationBar';
import { FilterChips } from '@/components/FilterChips';
import { Distance } from '@/components/Distance';
import { PlaceField } from '@/components/PlaceField';
import { PlaceSheet } from '@/components/PlaceSheet';
import { AddPlaceSheet } from '@/components/AddPlaceSheet';
import { SavedPlaceSheet } from '@/components/SavedPlaceSheet';
import { draftFrom, EMPTY_DRAFT, type DraftState } from '@/components/addPlaceDraft';
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
import { usePrefersReducedMotion } from '@/lib/motion';
import { asPlace, isSavedKey, savedSearchTerms, type SavedPlace } from '@/lib/savedPlaces';
import { stashDraft } from '@/lib/draftHandoff';

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
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const listTop = useRef<HTMLDivElement | null>(null);
  const filterBar = useRef<HTMLDivElement | null>(null);
  const filtersTouched = useRef(false);
  const reduced = usePrefersReducedMotion();

  // Promoting the matches to the top only helps if you are looking at the top.
  // Tapping a filter half way down the list would otherwise reorder something
  // above your viewport and leave you where you were.
  useEffect(() => {
    if (!filtersTouched.current) {
      filtersTouched.current = true;
      return;
    }
    const anchor = listTop.current;
    if (!anchor) return;
    // Not scrollIntoView: the filter bar is sticky, so by the time the scroll
    // lands it is sitting over the top of the page and swallows the first row.
    // Measure it rather than guessing — it is two chip rows plus a search box,
    // and the second row only exists when the list has categories in it.
    const clearance = (filterBar.current?.offsetHeight ?? 0) + 12;
    const top = anchor.getBoundingClientRect().top + window.scrollY - clearance;
    window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' });
  }, [lines, categories, reduced]);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const location = useLocation(now ?? new Date());
  const done = useTrip((s) => s.done);
  const allSaved = useTrip((s) => s.saved);
  const addSaved = useTrip((s) => s.addSaved);
  const updateSaved = useTrip((s) => s.updateSaved);
  const removeSaved = useTrip((s) => s.removeSaved);
  const hydrated = useHydrated();

  // Nothing from localStorage may be rendered before rehydration, or the
  // prerendered markup and the first client render disagree. Memoised because
  // a fresh `[]` on every render is a new dependency identity, which would
  // rebuild the row list on every render rather than when something changed.
  const savedPlaces = useMemo(() => (hydrated ? allSaved : []), [hydrated, allSaved]);

  const isoDate = now ? wibDate(now) : undefined;
  const origin = location.origin;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    const curated = MAP_PLACES.map((place) => {
      const km = haversineKm(origin.point, place);
      return {
        place,
        saved: null as SavedPlace | null,
        km,
        verdict: distanceVerdict(km, isoDate),
        matchesQuery: q === '' || searchTerms(place).some((t) => t.includes(q)),
        matchesCategory: categories.size === 0 || categories.has(place.category),
        onSelectedLine: lines.size === 0 || lines.has(place.day),
      };
    });

    // Yours, in the same list and sorted by the same rule — the question this
    // screen answers is "what is near me", and something you added yesterday is
    // as near as anything booked in March.
    const mine = savedPlaces.map((place) => {
      const km = haversineKm(origin.point, place);
      return {
        place: asPlace(place),
        saved: place,
        km,
        verdict: distanceVerdict(km, isoDate),
        matchesQuery: q === '' || savedSearchTerms(place).some((t) => t.includes(q)),
        matchesCategory: categories.size === 0 || categories.has(place.category),
        // A place with no day yet answers to no day filter. It is not on a day,
        // and putting it under one you picked would be the app deciding for you.
        onSelectedLine:
          lines.size === 0 || (place.day !== null && lines.has(place.day)),
      };
    });

    return [...curated, ...mine]
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
  }, [origin.point, isoDate, query, categories, lines, savedPlaces]);

  const visible = rows.filter((r) => r.onSelectedLine);
  const categoriesPresent = useMemo(
    () => [...new Set(MAP_PLACES.map((p) => p.category))].sort(),
    [],
  );

  const openStation = useMemo((): { station: Station; line: DayId } | null => {
    if (!openKey || isSavedKey(openKey)) return null;
    const place = MAP_PLACES.find((p) => p.key === openKey);
    if (!place) return null;
    const station = runningOrder(place.day).find((s) => s.place.key === openKey);
    return station ? { station, line: place.day } : null;
  }, [openKey]);

  const openSaved = useMemo(
    () => (openKey ? (savedPlaces.find((p) => p.key === openKey) ?? null) : null),
    [openKey, savedPlaces],
  );

  const editing = editingId ? (savedPlaces.find((p) => p.id === editingId) ?? null) : null;

  const closeAdd = (): void => {
    setAdding(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  };

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
      <div
        ref={filterBar}
        className="sticky top-0 z-30 border-b-hairline border-rule bg-paper/95 px-gutter pb-2.5 pt-2.5 backdrop-blur-sm"
      >
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

      {/* Add sits on the count line rather than above the list or at the foot
          of it: no extra vertical band in a screen that is already a sticky
          header over a long list, and still in reach without scrolling. */}
      <div ref={listTop} className="flex items-baseline justify-between gap-3 px-gutter pb-1 pt-3">
        <p className="numeric text-caption text-muted">
          {visible.length} of {MAP_PLACES.length + savedPlaces.length} · {origin.label}
        </p>
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setDraft(EMPTY_DRAFT);
            setAdding(true);
          }}
          className="tap -my-2 shrink-0 py-2 text-caption font-semibold text-accent"
        >
          + Add a place
        </button>
      </div>

      {rows.length === 0 ? (
        // A search that finds nothing is the exact moment you have heard of
        // somewhere the app does not know about, so the offer is to add it
        // under the name you already typed rather than to clear the box.
        <EmptyState
          title="Nothing matches"
          body={
            query
              ? `Nothing answers to “${query.trim()}”. Mall tenants count — try “Chikuro” or “Zhuko”. Or put it on the map yourself.`
              : 'Nothing is in every category you picked.'
          }
          actionLabel={query ? `Add “${query.trim()}”` : 'Clear the filters'}
          onAction={() => {
            if (query.trim()) {
              setEditingId(null);
              setDraft({ ...EMPTY_DRAFT, name: query.trim() });
              setAdding(true);
              return;
            }
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
                  {/* Not "Other days": a place you added without picking a day
                      is not on another day, it is on no day, and it lands here
                      too. */}
                  <p className="eyebrow">Everything else</p>
                </li>
              )}
              <PlaceRow
                place={row.place}
                km={row.km}
                verdict={row.verdict.text}
                mine={row.saved !== null}
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

      {openSaved && (
      <SavedPlaceSheet
        place={openSaved}
        from={location.origin.point}
        onEdit={() => {
          if (!openSaved) return;
          setEditingId(openSaved.id);
          setDraft(draftFrom(openSaved));
          setOpenKey(null);
          setAdding(true);
        }}
        onClose={() => setOpenKey(null)}
      />
      )}

      {adding && (
      <AddPlaceSheet
        open={adding}
        draft={draft}
        onDraftChange={setDraft}
        editing={editing}
        location={location}
        // No map on this screen to hand the crosshair to, so "Drop a pin"
        // carries the half-filled form over to the one that has it.
        onPickOnMap={() => {
          stashDraft(draft);
          window.location.href = '/map#add';
        }}
        onSave={(next) => {
          if (editingId) updateSaved(editingId, next);
          else setOpenKey(addSaved(next).key);
          closeAdd();
        }}
        onDelete={
          editingId
            ? () => {
                removeSaved(editingId);
                closeAdd();
              }
            : undefined
        }
        onClose={closeAdd}
      />
      )}
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
  mine,
  done,
  onOpen,
}: {
  place: Place;
  km: number;
  verdict: string;
  /** Added on the trip rather than booked. Marked, never hidden. */
  mine: boolean;
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
          <span className="mt-0.5 block text-caption text-muted">
            {mine && (
              // Never blurs into the booked trip: a row you added says so on
              // its own line, in the accent, before whatever note you gave it.
              <span className="font-semibold text-accent">Yours</span>
            )}
            {mine && place.note ? ' · ' : ''}
            {place.note}
          </span>
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
