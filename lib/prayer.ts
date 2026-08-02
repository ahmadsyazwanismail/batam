import type { MinutesOfDay } from '@/data/trip';
import { TRIP } from '@/data/trip';
import type { LatLon } from './geo';

/**
 * Prayer times, computed on the phone.
 *
 * Batam is majority Muslim, the family is travelling with a toddler, and two
 * of the places on the list were chosen for having a surau or Muslimah
 * privacy — so the day is already shaped around this. Every other app that
 * does it fetches from an API; this one cannot, because the whole point is
 * that it works with no signal. So the sun's position is worked out from
 * first principles instead.
 *
 * Convention: **Fajr 20°, Isha 18°, Asr at shadow factor 1 (Shafi'i)** — the
 * parameters both Kemenag (Indonesia) and JAKIM (Malaysia) publish, so the
 * same numbers hold either side of the strait.
 *
 * These are computed, not authoritative. The app says so on screen.
 */

export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export const PRAYER_LABEL: Record<PrayerName, string> = {
  fajr: 'Subuh',
  sunrise: 'Syuruk',
  dhuhr: 'Zohor',
  asr: 'Asar',
  maghrib: 'Maghrib',
  isha: 'Isyak',
};

/** Syuruk is sunrise, not a prayer — it marks the end of Subuh. */
export const IS_PRAYER: Record<PrayerName, boolean> = {
  fajr: true,
  sunrise: false,
  dhuhr: true,
  asr: true,
  maghrib: true,
  isha: true,
};

export const PRAYER_ORDER: readonly PrayerName[] = [
  'fajr',
  'sunrise',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
];

const FAJR_ANGLE = 20;
const ISHA_ANGLE = 18;
/** Shafi'i: the shadow equals the object's own length plus its noon shadow. */
const ASR_FACTOR = 1;
/** Refraction plus the sun's radius, the usual horizon allowance. */
const HORIZON = 0.833;

const rad = (d: number): number => (d * Math.PI) / 180;
const deg = (r: number): number => (r * 180) / Math.PI;
const sin = (d: number): number => Math.sin(rad(d));
const cos = (d: number): number => Math.cos(rad(d));
const tan = (d: number): number => Math.tan(rad(d));
const arccos = (x: number): number => deg(Math.acos(x));
const arccot = (x: number): number => deg(Math.atan(1 / x));

function fixHour(h: number): number {
  const v = h - 24 * Math.floor(h / 24);
  return v < 0 ? v + 24 : v;
}

/** Julian day for a UTC calendar date at 00:00. */
export function julianDay(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    b -
    1524.5
  );
}

interface SunPosition {
  /** Degrees. */
  readonly declination: number;
  /** Hours. */
  readonly equationOfTime: number;
}

export function sunPosition(jd: number): SunPosition {
  const d = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * d);
  const q = fixAngle(280.459 + 0.98564736 * d);
  const l = fixAngle(q + 1.915 * sin(g) + 0.02 * sin(2 * g));
  const e = 23.439 - 0.00000036 * d;

  const rightAscension = fixHour(deg(Math.atan2(cos(e) * sin(l), cos(l))) / 15);
  return {
    declination: deg(Math.asin(sin(e) * sin(l))),
    equationOfTime: q / 15 - rightAscension,
  };
}

function fixAngle(a: number): number {
  const v = a - 360 * Math.floor(a / 360);
  return v < 0 ? v + 360 : v;
}

/**
 * Hours from local midnight at which the sun sits `angle` degrees below the
 * horizon, before noon when `beforeNoon`.
 */
function sunAngleTime(
  angle: number,
  jd: number,
  lat: number,
  beforeNoon: boolean,
): number | null {
  const { declination, equationOfTime } = sunPosition(jd);
  const noon = 12 - equationOfTime;

  const numerator = -sin(angle) - sin(declination) * sin(lat);
  const denominator = cos(declination) * cos(lat);
  const ratio = numerator / denominator;
  // Inside a polar summer or winter there is no such moment. Batam is on the
  // equator so this never fires here, but returning null beats returning NaN.
  if (ratio > 1 || ratio < -1) return null;

  const offset = arccos(ratio) / 15;
  return beforeNoon ? noon - offset : noon + offset;
}

export interface PrayerTimes {
  /** Minutes from midnight, WIB. Null where the sun never reaches the angle. */
  readonly times: Readonly<Record<PrayerName, MinutesOfDay | null>>;
  readonly isoDate: string;
}

/**
 * @param isoDate the local (WIB) calendar date
 * @param at      where you are standing
 */
export function prayerTimes(
  isoDate: string,
  at: LatLon,
  tzOffsetHours: number = TRIP.tzOffsetHours,
): PrayerTimes {
  const [y, m, d] = isoDate.split('-').map(Number);
  // Midday local is the reference the algorithm is built around.
  const jd = julianDay(y!, m!, d!) - at.lon / (15 * 24);
  const { declination } = sunPosition(jd);

  const raw: Record<PrayerName, number | null> = {
    fajr: sunAngleTime(FAJR_ANGLE, jd, at.lat, true),
    sunrise: sunAngleTime(HORIZON, jd, at.lat, true),
    dhuhr: 12 - sunPosition(jd).equationOfTime,
    asr: null,
    maghrib: sunAngleTime(HORIZON, jd, at.lat, false),
    isha: sunAngleTime(ISHA_ANGLE, jd, at.lat, false),
  };

  // Asr: when an object's shadow exceeds its noon shadow by `factor` lengths.
  const asrAngle = -arccot(ASR_FACTOR + tan(Math.abs(at.lat - declination)));
  raw.asr = sunAngleTime(asrAngle, jd, at.lat, false);

  // Everything above is in local mean solar time; shift to the wall clock.
  const shift = tzOffsetHours - at.lon / 15;

  const times = {} as Record<PrayerName, MinutesOfDay | null>;
  for (const name of PRAYER_ORDER) {
    const hours = raw[name];
    times[name] = hours === null ? null : Math.round(fixHour(hours + shift) * 60);
  }

  return { times, isoDate };
}

export interface NextPrayer {
  readonly name: PrayerName;
  readonly at: MinutesOfDay;
  /** Minutes from now. Negative never happens — it rolls to tomorrow's Subuh. */
  readonly inMinutes: number;
  /** True once today's Isyak has passed and the next one is tomorrow. */
  readonly tomorrow: boolean;
}

export function nextPrayer(
  times: PrayerTimes,
  nowMinutes: MinutesOfDay,
): NextPrayer | null {
  for (const name of PRAYER_ORDER) {
    if (!IS_PRAYER[name]) continue;
    const at = times.times[name];
    if (at === null) continue;
    if (at > nowMinutes) {
      return { name, at, inMinutes: at - nowMinutes, tomorrow: false };
    }
  }

  // Past Isyak: the next one is tomorrow's Subuh, near enough today's.
  const fajr = times.times.fajr;
  if (fajr === null) return null;
  return {
    name: 'fajr',
    at: fajr,
    inMinutes: 24 * 60 - nowMinutes + fajr,
    tomorrow: true,
  };
}
