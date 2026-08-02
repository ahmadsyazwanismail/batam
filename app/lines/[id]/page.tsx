import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Screen } from '@/components/Screen';
import { LineBadge } from '@/components/LineBadge';
import { LineTheme } from '@/components/LineTheme';
import { StripMap } from '@/components/StripMap';
import { LINES, lineById, requirePlace, type LineId } from '@/data/trip';
import { runningOrder } from '@/lib/route';
import { formatTripDate } from '@/lib/time';

export function generateStaticParams(): { id: string }[] {
  return LINES.map((l) => ({ id: String(l.id) }));
}

export default function LinePage({ params }: { params: { id: string } }): JSX.Element {
  const id = Number(params.id) as LineId;
  if (!LINES.some((l) => l.id === id)) notFound();

  const line = lineById(id);
  const stations = runningOrder(id);
  const base = requirePlace(line.base);
  const totalKm = stations.reduce((n, s) => n + (s.fromPreviousKm ?? 0), 0);

  return (
    <>
      <LineTheme line={id} />
      <Screen
        eyebrow={`Line ${id} · ${formatTripDate(line.date)}`}
        title={line.name}
        trailing={<LineBadge line={id} size="lg" shared />}
      >
        <p className="numeric px-gutter pb-4 text-caption text-muted">
          {stations.length} stations · {totalKm.toFixed(1)} km end to end · nights
          at {base.name}
        </p>

        <StripMap line={id} stations={stations} />

        <p className="px-gutter pt-6 text-caption leading-relaxed text-muted">
          A suggested order, not a timetable. Stops are routed so consecutive
          ones are near each other, anything shut until the afternoon falls to
          the back of the day, and the only clock times shown are real ones.
        </p>

        <nav className="flex items-center justify-between gap-3 px-gutter pt-6">
          {id > 1 ? (
            <Link href={`/lines/${id - 1}`} className="tap flex items-center text-caption font-semibold">
              ← {lineById((id - 1) as LineId).name}
            </Link>
          ) : (
            <span />
          )}
          {id < LINES.length ? (
            <Link href={`/lines/${id + 1}`} className="tap flex items-center text-caption font-semibold">
              {lineById((id + 1) as LineId).name} →
            </Link>
          ) : (
            <span />
          )}
        </nav>

        <div className="px-gutter pt-4">
          <Link href="/lines" className="tap inline-flex items-center text-caption font-semibold text-muted">
            All lines
          </Link>
        </div>
      </Screen>
    </>
  );
}
