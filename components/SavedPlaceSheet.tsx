'use client';

import { dayById } from '@/data/trip';
import { directionsUrl, distanceVerdict, formatKm, haversineKm, type LatLon } from '@/lib/geo';
import { asPlace, type SavedPlace } from '@/lib/savedPlaces';
import { useTrip } from '@/lib/store';
import { Sheet } from './Sheet';
import { PlaceField } from './PlaceField';
import { CATEGORY_LABEL, CategoryIcon } from './CategoryIcon';

/**
 * One of yours.
 *
 * Deliberately the same layout as {@link PlaceSheet} minus the things a saved
 * place genuinely does not have — a position in the day's running order, a
 * meal slot, published opening hours — rather than blanks where those would be.
 * It gains the two things a curated place cannot have: edit, and remove.
 */
export function SavedPlaceSheet({
  place,
  from,
  onEdit,
  onClose,
}: {
  place: SavedPlace | null;
  /** Where "how far" is measured from. Omitted, the row is left out. */
  from?: LatLon;
  /** Absent where there is nowhere to edit from — the sheet is then read-only. */
  onEdit?: () => void;
  onClose: () => void;
}): JSX.Element {
  const done = useTrip((s) => s.done);
  const toggleDone = useTrip((s) => s.toggleDone);

  const isDone = place ? done.includes(place.key) : false;
  const day = place?.day === null || place === null ? null : dayById(place.day);

  return (
    <Sheet open={place !== null} onClose={onClose} title={place?.name ?? 'Place'}>
      {place && (
        <div className="px-gutter pt-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="eyebrow flex items-center gap-1.5">
                <span className="text-muted">
                  <CategoryIcon category={place.category} size={14} />
                </span>
                {CATEGORY_LABEL[place.category]}
                <span className="text-accent">· Added by you</span>
              </p>
              <h3 className="mt-1.5 text-[1.75rem] font-bold leading-[1.1] tracking-[-0.03em]">
                {place.name}
              </h3>
            </div>
            <div className="shrink-0 pt-1">
              <PlaceField
                place={asPlace(place)}
                glyphSize={24}
                className="h-14 w-14 shrink-0 rounded-sm"
              />
            </div>
          </div>

          {place.note && <p className="mt-2 text-muted">{place.note}</p>}

          <dl className="mt-5 [&>div:last-child]:border-b-0">
            <Row label="Day">
              {day ? (
                <>
                  Day {day.id} · {day.name}
                </>
              ) : (
                <span className="font-normal text-muted">Not decided yet</span>
              )}
            </Row>
            {from && (
              <Row label="How far">
                {formatKm(haversineKm(from, place))}
                <span className="mt-0.5 block text-caption font-normal text-muted">
                  {distanceVerdict(haversineKm(from, place)).text}
                </span>
              </Row>
            )}
            <Row label="Where">
              {place.lat.toFixed(5)}, {place.lon.toFixed(5)}
            </Row>
          </dl>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <a
              href={directionsUrl({ ...place })}
              target="_blank"
              rel="noreferrer"
              className="btn-solid py-3"
            >
              Directions
            </a>
            <button
              type="button"
              onClick={() => toggleDone(place.key)}
              aria-pressed={isDone}
              className="btn border py-3"
              style={
                isDone
                  ? { borderColor: 'var(--accent)', color: 'var(--accent)' }
                  : { borderColor: 'var(--rule)' }
              }
            >
              {isDone ? 'Done ✓' : 'Tick it off'}
            </button>
          </div>

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="tap mt-2 w-full rounded border border-hairline border-rule py-3 text-center font-semibold"
            >
              Edit or remove
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-baseline gap-x-4 border-b-hairline border-rule py-3">
      <dt className="eyebrow">{label}</dt>
      <dd className="numeric min-w-0 font-semibold leading-snug tracking-[-0.01em]">
        {children}
      </dd>
    </div>
  );
}
