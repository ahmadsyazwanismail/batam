import { DAYS } from '@/data/trip';

/**
 * Weather, from Open-Meteo.
 *
 * Chosen because it needs no API key, no account and no card — the same
 * constraint that ruled out Google Maps for the map. One GET, CORS allowed,
 * free for non-commercial use. https://open-meteo.com/
 *
 * Two things this deliberately does not do. It never guesses: a forecast only
 * reaches about a fortnight ahead, and for a trip booked months out the honest
 * answer for most of the year is "not yet", not a plausible-looking 31°C. And
 * it never blocks the app — the forecast is the one thing here that needs a
 * network, so everything around it has to survive not having one.
 */

/** Open-Meteo publishes about this far ahead. Past it there is nothing to ask for. */
export const FORECAST_DAYS = 16;

/** Batam. The whole island is inside one grid cell, so one lookup covers the trip. */
const LAT = 1.1034;
const LON = 104.0318;

export interface DayWeather {
  /** ISO date, WIB. */
  readonly date: string;
  readonly code: number;
  readonly summary: string;
  readonly highC: number;
  readonly lowC: number;
  /** Percent, 0–100. */
  readonly rainChance: number;
  /** True where the code is rain, showers or a thunderstorm. */
  readonly wet: boolean;
}

export interface Forecast {
  readonly days: readonly DayWeather[];
  /** Epoch ms, so a cached forecast can say how old it is. */
  readonly fetchedAt: number;
}

export function forecastUrl(): string {
  const params = new URLSearchParams({
    latitude: String(LAT),
    longitude: String(LON),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
    ].join(','),
    // Ask for WIB directly, so the daily buckets line up with the trip's dates.
    timezone: 'Asia/Jakarta',
    forecast_days: String(FORECAST_DAYS),
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

/**
 * WMO 4677, as Open-Meteo uses it.
 *
 * Snow and freezing rain are in here because the code space includes them, not
 * because Batam has any prospect of either.
 */
export function describeCode(code: number): { summary: string; wet: boolean } {
  if (code === 0) return { summary: 'Clear', wet: false };
  if (code === 1) return { summary: 'Mostly clear', wet: false };
  if (code === 2) return { summary: 'Partly cloudy', wet: false };
  if (code === 3) return { summary: 'Overcast', wet: false };
  if (code === 45 || code === 48) return { summary: 'Fog', wet: false };
  if (code >= 51 && code <= 57) return { summary: 'Drizzle', wet: true };
  if (code >= 61 && code <= 67) return { summary: 'Rain', wet: true };
  if (code >= 71 && code <= 77) return { summary: 'Snow', wet: true };
  if (code >= 80 && code <= 82) return { summary: 'Showers', wet: true };
  if (code === 85 || code === 86) return { summary: 'Snow showers', wet: true };
  if (code >= 95) return { summary: 'Thunderstorms', wet: true };
  return { summary: 'Unsettled', wet: false };
}

/** Anything less specific than this is not worth acting on. */
export const WET_ENOUGH_TO_STAY_IN = 60;

/**
 * Turn the response into our own shape, and refuse it if it is not what we
 * asked for. A forecast is the one thing in this app that comes off the
 * network, so it is the one thing that can arrive malformed.
 */
export function parseForecast(payload: unknown, fetchedAt: number): Forecast | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const daily = (payload as { daily?: unknown }).daily;
  if (typeof daily !== 'object' || daily === null) return null;

  const d = daily as Record<string, unknown>;
  const time = d.time;
  const codes = d.weather_code;
  const highs = d.temperature_2m_max;
  const lows = d.temperature_2m_min;
  const rain = d.precipitation_probability_max;

  if (
    !Array.isArray(time) ||
    !Array.isArray(codes) ||
    !Array.isArray(highs) ||
    !Array.isArray(lows)
  ) {
    return null;
  }

  const days: DayWeather[] = [];
  for (let i = 0; i < time.length; i += 1) {
    const date = time[i];
    const code = codes[i];
    const high = highs[i];
    const low = lows[i];
    if (typeof date !== 'string' || typeof code !== 'number') continue;
    if (typeof high !== 'number' || typeof low !== 'number') continue;

    const chance = Array.isArray(rain) && typeof rain[i] === 'number' ? (rain[i] as number) : 0;
    const { summary, wet } = describeCode(code);
    days.push({
      date,
      code,
      summary,
      highC: Math.round(high),
      lowC: Math.round(low),
      rainChance: Math.round(chance),
      wet,
    });
  }

  return days.length > 0 ? { days, fetchedAt } : null;
}

export function forDate(forecast: Forecast | null, date: string): DayWeather | null {
  return forecast?.days.find((d) => d.date === date) ?? null;
}

/**
 * How the trip sits relative to what can be known.
 *
 * `waiting` is the honest state for a trip booked further out than the
 * forecast reaches, and it is the state this app spends most of its life in.
 */
export type TripOutlook =
  | { readonly kind: 'waiting'; readonly daysUntilForecast: number }
  | { readonly kind: 'partial'; readonly days: readonly DayWeather[]; readonly missing: number }
  | { readonly kind: 'full'; readonly days: readonly DayWeather[] };

export function tripOutlook(forecast: Forecast | null, today: string): TripOutlook {
  const tripDates = DAYS.map((d) => d.date);
  const known = tripDates
    .map((date) => forDate(forecast, date))
    .filter((d): d is DayWeather => d !== null);

  if (known.length === 0) {
    return { kind: 'waiting', daysUntilForecast: daysUntilInRange(today) };
  }
  if (known.length < tripDates.length) {
    return { kind: 'partial', days: known, missing: tripDates.length - known.length };
  }
  return { kind: 'full', days: known };
}

/** Days until the trip's first date comes inside the forecast window. */
export function daysUntilInRange(today: string): number {
  const first = DAYS[0]?.date;
  if (!first) return 0;
  const gap = Math.round(
    (Date.parse(`${first}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );
  // The last day of the window is today + (FORECAST_DAYS - 1).
  return Math.max(0, gap - (FORECAST_DAYS - 1));
}
