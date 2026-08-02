import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Screen } from '@/components/Screen';
import { NextUp } from '@/components/NextUp';
import { LineBadge } from '@/components/LineBadge';
import { LineTheme } from '@/components/LineTheme';
import { LINES, lineById, placesOnLine, requirePlace, type LineId } from '@/data/trip';
import { formatTripDate } from '@/lib/time';

export function generateStaticParams(): { id: string }[] {
  return LINES.map((l) => ({ id: String(l.id) }));
}

export default function LinePage({ params }: { params: { id: string } }): JSX.Element {
  const id = Number(params.id) as LineId;
  if (!LINES.some((l) => l.id === id)) notFound();

  const line = lineById(id);
  const stations = placesOnLine(id);
  const base = requirePlace(line.base);

  return (
    <>
      <LineTheme line={id} />
      <Screen
        eyebrow={`${formatTripDate(line.date)} · from ${base.name}`}
        title={line.name}
        trailing={<LineBadge line={id} size="lg" shared />}
      >
        <NextUp step="Build step 3">
          {`The running order for this line, drawn as a vertical strip map: a coloured spine with ${stations.length} stations down it. This is the signature piece, so it comes next.`}
        </NextUp>

        <ul className="mt-6">
          {stations.map((place) => (
            <li key={place.key} className="rule-b px-gutter py-3">
              <p className="tracking-[-0.01em]">{place.name}</p>
              <p className="mt-0.5 text-caption text-muted">{place.note}</p>
            </li>
          ))}
        </ul>

        <div className="px-gutter pt-6">
          <Link href="/lines" className="tap inline-flex items-center text-caption font-semibold">
            ← All lines
          </Link>
        </div>
      </Screen>
    </>
  );
}
