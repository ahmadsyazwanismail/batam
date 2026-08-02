'use client';

import type { Station } from '@/lib/route';
import { dayById, type DayId } from '@/data/trip';
import { directionsUrl, formatKm } from '@/lib/geo';
import { useTrip } from '@/lib/store';
import { Sheet } from './Sheet';
import { PlaceField } from './PlaceField';
import { CATEGORY_LABEL, CategoryIcon } from './CategoryIcon';

/**
 * What one station is, and the two things you actually want to do with it:
 * get directions, and tick it off.
 */
export function PlaceSheet({
  station,
  line,
  onClose,
}: {
  station: Station | null;
  line: DayId;
  onClose: () => void;
}): JSX.Element {
  const done = useTrip((s) => s.done);
  const toggleDone = useTrip((s) => s.toggleDone);

  const place = station?.place;
  const isDone = place ? done.includes(place.key) : false;
  const { name: lineName } = dayById(line);

  return (
    <Sheet open={station !== null} onClose={onClose} title={place?.name ?? 'Station'}>
      {station && place && (
        <div className="px-gutter pt-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="eyebrow flex items-center gap-1.5">
                <span className="text-muted">
                  <CategoryIcon category={place.category} size={14} />
                </span>
                {CATEGORY_LABEL[place.category]}
                {station.interchange && ' · Interchange'}
              </p>
              <h3 className="mt-1.5 text-[1.75rem] font-bold leading-[1.1] tracking-[-0.03em]">
                {place.name}
              </h3>
            </div>
            <div className="shrink-0 pt-1">
              <PlaceField place={place} className="h-14 w-14 shrink-0 rounded-sm" />
            </div>
          </div>

          <p className="mt-2 text-muted">{place.note}</p>

          <dl className="mt-5 border-t border-hairline border-rule">
            <Row label="Line">
              {line} · {lineName}
            </Row>
            <Row label="Stop">
              {station.index}
              {station.connection ? ` · ${station.connection}` : ''}
            </Row>
            {station.fixedTime && <Row label="Hours">{station.fixedTime.label}</Row>}
            {station.fromPreviousKm !== null && (
              <Row label="From last stop">{formatKm(station.fromPreviousKm)}</Row>
            )}
            <Row label="Coordinates">
              {place.lat.toFixed(5)}, {place.lon.toFixed(5)}
            </Row>
          </dl>

          {place.tenants && place.tenants.length > 0 && (
            <>
              <p className="eyebrow mt-6">Inside</p>
              <ul className="mt-1.5 border-t border-hairline border-rule">
                {place.tenants.map((tenant) => (
                  <li
                    key={tenant.name}
                    className="flex items-baseline justify-between gap-4 border-b border-hairline border-rule py-2.5"
                  >
                    <span className="tracking-[-0.01em]">{tenant.name}</span>
                    <span className="shrink-0 text-caption text-muted">
                      {[tenant.floor, tenant.note].filter(Boolean).join(' · ')}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-6 grid grid-cols-2 gap-2">
            <a
              href={directionsUrl(place)}
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
                  ? { borderColor: 'var(--line)', color: 'var(--line-text)' }
                  : { borderColor: 'var(--rule)' }
              }
            >
              {isDone ? 'Done ✓' : 'Tick it off'}
            </button>
          </div>
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
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline border-rule py-2.5">
      <dt className="eyebrow">{label}</dt>
      <dd className="numeric shrink-0 text-right font-semibold tracking-[-0.01em]">
        {children}
      </dd>
    </div>
  );
}
