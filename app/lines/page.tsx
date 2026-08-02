import Link from 'next/link';
import { Screen } from '@/components/Screen';
import { LineBadge } from '@/components/LineBadge';
import { LINES, placesOnLine, requirePlace } from '@/data/trip';
import { formatTripDate } from '@/lib/time';

export default function LinesPage(): JSX.Element {
  return (
    <Screen eyebrow="The network" title="Lines">
      <ul>
        {LINES.map((line) => {
          const stations = placesOnLine(line.id).length;
          const base = requirePlace(line.base);
          return (
            <li key={line.id} className="rule-b">
              <Link
                href={`/lines/${line.id}`}
                className="tap flex items-center gap-4 px-gutter py-4"
              >
                <LineBadge line={line.id} size="lg" shared />
                <div className="min-w-0 flex-1">
                  <p className="text-[1.125rem] font-semibold tracking-[-0.02em]">
                    {line.name}
                  </p>
                  <p className="mt-0.5 text-caption text-muted">
                    {formatTripDate(line.date)} · {stations}{' '}
                    {stations === 1 ? 'station' : 'stations'}
                  </p>
                  <p className="mt-0.5 text-caption text-muted">
                    Interchange · {base.name}
                  </p>
                </div>
                <span aria-hidden className="text-muted">
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="px-gutter pt-6 text-caption leading-relaxed text-muted">
        One hotel move in the whole trip, from Harris Barelang up to the Radisson
        on the morning of the 22nd.
      </p>
    </Screen>
  );
}
