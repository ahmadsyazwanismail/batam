'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Station } from '@/lib/route';
import { dayById, type DayId } from '@/data/trip';
import { formatKm } from '@/lib/geo';
import { listVariants, stationVariants, usePrefersReducedMotion } from '@/lib/motion';
import { useHydrated, useTrip } from '@/lib/store';
import { CategoryIcon } from './CategoryIcon';
import { PlaceSheet } from './PlaceSheet';

/**
 * The signature piece: a carriage diagram.
 *
 * A coloured spine down the left with stations on it. Interchanges — the two
 * hotels and the ferry terminal — get a ringed dot; the first and last stations
 * get a terminus bar. Stations stagger in from the top when the line changes.
 */
export function StripMap({
  line,
  stations,
}: {
  line: DayId;
  stations: readonly Station[];
}): JSX.Element {
  const { colour, onColour } = dayById(line);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();

  const done = useTrip((s) => s.done);
  const hydrated = useHydrated();

  const open = stations.find((s) => s.place.key === openKey) ?? null;

  return (
    <>
      <motion.ol
        variants={listVariants}
        initial={reduced ? false : 'hidden'}
        animate="show"
        // Re-staggering on line change is the point of the animation.
        key={line}
        className="relative"
      >
        {stations.map((station, i) => (
          <StationRow
            key={station.place.key}
            station={station}
            line={line}
            colour={colour}
            onColour={onColour}
            first={i === 0}
            last={i === stations.length - 1}
            done={hydrated && done.includes(station.place.key)}
            onOpen={() => setOpenKey(station.place.key)}
          />
        ))}
      </motion.ol>

      <PlaceSheet
        station={open}
        line={line}
        onClose={() => setOpenKey(null)}
      />
    </>
  );
}

/** Where the spine sits, in px from the left edge of the row. */
const SPINE_X = 30;

function StationRow({
  station,
  line,
  colour,
  onColour,
  first,
  last,
  done,
  onOpen,
}: {
  station: Station;
  line: DayId;
  colour: string;
  onColour: string;
  first: boolean;
  last: boolean;
  done: boolean;
  onOpen: () => void;
}): JSX.Element {
  const { place, interchange, fromPreviousKm, fixedTime, connection } = station;

  const hasTenants = (place.tenants?.length ?? 0) > 0;
  // A station borrowed from another line shows its role here, not its own
  // blurb — the terminal's "camera collected here on arrival" is a day-one
  // fact and has no business on the departure strip. The sheet still has it.
  const showNote = place.day === line;

  return (
    <motion.li variants={stationVariants} className="relative">
      {/* The spine. Stops half way on the first and last rows so the line
          begins and ends at a station rather than running off the screen. */}
      <span
        aria-hidden
        className="absolute w-[4px]"
        style={{
          backgroundColor: colour,
          left: SPINE_X - 2,
          top: first ? '2rem' : 0,
          bottom: last ? 'calc(100% - 2rem)' : 0,
        }}
      />

      <button
        type="button"
        onClick={onOpen}
        className="tap relative flex w-full items-start gap-3 py-3 pr-gutter text-left"
        style={{ paddingLeft: SPINE_X + 22 }}
      >
        <StationDot
          colour={colour}
          interchange={interchange}
          terminus={first || last}
          done={done}
        />

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span
              className={`font-semibold tracking-[-0.015em] ${
                done ? 'text-muted line-through' : ''
              }`}
            >
              {place.name}
            </span>
            <span className="shrink-0 text-muted" aria-hidden>
              <CategoryIcon category={place.category} />
            </span>
          </span>

          {/* A mall's note is its tenant list, so showing both says it twice.
              The tenant line wins — it carries the floors. */}
          {hasTenants ? (
            <span className="mt-0.5 block text-caption text-muted">
              Inside ·{' '}
              {place.tenants!
                .map((t) => (t.floor ? `${t.name} (${t.floor})` : t.name))
                .join(' · ')}
            </span>
          ) : (
            showNote && (
              <span className="mt-0.5 block text-caption text-muted">{place.note}</span>
            )
          )}

          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {connection && (
              <Chip colour={colour} onColour={onColour} filled>
                {connection}
              </Chip>
            )}
            {fixedTime && <Chip colour={colour}>{fixedTime.label}</Chip>}
            {fromPreviousKm !== null && (
              <span className="numeric text-caption text-muted">
                +{formatKm(fromPreviousKm)}
              </span>
            )}
          </span>
        </span>
      </button>
    </motion.li>
  );
}

function StationDot({
  colour,
  interchange,
  terminus,
  done,
}: {
  colour: string;
  interchange: boolean;
  terminus: boolean;
  done: boolean;
}): JSX.Element {
  // Termini get a bar across the spine, the way an end-of-line is drawn.
  if (terminus) {
    return (
      <span
        aria-hidden
        className="absolute top-[1.55rem] h-[4px] w-[18px] -translate-y-1/2"
        style={{ backgroundColor: colour, left: SPINE_X - 9 }}
      >
        <span
          className="absolute left-1/2 top-1/2 block h-[15px] w-[15px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[4px] bg-paper"
          style={{ borderColor: colour, opacity: done ? 0.35 : 1 }}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={`absolute top-[1.55rem] -translate-y-1/2 rounded-full ${
        interchange ? 'h-[15px] w-[15px] border-[4px] bg-paper' : 'h-[11px] w-[11px]'
      }`}
      style={{
        left: SPINE_X - (interchange ? 7.5 : 5.5),
        ...(interchange ? { borderColor: colour } : { backgroundColor: colour }),
        opacity: done ? 0.35 : 1,
      }}
    />
  );
}

function Chip({
  children,
  colour,
  onColour,
  filled = false,
}: {
  children: React.ReactNode;
  colour: string;
  /** Never plain white — orange cannot carry it. See lib/contrast.test.ts. */
  onColour?: string;
  filled?: boolean;
}): JSX.Element {
  return (
    <span
      className="numeric rounded-full px-2 py-0.5 text-eyebrow font-semibold uppercase tracking-[0.06em]"
      style={
        filled
          ? { backgroundColor: colour, color: onColour }
          : { boxShadow: `inset 0 0 0 1px ${colour}`, color: 'var(--line-text)' }
      }
    >
      {children}
    </span>
  );
}
