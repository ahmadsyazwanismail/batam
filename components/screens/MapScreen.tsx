'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { FilterChips } from '@/components/FilterChips';
import { PlaceSheet } from '@/components/PlaceSheet';
import { LocationBar } from '@/components/LocationBar';
import { MAP_PLACES, type Category, type DayId } from '@/data/trip';
import { runningOrder, type Station } from '@/lib/route';
import { useLocation } from '@/lib/useLocation';
import { useOnline } from '@/lib/useOnline';

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

export function MapScreen(): JSX.Element {
  const [now, setNow] = useState<Date | null>(null);
  const [lines, setLines] = useState<ReadonlySet<DayId>>(new Set());
  const [categories, setCategories] = useState<ReadonlySet<Category>>(new Set());
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const location = useLocation(now ?? new Date());
  const online = useOnline();

  const you = location.origin.kind === 'you' ? location.origin.point : null;

  const onSelect = useCallback((key: string) => setOpenKey(key), []);

  const openStation = useMemo((): { station: Station; line: DayId } | null => {
    if (!openKey) return null;
    const place = MAP_PLACES.find((p) => p.key === openKey);
    if (!place) return null;
    const station = runningOrder(place.day).find((s) => s.place.key === openKey);
    return station ? { station, line: place.day } : null;
  }, [openKey]);

  const categoriesPresent = useMemo(
    () => [...new Set(MAP_PLACES.map((p) => p.category))].sort(),
    [],
  );

  return (
    <div className="mx-auto flex h-dvh max-w-app flex-col">
      <header className="px-gutter pb-2 pt-6">
        <p className="eyebrow">All five lines · {MAP_PLACES.length} stops</p>
        <h1 className="mt-1 text-[2rem] font-bold tracking-[-0.035em]">Map</h1>
      </header>

      <div className="border-b border-hairline border-rule px-gutter pb-2.5">
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
            you={you}
            accuracy={location.fix?.accuracy ?? null}
            onSelect={onSelect}
            focus={openKey}
          />
        )}

        {!online && (
          <p
            role="status"
            className="pointer-events-none absolute inset-x-3 top-3 z-10 border border-hairline border-rule bg-card/95 px-3 py-2 text-caption text-muted"
          >
            Offline — only the map tiles you have already looked at will draw.
            Every pin, distance and plan still works.
          </p>
        )}
      </main>

      <div className="shrink-0 border-t border-hairline border-rule px-gutter pb-[calc(theme(spacing.tabbar)+env(safe-area-inset-bottom))] pt-2.5">
        <LocationBar location={location} compact />
      </div>

      <PlaceSheet
        station={openStation?.station ?? null}
        line={openStation?.line ?? 1}
        onClose={() => setOpenKey(null)}
      />
    </div>
  );
}
