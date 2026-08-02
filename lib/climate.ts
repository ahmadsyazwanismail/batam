import { DAYS } from '@/data/trip';

/**
 * What these dates are usually like, when a forecast does not exist yet.
 *
 * A forecast reaches about a fortnight. Past that there is nothing to fetch,
 * and inventing a number would be worse than an empty space. But the question
 * behind "what will the weather be" is usually "what should we pack, and
 * should we expect to be rained on", and that one *is* answerable — from what
 * actually happened on these same dates in previous years.
 *
 * So this is history, never a prediction, and the app says so wherever it
 * appears. Ten years of 21–25 August at Batam, off Open-Meteo's archive.
 *
 * Ten small requests rather than one large one: the archive takes a single
 * date range per call, and asking for 2016–2025 in one go would return every
 * day in between — about 3,700 of them — to use twenty-five. Each of these
 * comes back around half a kilobyte, and the answer never changes, so it is
 * fetched once and kept.
 */

const LAT = 1.1034;
const LON = 104.0318;

/** How many previous years to average. */
export const CLIMATE_YEARS = 10;

export interface ClimateNormal {
  /** The trip date this describes, e.g. "2026-08-21". */
  readonly date: string;
  readonly highC: number;
  readonly lowC: number;
  /** Share of past years with measurable rain on this date, 0–100. */
  readonly wetYears: number;
  /** How many years actually had data. Fewer than asked for is normal. */
  readonly years: number;
}

export interface Climate {
  readonly normals: readonly ClimateNormal[];
  readonly fetchedAt: number;
  readonly fromYear: number;
  readonly toYear: number;
}

/** Rain below this is a damp morning, not a wet day. */
const RAIN_MM = 1;

export function archiveYears(tripYear: number): readonly number[] {
  return Array.from({ length: CLIMATE_YEARS }, (_, i) => tripYear - CLIMATE_YEARS + i);
}

/** One request per year, covering only the trip's own dates in that year. */
export function archiveUrls(tripYear: number): readonly string[] {
  const first = DAYS[0]?.date ?? '';
  const last = DAYS[DAYS.length - 1]?.date ?? '';
  const md = (iso: string): string => iso.slice(5);

  return archiveYears(tripYear).map((year) => {
    const params = new URLSearchParams({
      latitude: String(LAT),
      longitude: String(LON),
      start_date: `${year}-${md(first)}`,
      end_date: `${year}-${md(last)}`,
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
      timezone: 'Asia/Jakarta',
    });
    return `https://archive-api.open-meteo.com/v1/archive?${params.toString()}`;
  });
}

interface YearRow {
  readonly monthDay: string;
  readonly high: number;
  readonly low: number;
  readonly rainMm: number;
}

/** One year's response. Returns [] for anything that is not the shape asked for. */
export function parseArchiveYear(payload: unknown): readonly YearRow[] {
  if (typeof payload !== 'object' || payload === null) return [];
  const daily = (payload as { daily?: unknown }).daily;
  if (typeof daily !== 'object' || daily === null) return [];

  const d = daily as Record<string, unknown>;
  const { time, temperature_2m_max: highs, temperature_2m_min: lows, precipitation_sum: rain } = d;
  if (!Array.isArray(time) || !Array.isArray(highs) || !Array.isArray(lows)) return [];

  const rows: YearRow[] = [];
  for (let i = 0; i < time.length; i += 1) {
    const date = time[i];
    const high = highs[i];
    const low = lows[i];
    // A gap in the archive is a null, not a missing index.
    if (typeof date !== 'string' || typeof high !== 'number' || typeof low !== 'number') continue;
    const mm = Array.isArray(rain) && typeof rain[i] === 'number' ? (rain[i] as number) : 0;
    rows.push({ monthDay: date.slice(5), high, low, rainMm: mm });
  }
  return rows;
}

/** Average the years together, one entry per trip date. */
export function summarise(
  years: readonly (readonly YearRow[])[],
  tripYear: number,
  fetchedAt: number,
): Climate | null {
  const buckets = new Map<string, YearRow[]>();
  for (const year of years) {
    for (const row of year) {
      const list = buckets.get(row.monthDay);
      if (list) list.push(row);
      else buckets.set(row.monthDay, [row]);
    }
  }

  const normals: ClimateNormal[] = [];
  for (const day of DAYS) {
    const rows = buckets.get(day.date.slice(5));
    if (!rows || rows.length === 0) continue;
    const mean = (pick: (r: YearRow) => number): number =>
      rows.reduce((n, r) => n + pick(r), 0) / rows.length;
    normals.push({
      date: day.date,
      highC: Math.round(mean((r) => r.high)),
      lowC: Math.round(mean((r) => r.low)),
      wetYears: Math.round((rows.filter((r) => r.rainMm >= RAIN_MM).length / rows.length) * 100),
      years: rows.length,
    });
  }

  if (normals.length === 0) return null;
  const list = archiveYears(tripYear);
  return {
    normals,
    fetchedAt,
    fromYear: list[0] ?? tripYear - CLIMATE_YEARS,
    toYear: list[list.length - 1] ?? tripYear - 1,
  };
}

export function normalFor(climate: Climate | null, date: string): ClimateNormal | null {
  return climate?.normals.find((n) => n.date === date) ?? null;
}

/**
 * "usually 31° / 25° · rained 6 of the last 10 years"
 *
 * The earlier wording was "rain in 6 of the last 10", which does not say ten
 * *what* — days, years, or forecasts. On a row already labelled with a date,
 * the only reading that helps is the one spelled out.
 */
export function describeNormal(normal: ClimateNormal): string {
  const wetCount = wetYearCount(normal);
  const years = `${normal.years} year${normal.years === 1 ? '' : 's'}`;
  const rain =
    wetCount === 0
      ? `dry every one of the last ${years}`
      : `rained ${wetCount} of the last ${years}`;
  return `usually ${normal.highC}° / ${normal.lowC}° · ${rain}`;
}

/** How many of the sampled years actually had rain on this date. */
export function wetYearCount(normal: ClimateNormal): number {
  return Math.round((normal.wetYears / 100) * normal.years);
}
