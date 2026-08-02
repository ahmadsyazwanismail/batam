import { FERRY, MAP_PLACES, lineByDate, type MinutesOfDay } from '@/data/trip';
import { parseHhmm, wibDate, wibMinutes } from './time';
import { nextPrayer, prayerTimes } from './prayer';
import type { LatLon } from './geo';

/**
 * What is due next, and how long you have.
 *
 * Only things with a real time attached: the ferry, the bag check-in window,
 * published opening hours, and the next prayer. Nothing here is a guess about
 * how the day "should" go — the running order deliberately has no clock on it,
 * and this does not add one.
 */

export type EventKind = 'ferry' | 'opening' | 'prayer' | 'deadline';

export interface Upcoming {
  readonly kind: EventKind;
  readonly label: string;
  readonly at: MinutesOfDay;
  readonly inMinutes: number;
  /** Deadlines are the ones you cannot be late for. */
  readonly urgent: boolean;
}

export function upcoming(
  now: Date,
  at: LatLon,
  limit = 3,
): readonly Upcoming[] {
  const today = wibDate(now);
  const minutes = wibMinutes(now);
  const line = lineByDate(today);
  const events: Upcoming[] = [];

  const push = (
    kind: EventKind,
    label: string,
    time: MinutesOfDay,
    urgent = false,
  ): void => {
    if (time <= minutes) return;
    events.push({ kind, label, at: time, inMinutes: time - minutes, urgent });
  };

  // The ferry, both ways.
  for (const leg of FERRY.legs) {
    if (leg.date !== today) continue;
    if (leg.arrives) {
      push('ferry', `Lands at ${leg.to.split(',')[0]}`, parseHhmm(leg.arrives));
    } else {
      push('deadline', 'Bag check-in opens', FERRY.checkIn.opens, true);
      if (FERRY.checkIn.closes !== undefined) {
        push('deadline', 'Bag check-in closes', FERRY.checkIn.closes, true);
      }
      push('deadline', `Ferry home departs`, parseHhmm(leg.departs), true);
    }
  }

  // Anywhere on today's line that opens later today.
  if (line) {
    for (const place of MAP_PLACES) {
      if (place.line !== line.id || !place.opening) continue;
      push('opening', `${place.name} opens`, place.opening.opens);
    }
  }

  // The next prayer.
  const next = nextPrayer(prayerTimes(today, at), minutes);
  if (next && !next.tomorrow) {
    push('prayer', next.name === 'fajr' ? 'Subuh' : prayerLabel(next.name), next.at);
  }

  return events.sort((a, b) => a.at - b.at).slice(0, limit);
}

function prayerLabel(name: string): string {
  const labels: Record<string, string> = {
    fajr: 'Subuh',
    dhuhr: 'Zohor',
    asr: 'Asar',
    maghrib: 'Maghrib',
    isha: 'Isyak',
  };
  return labels[name] ?? name;
}

/** "in 2 h 15 m", "in 40 min", "in 3 min". */
export function formatCountdown(minutes: number): string {
  if (minutes < 1) return 'now';
  if (minutes < 60) return `in ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `in ${h} h` : `in ${h} h ${m} m`;
}
