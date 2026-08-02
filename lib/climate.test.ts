import { describe, expect, it } from 'vitest';
import {
  CLIMATE_YEARS,
  archiveUrls,
  archiveYears,
  describeNormal,
  normalFor,
  parseArchiveYear,
  summarise,
  wetYearCount,
} from './climate';
import { DAYS } from '@/data/trip';

const TRIP_YEAR = 2026;

/** One year of the archive, shaped the way Open-Meteo returns it. */
function year(y: number, rainMm: readonly number[]) {
  return {
    daily: {
      time: DAYS.map((d) => `${y}-${d.date.slice(5)}`),
      temperature_2m_max: DAYS.map(() => 31.4),
      temperature_2m_min: DAYS.map(() => 24.8),
      precipitation_sum: rainMm,
    },
  };
}

const DRY = DAYS.map(() => 0);

describe('archiveUrls', () => {
  it('asks one year at a time, over the trip’s own dates', () => {
    const urls = archiveUrls(TRIP_YEAR);
    expect(urls).toHaveLength(CLIMATE_YEARS);
    const first = new URL(urls[0]!);
    expect(first.host).toBe('archive-api.open-meteo.com');
    expect(first.searchParams.get('start_date')).toBe(`2016-${DAYS[0]!.date.slice(5)}`);
    expect(first.searchParams.get('end_date')).toBe(
      `2016-${DAYS[DAYS.length - 1]!.date.slice(5)}`,
    );
    expect(first.searchParams.get('timezone')).toBe('Asia/Jakarta');
    expect(first.search).not.toMatch(/key|token|appid/i);
  });

  it('covers the ten years before the trip, and never the trip year itself', () => {
    const years = archiveYears(TRIP_YEAR);
    expect(years[0]).toBe(2016);
    expect(years[years.length - 1]).toBe(2025);
    expect(years).not.toContain(TRIP_YEAR);
  });
});

describe('parseArchiveYear', () => {
  it('reads a year', () => {
    const rows = parseArchiveYear(year(2020, DRY));
    expect(rows).toHaveLength(DAYS.length);
    expect(rows[0]!.monthDay).toBe(DAYS[0]!.date.slice(5));
  });

  it('gives back nothing for a shape it did not ask for', () => {
    expect(parseArchiveYear(null)).toEqual([]);
    expect(parseArchiveYear({ error: true, reason: 'out of range' })).toEqual([]);
    expect(parseArchiveYear({ daily: { time: ['2020-08-21'] } })).toEqual([]);
  });

  it('skips a day the archive has a hole in, and keeps the rest', () => {
    const holey = {
      daily: {
        time: ['2020-08-21', '2020-08-22', '2020-08-23'],
        temperature_2m_max: [31, null, 31],
        temperature_2m_min: [25, 25, 25],
        precipitation_sum: [0, 0, 0],
      },
    };
    expect(parseArchiveYear(holey)).toHaveLength(2);
  });
});

describe('summarise', () => {
  it('counts a year as wet only where the rain was measurable', () => {
    // Day one: 4 mm in three years, a trace in one, nothing in the rest.
    const years = [
      parseArchiveYear(year(2016, [4.2, 0, 0, 0, 0])),
      parseArchiveYear(year(2017, [6.1, 0, 0, 0, 0])),
      parseArchiveYear(year(2018, [9.9, 0, 0, 0, 0])),
      // 0.3 mm is a damp pavement, not a wet day.
      parseArchiveYear(year(2019, [0.3, 0, 0, 0, 0])),
      parseArchiveYear(year(2020, DRY)),
    ];
    const climate = summarise(years, TRIP_YEAR, 0)!;
    const first = normalFor(climate, DAYS[0]!.date)!;
    expect(first.years).toBe(5);
    expect(wetYearCount(first)).toBe(3);
  });

  it('averages the temperatures across the years it has', () => {
    const warm = {
      daily: {
        time: [`2016-${DAYS[0]!.date.slice(5)}`],
        temperature_2m_max: [30],
        temperature_2m_min: [24],
        precipitation_sum: [0],
      },
    };
    const hot = {
      daily: {
        time: [`2017-${DAYS[0]!.date.slice(5)}`],
        temperature_2m_max: [34],
        temperature_2m_min: [26],
        precipitation_sum: [0],
      },
    };
    const climate = summarise([parseArchiveYear(warm), parseArchiveYear(hot)], TRIP_YEAR, 0)!;
    const first = normalFor(climate, DAYS[0]!.date)!;
    expect(first.highC).toBe(32);
    expect(first.lowC).toBe(25);
  });

  it('survives losing some of the years', () => {
    const years = [parseArchiveYear(year(2016, DRY)), [], parseArchiveYear({ error: true })];
    const climate = summarise(years, TRIP_YEAR, 0)!;
    expect(normalFor(climate, DAYS[0]!.date)!.years).toBe(1);
  });

  it('is null when every year failed, rather than an empty table', () => {
    expect(summarise([[], [], []], TRIP_YEAR, 0)).toBeNull();
  });

  it('reports the span it actually drew on', () => {
    const climate = summarise([parseArchiveYear(year(2016, DRY))], TRIP_YEAR, 123)!;
    expect(climate.fromYear).toBe(2016);
    expect(climate.toYear).toBe(2025);
    expect(climate.fetchedAt).toBe(123);
  });
});

describe('describeNormal', () => {
  const normal = (wetYears: number, years: number) => ({
    date: DAYS[0]!.date,
    highC: 31,
    lowC: 25,
    wetYears,
    years,
  });

  it('says what the number counts, because "6 of the last 10" does not', () => {
    expect(describeNormal(normal(60, 10))).toBe('usually 31° / 25° · rained 6 of the last 10 years');
  });

  it('does not say "rained 0"', () => {
    expect(describeNormal(normal(0, 10))).toBe('usually 31° / 25° · dry every one of the last 10 years');
  });

  it('gets the singular right on a lone year', () => {
    expect(describeNormal(normal(100, 1))).toContain('1 year');
    expect(describeNormal(normal(100, 1))).not.toContain('1 years');
  });
});
