import {
  FERRY,
  HOLIDAY_DATE,
  MAP_PLACES,
  lineByDate,
  type Category,
  type LineId,
  type MinutesOfDay,
  type Place,
} from '@/data/trip';
import { distanceVerdict, haversineKm, type LatLon, type Verdict } from './geo';
import { isOpenAt, wibDate, wibMinutes } from './time';

/**
 * "What should we do now?"
 *
 * A rules engine, not a model. Three reasons, in order: it works with no
 * signal, which is the premise of the whole app; the constraints below come
 * from the family rather than from a general travel model, and they need to be
 * guarantees rather than a good-faith attempt; and a scoring function can be
 * tested, which an LLM's answer cannot.
 *
 * It returns one recommendation, never a list. A list is what you get when
 * nobody will decide.
 */

// --- the constraints, which are not negotiable -----------------------------

/** Nothing that involves getting into a car during this window. */
export const NAP = { from: 13 * 60, to: 15 * 60 };
/** Midday sun is the usual reason an afternoon with a toddler ends early. */
export const HEAT = { from: 10 * 60, to: 16 * 60 };
/** After this, indoors. */
export const EVENING = 18 * 60;
/** On the last day everything has to be finished by here. */
export const LAST_DAY_CUTOFF = 15 * 60;
/** Door to door to the terminal. */
export const TERMINAL_TRANSFER_MIN = 25;

const OUTDOOR: ReadonlySet<Category> = new Set(['beach', 'land', 'dino']);
const INDOOR: ReadonlySet<Category> = new Set(['shop', 'spa', 'food', 'hotel']);

/** How well each category suits a one-year-old, roughly. */
const TODDLER: Record<Category, number> = {
  dino: 1,
  beach: 0.7,
  shop: 0.6,
  food: 0.5,
  hotel: 0.4,
  land: 0.3,
  ferry: 0,
  // A massage with a toddler in tow is a thing you do in shifts, if at all.
  spa: -0.4,
};

export interface Advice {
  readonly place: Place;
  readonly km: number;
  readonly verdict: Verdict;
  /** One plain sentence. Never a list. */
  readonly reason: string;
  readonly score: number;
}

export interface NoAdvice {
  readonly place: null;
  readonly reason: string;
}

export interface AdvisorInput {
  readonly now: Date;
  readonly from: LatLon;
  /** Place keys already ticked off. */
  readonly done: readonly string[];
  /** Rain makes everything an indoor question. */
  readonly raining?: boolean;
}

interface Candidate {
  readonly place: Place;
  readonly km: number;
  readonly verdict: Verdict;
  readonly travelMinutes: number;
  score: number;
  readonly notes: string[];
}

/** Rough door-to-door minutes: walking pace under 1.2 km, driving over. */
export function travelMinutes(km: number): number {
  if (km <= 1.2) return Math.max(2, Math.round((km / 4.3) * 60));
  // 24 km/h is what Batam traffic actually averages on these roads, plus a
  // few minutes of waiting for the Grab.
  return Math.round(5 + (km / 24) * 60);
}

export function advise(input: AdvisorInput): Advice | NoAdvice {
  const { now, from, done, raining = false } = input;
  const minutes = wibMinutes(now);
  const today = wibDate(now);
  const line = lineByDate(today);
  const isLastDay = today === HOLIDAY_DATE;

  if (!line) {
    return {
      place: null,
      reason:
        today < '2026-08-21'
          ? 'The trip has not started yet. Nothing to recommend until the ferry lands.'
          : 'The trip is over. Nothing left to recommend.',
    };
  }

  // On the last day the ferry is the only thing that matters once the window
  // closes. Bag check-in shuts at 16:30 and the ride is 20–25 minutes.
  if (isLastDay && minutes >= LAST_DAY_CUTOFF) {
    return {
      place: null,
      reason: `It is ${formatClock(minutes)}. Head for Harbour Bay — bags close at ${formatClock(
        FERRY.checkIn.closes ?? 16 * 60 + 30,
      )} and the ride is ${TERMINAL_TRANSFER_MIN} minutes.`,
    };
  }

  const doneSet = new Set(done);
  const candidates: Candidate[] = [];

  for (const place of MAP_PLACES) {
    if (doneSet.has(place.key)) continue;
    if (place.category === 'hotel' || place.category === 'ferry') continue;

    // Hard: shut is shut.
    if (!isOpenAt(place.opening, minutes)) continue;

    const km = haversineKm(from, place);
    const travel = travelMinutes(km);

    // Hard: on the last day it has to be finishable before the cutoff. An
    // hour there is the minimum worth going for.
    if (isLastDay && minutes + travel + 60 > LAST_DAY_CUTOFF) continue;

    // Hard: do not put a toddler in a car during the nap.
    const inNap = minutes >= NAP.from && minutes < NAP.to;
    if (inNap && travel > 10) continue;

    const candidate: Candidate = {
      place,
      km,
      verdict: distanceVerdict(km, today),
      travelMinutes: travel,
      score: 0,
      notes: [],
    };

    score(candidate, { minutes, line: line.id, raining, isLastDay });
    candidates.push(candidate);
  }

  if (candidates.length === 0) {
    return { place: null, reason: noneReason(minutes, isLastDay) };
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0]!;

  return {
    place: best.place,
    km: best.km,
    verdict: best.verdict,
    score: best.score,
    reason: sentence(best, line.id),
  };
}

function score(
  candidate: Candidate,
  ctx: { minutes: number; line: LineId; raining: boolean; isLastDay: boolean },
): void {
  const { place, km } = candidate;
  const { minutes, line, raining } = ctx;
  let total = 0;

  // Today's line first. Crossing lines is allowed but has to be worth it.
  if (place.line === line) {
    total += 3;
    candidate.notes.push('on today’s line');
  } else {
    total -= 1.5;
  }

  // Near beats far, steeply — with a toddler, twenty minutes in a car is the
  // whole difference between an outing and an ordeal.
  total += Math.max(-3, 2.5 - km * 0.45);

  // Heat. Outdoor things are for before 10:00 and after 16:00.
  const inHeat = minutes >= HEAT.from && minutes < HEAT.to;
  if (OUTDOOR.has(place.category)) {
    if (inHeat) {
      total -= 2.5;
    } else {
      total += 1.5;
      candidate.notes.push('good hour to be outside');
    }
  }

  // Rain, or after dark, means indoors.
  if ((raining || minutes >= EVENING) && INDOOR.has(place.category)) {
    total += 1.5;
    candidate.notes.push(raining ? 'indoors, and it is raining' : 'indoors');
  }
  if ((raining || minutes >= EVENING) && OUTDOOR.has(place.category)) {
    total -= 2.5;
  }

  // Mealtimes.
  if (place.category === 'food' && isMealtime(minutes)) {
    total += 2;
    candidate.notes.push('it is about mealtime');
  }

  total += TODDLER[place.category];

  // A place that is about to shut is not worth the trip.
  if (place.opening?.closes !== undefined) {
    const left = place.opening.closes - minutes;
    if (left < candidate.travelMinutes + 45) total -= 3;
  }

  candidate.score = total;
}

function isMealtime(minutes: MinutesOfDay): boolean {
  const lunch = minutes >= 11 * 60 + 30 && minutes <= 13 * 60 + 30;
  const dinner = minutes >= 18 * 60 && minutes <= 20 * 60 + 30;
  const breakfast = minutes >= 7 * 60 && minutes <= 9 * 60;
  return lunch || dinner || breakfast;
}

/** One sentence, and it has to say why. */
function sentence(candidate: Candidate, line: LineId): string {
  const { place, verdict, notes } = candidate;
  const how =
    verdict.mode === 'grab'
      ? `${verdict.fare.text} in a Grab, about ${candidate.travelMinutes} minutes`
      : verdict.text;

  const why = notes.length > 0 ? notes[0]! : place.line === line ? 'on today’s line' : 'worth the hop';
  return `${place.name} is ${how} away and open — ${why}.`;
}

function noneReason(minutes: MinutesOfDay, isLastDay: boolean): string {
  if (minutes >= NAP.from && minutes < NAP.to) {
    return 'It is nap time and everything left is a drive away. Stay put — the afternoon is better after three.';
  }
  if (isLastDay) {
    return 'Nothing left that finishes in time before bag check-in. Head back.';
  }
  if (minutes >= EVENING) {
    return 'Everything on the list is either shut or too far for this hour.';
  }
  return 'Everything nearby is ticked off. Try another line, or the map.';
}

function formatClock(minutes: MinutesOfDay): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(
    minutes % 60,
  ).padStart(2, '0')}`;
}
