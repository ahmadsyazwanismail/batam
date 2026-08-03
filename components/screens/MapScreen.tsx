'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { FilterChips } from '@/components/FilterChips';
import { PlaceSheet } from '@/components/PlaceSheet';
import { draftFrom, EMPTY_DRAFT, type DraftState } from '@/components/addPlaceDraft';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LocationBar } from '@/components/LocationBar';
import { MAP_PLACES, type Category, type DayId } from '@/data/trip';
import { runningOrder, type Station } from '@/lib/route';
import type { LatLon } from '@/lib/geo';
import { isSavedKey } from '@/lib/savedPlaces';
import { useHydrated, useTrip } from '@/lib/store';
import { useLocation } from '@/lib/useLocation';
import { useOnline } from '@/lib/useOnline';
import { takeDraft } from '@/lib/draftHandoff';

// Neither sheet is needed until it is asked for, and this screen is already
// carrying MapLibre.
const AddPlaceSheet = dynamic(
  () => import('@/components/AddPlaceSheet').then((m) => m.AddPlaceSheet),
  { ssr: false },
);
const SavedPlaceSheet = dynamic(
  () => import('@/components/SavedPlaceSheet').then((m) => m.SavedPlaceSheet),
  { ssr: false },
);

// MapLibre touches `window` on import, so it never renders on the server.
const MapCanvas = dynamic(
  () => import('@/components/MapCanvas').then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-paper">
        <p className="text-caption text-muted">Drawing the map…</p>
      </div>
    ),
  },
);

/** Whether the add sheet is up, folded away for picking, or absent. */
type AddMode = 'closed' | 'form' | 'picking';

export function MapScreen(): JSX.Element {
  const [now, setNow] = useState<Date | null>(null);
  const [lines, setLines] = useState<ReadonlySet<DayId>>(new Set());
  const [categories, setCategories] = useState<ReadonlySet<Category>>(new Set());
  const [openKey, setOpenKey] = useState<string | null>(null);

  const [addMode, setAddMode] = useState<AddMode>('closed');
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [centre, setCentre] = useState<LatLon | null>(null);

  const allSaved = useTrip((s) => s.saved);
  const addSaved = useTrip((s) => s.addSaved);
  const updateSaved = useTrip((s) => s.updateSaved);
  const removeSaved = useTrip((s) => s.removeSaved);
  const hydrated = useHydrated();

  // Memoised, not inlined: MapCanvas syncs its markers off this array, so a new
  // `[]` every render would mean a marker pass every render.
  const saved = useMemo(() => (hydrated ? allSaved : []), [hydrated, allSaved]);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Arriving from the Places screen's "Drop a pin", with whatever had already
  // been typed. The hash is cleared so a reload does not reopen the form.
  useEffect(() => {
    if (window.location.hash !== '#add') return;
    history.replaceState(null, '', window.location.pathname);
    setDraft(takeDraft() ?? EMPTY_DRAFT);
    setAddMode('picking');
  }, []);

  const location = useLocation(now ?? new Date());
  const online = useOnline();

  const you = location.origin.kind === 'you' ? location.origin.point : null;

  const onSelect = useCallback((key: string) => setOpenKey(key), []);
  const onCentreChange = useCallback((point: LatLon) => setCentre(point), []);

  const openStation = useMemo((): { station: Station; line: DayId } | null => {
    if (!openKey || isSavedKey(openKey)) return null;
    const place = MAP_PLACES.find((p) => p.key === openKey);
    if (!place) return null;
    const station = runningOrder(place.day).find((s) => s.place.key === openKey);
    return station ? { station, line: place.day } : null;
  }, [openKey]);

  const openSaved = useMemo(
    () => (openKey ? (saved.find((p) => p.key === openKey) ?? null) : null),
    [openKey, saved],
  );

  const categoriesPresent = useMemo(
    () => [...new Set(MAP_PLACES.map((p) => p.category))].sort(),
    [],
  );

  const startAdding = (): void => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setAddMode('form');
  };

  const closeAdd = (): void => {
    setAddMode('closed');
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  };

  const editing = editingId ? (saved.find((p) => p.id === editingId) ?? null) : null;

  return (
    <div className="mx-auto flex h-dvh max-w-app flex-col">
      {/* The map has its own header rather than the shared Screen, so the
          appearance control has to be placed here too — it is on every other
          screen and its absence here was the only gap. */}
      <header className="px-gutter pb-2 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">
              All five days · {MAP_PLACES.length} places
              {hydrated && saved.length > 0 && ` + ${saved.length} yours`}
            </p>
            <h1 className="mt-1 text-[2rem] font-bold tracking-[-0.035em]">Map</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={startAdding}
              aria-label="Add a place"
              title="Add a place"
              className="tap flex items-center justify-center rounded-full text-muted transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M11 3h2v8h8v2h-8v8h-2v-8H3v-2h8V3Z" />
              </svg>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="border-b-hairline border-rule px-gutter pb-2.5">
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

      {/* The one place horizontal movement is deliberate. */}
      <main className="relative min-h-0 flex-1">
        {now && (
          <MapCanvas
            selectedDays={lines}
            selectedCategories={categories}
            saved={saved}
            you={you}
            accuracy={location.fix?.accuracy ?? null}
            onSelect={onSelect}
            onCentreChange={onCentreChange}
            focus={openKey}
          />
        )}

        {!online && addMode !== 'picking' && (
          <p
            role="status"
            className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-md border border-hairline border-rule bg-card/95 px-3 py-2 text-caption text-muted"
          >
            Offline — only the map tiles you have already looked at will draw.
            Every pin, distance and plan still works.
          </p>
        )}

        {addMode === 'picking' && (
          <>
            {/* Fixed to the middle of the glass rather than following a tap:
                your thumb covers the exact spot you are trying to hit, so the
                map moves under a stationary crosshair instead. */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
            >
              <svg width="46" height="46" viewBox="0 0 46 46">
                <circle
                  cx="23"
                  cy="23"
                  r="13"
                  fill="none"
                  stroke="var(--paper)"
                  strokeWidth="5"
                  opacity="0.75"
                />
                <circle cx="23" cy="23" r="13" fill="none" stroke="var(--accent)" strokeWidth="2.5" />
                <path
                  d="M23 3v9M23 34v9M3 23h9M34 23h9"
                  stroke="var(--paper)"
                  strokeWidth="5"
                  opacity="0.75"
                  strokeLinecap="round"
                />
                <path
                  d="M23 3v9M23 34v9M3 23h9M34 23h9"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="23" cy="23" r="2.4" fill="var(--accent)" />
              </svg>
            </span>

            <div className="absolute inset-x-3 top-3 z-20 rounded-md border border-hairline border-rule bg-card/95 px-3 py-2.5 backdrop-blur-sm">
              <p className="text-caption text-muted">
                Move the map so the crosshair is on the spot.
              </p>
              <p className="numeric mt-0.5 font-semibold" aria-live="off">
                {centre ? `${centre.lat.toFixed(5)}, ${centre.lon.toFixed(5)}` : '—'}
              </p>
            </div>

            <div className="absolute inset-x-3 bottom-3 z-20 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (centre) {
                    setDraft((d) => ({ ...d, point: centre, how: 'picked on the map' }));
                  }
                  setAddMode('form');
                }}
                className="btn-solid py-3 shadow-modal"
              >
                Use this spot
              </button>
              <button
                type="button"
                onClick={() => setAddMode('form')}
                className="btn border border-rule bg-card py-3 shadow-modal"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </main>

      <div className="shrink-0 border-t-hairline border-rule px-gutter pb-[calc(theme(spacing.tabbar)+env(safe-area-inset-bottom))] pt-2.5">
        <LocationBar location={location} compact />
      </div>

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
          setAddMode('form');
        }}
        onClose={() => setOpenKey(null)}
      />
      )}

      {addMode === 'form' && (
      <AddPlaceSheet
        open={addMode === 'form'}
        draft={draft}
        onDraftChange={setDraft}
        editing={editing}
        location={location}
        onPickOnMap={() => setAddMode('picking')}
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
    </div>
  );
}
