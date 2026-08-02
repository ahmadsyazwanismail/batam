'use client';

import type { Station } from '@/lib/route';
import { dayById, type DayId } from '@/data/trip';
import { directionsUrl, distanceVerdict, formatKm, haversineKm, type LatLon } from '@/lib/geo';
import { dayMenu } from '@/lib/meals';
import { useTrip } from '@/lib/store';
import { Sheet } from './Sheet';
import { PlaceField } from './PlaceField';
import { CATEGORY_LABEL, CategoryIcon } from './CategoryIcon';

/**
 * What one place is, and the two things you actually want to do with it:
 * get directions, and tick it off.
 *
 * The table used to read Line / Stop / From last stop / Coordinates, which was
 * the strip map's vocabulary and outlived it. A stop number means nothing once
 * the day is a menu, and a raw lat/lon is developer output sitting directly
 * above the button that actually takes you there.
 */
export function PlaceSheet({
  station,
  line,
  from,
  onClose,
}: {
  station: Station | null;
  line: DayId;
  /** Where "how far" is measured from. Omitted, the row is left out. */
  from?: LatLon;
  onClose: () => void;
}): JSX.Element {
  const done = useTrip((s) => s.done);
  const toggleDone = useTrip((s) => s.toggleDone);

  const place = station?.place;
  const isDone = place ? done.includes(place.key) : false;
  const { name: lineName } = dayById(line);
  const course = place
    ? dayMenu(line).courses.find((c) => c.places.some((p) => p.place.key === place.key))
    : undefined;

  return (
    <Sheet open={station !== null} onClose={onClose} title={place?.name ?? 'Place'}>
      {station && place && (
        <div className="px-gutter pt-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="eyebrow flex items-center gap-1.5">
                <span className="text-muted">
                  <CategoryIcon category={place.category} size={14} />
                </span>
                {CATEGORY_LABEL[place.category]}
              </p>
              <h3 className="mt-1.5 text-[1.75rem] font-bold leading-[1.1] tracking-[-0.03em]">
                {place.name}
              </h3>
            </div>
            <div className="shrink-0 pt-1">
              <PlaceField place={place} glyphSize={24} className="h-14 w-14 shrink-0 rounded-sm" />
            </div>
          </div>

          <p className="mt-2 text-muted">{place.note}</p>

          <dl className="mt-5 [&>div:last-child]:border-b-0">
            <Row label="Day">
              Day {line} · {lineName}
            </Row>
            {course && (
              <Row label="Course">
                <span style={{ color: course.meal.textColour }}>{course.meal.name}</span>
              </Row>
            )}
            {station.fixedTime && <Row label="Open">{station.fixedTime.label}</Row>}
            {from && (
              <Row label="How far">
                {formatKm(haversineKm(from, place))}
                <span className="mt-0.5 block text-caption font-normal text-muted">
                  {distanceVerdict(haversineKm(from, place)).text}
                </span>
              </Row>
            )}
          </dl>

          {place.tenants && place.tenants.length > 0 && (
            <>
              <p className="eyebrow mt-6">Inside</p>
              <ul className="mt-1.5 border-t-hairline border-rule">
                {place.tenants.map((tenant) => (
                  <li
                    key={tenant.name}
                    className="flex items-baseline justify-between gap-4 border-b-hairline border-rule py-2.5"
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
    // Two columns rather than label-left/value-right. Pushing values to the
    // right edge is what made this look cramped: "Day 4 · Northern loop" and
    // "Makan tengahari" both ran the full width and finished hard against the
    // margin. On a fixed left column they start in the same place and wrap
    // into space instead of fighting for it.
    <div className="grid grid-cols-[6.5rem_1fr] items-baseline gap-x-4 border-b-hairline border-rule py-3">
      <dt className="eyebrow">{label}</dt>
      <dd className="numeric min-w-0 font-semibold leading-snug tracking-[-0.01em]">
        {children}
      </dd>
    </div>
  );
}
