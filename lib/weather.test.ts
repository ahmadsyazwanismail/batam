import { describe, expect, it } from 'vitest';
import {
  FORECAST_DAYS,
  daysUntilInRange,
  describeCode,
  forDate,
  forecastUrl,
  parseForecast,
  tripOutlook,
} from './weather';
import { DAYS } from '@/data/trip';

/** The shape Open-Meteo actually returns, trimmed to three days. */
const payload = {
  latitude: 1.125,
  longitude: 104.0,
  timezone: 'Asia/Jakarta',
  daily: {
    time: ['2026-08-21', '2026-08-22', '2026-08-23'],
    weather_code: [3, 80, 95],
    temperature_2m_max: [31.4, 30.8, 29.9],
    temperature_2m_min: [25.1, 24.8, 24.6],
    precipitation_probability_max: [20, 65, 90],
  },
};

describe('forecastUrl', () => {
  it('asks for no key, and for Batam in its own timezone', () => {
    const url = new URL(forecastUrl());
    expect(url.host).toBe('api.open-meteo.com');
    expect(url.searchParams.get('timezone')).toBe('Asia/Jakarta');
    expect(Number(url.searchParams.get('latitude'))).toBeCloseTo(1.1, 1);
    expect(Number(url.searchParams.get('longitude'))).toBeCloseTo(104.03, 1);
    expect(url.searchParams.get('forecast_days')).toBe(String(FORECAST_DAYS));
    const daily = url.searchParams.get('daily') ?? '';
    for (const field of ['apparent_temperature_max', 'uv_index_max', 'sunrise', 'sunset']) {
      expect(daily, field).toContain(field);
    }
    // If this ever needs a key the whole choice of provider was wrong.
    expect(url.search).not.toMatch(/key|token|appid/i);
  });
});

describe('describeCode', () => {
  it('reads the WMO codes that Batam can actually produce', () => {
    expect(describeCode(0)).toEqual({ summary: 'Clear', wet: false });
    expect(describeCode(3)).toEqual({ summary: 'Overcast', wet: false });
    expect(describeCode(63).wet).toBe(true);
    expect(describeCode(80)).toEqual({ summary: 'Showers', wet: true });
    expect(describeCode(95)).toEqual({ summary: 'Thunderstorms', wet: true });
  });

  it('never returns nothing, even for a code it has not met', () => {
    for (const code of [4, 30, 79, 88, 199]) {
      expect(describeCode(code).summary.length).toBeGreaterThan(0);
    }
  });
});

describe('the richer fields', () => {
  const rich = {
    daily: {
      ...payload.daily,
      apparent_temperature_max: [35.4, 34.1, 33.2],
      relative_humidity_2m_mean: [78.6, 81.2, 84.9],
      wind_speed_10m_max: [14.3, 11.8, 19.4],
      uv_index_max: [9.2, 7.1, 5.4],
      precipitation_sum: [0, 3.44, 21.7],
      sunrise: ['2026-08-21T06:05', '2026-08-22T06:05', '2026-08-23T06:06'],
      sunset: ['2026-08-21T18:22', '2026-08-22T18:22', '2026-08-23T18:21'],
    },
  };

  it('reads everything a phone weather app shows', () => {
    const day = parseForecast(rich, 0)!.days[0]!;
    expect(day.feelsLikeC).toBe(35);
    expect(day.humidity).toBe(79);
    expect(day.windKph).toBe(14);
    expect(day.uvIndex).toBe(9);
    expect(day.sunrise).toBe('6:05 am');
    expect(day.sunset).toBe('6:22 pm');
  });

  it('keeps rain to one decimal, because 21.7 mm and 22 mm are different days', () => {
    const days = parseForecast(rich, 0)!.days;
    expect(days[1]!.rainMm).toBe(3.4);
    expect(days[2]!.rainMm).toBe(21.7);
    expect(days[0]!.rainMm).toBe(0);
  });

  it('leaves them undefined rather than zero when the response omits them', () => {
    const day = parseForecast(payload, 0)!.days[0]!;
    expect(day.feelsLikeC).toBeUndefined();
    expect(day.humidity).toBeUndefined();
    expect(day.sunrise).toBeUndefined();
    // The forecast itself is still perfectly usable.
    expect(day.highC).toBe(31);
  });

  it('ignores a sunrise that is not a timestamp', () => {
    const bent = { daily: { ...rich.daily, sunrise: ['06:05', null, 42] } };
    expect(parseForecast(bent, 0)!.days[0]!.sunrise).toBeUndefined();
  });
});

describe('parseForecast', () => {
  it('turns a real response into days', () => {
    const forecast = parseForecast(payload, 1_000);
    expect(forecast).not.toBeNull();
    expect(forecast!.days).toHaveLength(3);
    expect(forecast!.days[0]).toEqual({
      date: '2026-08-21',
      code: 3,
      summary: 'Overcast',
      highC: 31,
      lowC: 25,
      rainChance: 20,
      wet: false,
    });
    expect(forecast!.days[2]!.wet).toBe(true);
    expect(forecast!.fetchedAt).toBe(1_000);
  });

  it('refuses anything that is not the shape we asked for', () => {
    expect(parseForecast(null, 0)).toBeNull();
    expect(parseForecast('rain tomorrow', 0)).toBeNull();
    expect(parseForecast({}, 0)).toBeNull();
    expect(parseForecast({ daily: {} }, 0)).toBeNull();
    expect(parseForecast({ daily: { time: ['2026-08-21'] } }, 0)).toBeNull();
    // An error body, which is what a bad request actually returns.
    expect(parseForecast({ error: true, reason: 'nope' }, 0)).toBeNull();
  });

  it('drops individual days that are malformed rather than the whole forecast', () => {
    const holey = {
      daily: {
        time: ['2026-08-21', null, '2026-08-23'],
        weather_code: [0, 0, 0],
        temperature_2m_max: [31, 31, 31],
        temperature_2m_min: [25, 25, 25],
        precipitation_probability_max: [0, 0, 0],
      },
    };
    expect(parseForecast(holey, 0)!.days).toHaveLength(2);
  });

  it('copes with a missing rain probability', () => {
    const noRain = { daily: { ...payload.daily, precipitation_probability_max: undefined } };
    expect(parseForecast(noRain, 0)!.days[0]!.rainChance).toBe(0);
  });
});

describe('tripOutlook', () => {
  const first = DAYS[0]!.date;

  it('says so plainly when the trip is beyond the horizon', () => {
    const outlook = tripOutlook(null, '2026-08-02');
    expect(outlook.kind).toBe('waiting');
  });

  it('reports a partial forecast as partial, not as the whole trip', () => {
    const outlook = tripOutlook(parseForecast(payload, 0), '2026-08-20');
    expect(outlook.kind).toBe('partial');
    if (outlook.kind === 'partial') {
      expect(outlook.days).toHaveLength(3);
      expect(outlook.missing).toBe(DAYS.length - 3);
    }
  });

  it('is full only once every trip day is covered', () => {
    const all = {
      daily: {
        time: DAYS.map((d) => d.date),
        weather_code: DAYS.map(() => 1),
        temperature_2m_max: DAYS.map(() => 31),
        temperature_2m_min: DAYS.map(() => 25),
        precipitation_probability_max: DAYS.map(() => 10),
      },
    };
    const outlook = tripOutlook(parseForecast(all, 0), first);
    expect(outlook.kind).toBe('full');
  });
});

describe('daysUntilInRange', () => {
  it('counts down to the day the trip enters the window', () => {
    // The window covers today plus the next fifteen days.
    const inRangeFrom = new Date(Date.parse(`${DAYS[0]!.date}T00:00:00Z`) - (FORECAST_DAYS - 1) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    expect(daysUntilInRange(inRangeFrom)).toBe(0);
    const dayBefore = new Date(Date.parse(`${inRangeFrom}T00:00:00Z`) - 86_400_000)
      .toISOString()
      .slice(0, 10);
    expect(daysUntilInRange(dayBefore)).toBe(1);
  });

  it('never counts backwards once the trip is in range', () => {
    expect(daysUntilInRange(DAYS[0]!.date)).toBe(0);
    expect(daysUntilInRange('2026-09-01')).toBe(0);
  });
});

describe('forDate', () => {
  it('is null rather than a guess when the date is not covered', () => {
    const forecast = parseForecast(payload, 0);
    expect(forDate(forecast, '2026-08-25')).toBeNull();
    expect(forDate(null, '2026-08-21')).toBeNull();
    expect(forDate(forecast, '2026-08-21')?.highC).toBe(31);
  });
});
