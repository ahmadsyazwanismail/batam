'use client';

import { useWeather } from '@/lib/useWeather';
import {
  FORECAST_DAYS,
  forDate,
  tripOutlook,
  WET_ENOUGH_TO_STAY_IN,
  type DayWeather,
} from '@/lib/weather';
import { useClimate } from '@/lib/useClimate';
import { describeNormal, normalFor } from '@/lib/climate';
import { formatTripDate, wibDate } from '@/lib/time';
import { DAYS } from '@/data/trip';

/**
 * A sun, a cloud, a cloud with rain, or a storm. Four shapes is enough to tell
 * a glance-able story, and each one is legible at sixteen pixels.
 */
function WeatherGlyph({ code, size = 20 }: { code: number; size?: number }): JSX.Element {
  const storm = code >= 95;
  const wet = (code >= 51 && code <= 82) || storm;
  const cloudy = code >= 2;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      {!cloudy && (
        <>
          <circle cx="12" cy="12" r="5" />
          <path d="M11 1.4h2v3.4h-2zM11 19.2h2v3.4h-2zM1.4 11h3.4v2H1.4zM19.2 11h3.4v2h-3.4zM4.2 5.6l1.4-1.4 2.4 2.4-1.4 1.4zM16 17.4l1.4-1.4 2.4 2.4-1.4 1.4zM4.2 18.4l2.4-2.4 1.4 1.4-2.4 2.4zM16 6.6 18.4 4.2l1.4 1.4-2.4 2.4z" />
        </>
      )}
      {cloudy && (
        <path d="M7.2 16.4A4.6 4.6 0 0 1 7.6 7.3a5.8 5.8 0 0 1 10.8 1.6 4 4 0 0 1-1 7.5z" />
      )}
      {wet && !storm && (
        <path d="M7.6 18.2h1.9l-1 3.6H6.6zM11.6 18.2h1.9l-1 3.6h-1.9zM15.6 18.2h1.9l-1 3.6h-1.9z" />
      )}
      {storm && <path d="M13.8 17.6h3.1l-2.7 3.1h1.9l-4.5 4 1.5-3.6h-2z" />}
    </svg>
  );
}

/** Feels like / humidity / wind / UV / rain / sunrise / sunset, where known. */
function Detail({ day }: { day: DayWeather }): JSX.Element | null {
  const cells: { label: string; value: string }[] = [];
  if (day.feelsLikeC !== undefined) cells.push({ label: 'Feels like', value: `${day.feelsLikeC}°` });
  if (day.humidity !== undefined) cells.push({ label: 'Humidity', value: `${day.humidity}%` });
  if (day.windKph !== undefined) cells.push({ label: 'Wind', value: `${day.windKph} km/h` });
  if (day.uvIndex !== undefined) {
    cells.push({ label: 'UV index', value: `${day.uvIndex}${day.uvIndex >= 8 ? ' · very high' : day.uvIndex >= 6 ? ' · high' : ''}` });
  }
  if (day.rainMm !== undefined && day.rainMm > 0) cells.push({ label: 'Rain', value: `${day.rainMm} mm` });
  if (day.sunrise) cells.push({ label: 'Sunrise', value: day.sunrise });
  if (day.sunset) cells.push({ label: 'Sunset', value: day.sunset });
  if (cells.length === 0) return null;

  return (
    <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 border-t-hairline border-rule pt-2.5">
      {cells.map((c) => (
        <div key={c.label} className="flex items-baseline justify-between gap-2">
          <dt className="eyebrow">{c.label}</dt>
          <dd className="numeric text-caption font-semibold">{c.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Line({ day }: { day: DayWeather }): JSX.Element {
  return (
    <>
      <span className="numeric font-semibold">
        {day.highC}° / {day.lowC}°
      </span>
      <span className="text-muted"> · {day.summary}</span>
      {day.rainChance > 0 && (
        <span className="numeric text-muted"> · {day.rainChance}% rain</span>
      )}
    </>
  );
}

/**
 * Today's weather, above the plan.
 *
 * Before the trip is inside the forecast window this says so rather than
 * showing nothing — "no forecast yet" is information, an empty space is not.
 */
export function WeatherCard(): JSX.Element | null {
  const weather = useWeather();
  const today = wibDate(new Date());
  const forecast = weather.status === 'ready' ? weather.forecast : null;
  const outlook = tripOutlook(forecast, today);
  // Any trip day the forecast does not reach falls back to what these dates
  // have actually been like. Only fetched while there is a gap to fill.
  const gaps = DAYS.some((d) => !forDate(forecast, d.date));
  const climate = useClimate(gaps);
  const normals = climate.status === 'ready' ? climate.climate : null;
  // Today's own weather is only worth a card while you are actually there.
  // Three weeks out, "31° in Batam right now" is trivia sitting on top of the
  // question you opened this for, which is what the trip is going to be like.
  const onTheTrip = DAYS.some((d) => d.date === today);
  const now = onTheTrip ? forDate(forecast, today) : null;

  // A failed forecast used to end the section here, which also threw away the
  // history — and the history is exactly what is worth having when the
  // forecast cannot be reached. Only bail out when there is nothing of either.
  const nothingAtAll = weather.status === 'unavailable' && !normals;
  if (nothingAtAll && climate.status !== 'loading') {
    return (
      <section className="px-gutter pt-7">
        <h2 className="eyebrow">Weather</h2>
        <p className="mt-1.5 text-caption leading-relaxed text-muted">
          No forecast — this is the one part of the app that needs a signal. It
          will fill in the next time you have one.
        </p>
      </section>
    );
  }

  return (
    <section className="px-gutter pt-7">
      <h2 className="eyebrow">Weather</h2>

      {now && (
        <div className="mt-2 rounded-md border border-hairline border-rule bg-card p-3">
          <div className="flex items-center gap-3">
            <span className="shrink-0" style={{ color: 'var(--accent)' }}>
              <WeatherGlyph code={now.code} size={26} />
            </span>
            <p className="min-w-0 flex-1 text-caption leading-snug">
              <Line day={now} />
            </p>
          </div>
          <Detail day={now} />
        </div>
      )}

      {/* Always five rows, from the first paint. This used to render one line
          of "Checking the forecast…" and then become a five-row table, which
          measured 0.124 of layout shift — the block below it visibly jumped
          down the page a second after you opened the app. */}
      <ul className="mt-2 overflow-hidden rounded-md border border-hairline border-rule bg-card [&>li:last-child]:border-b-0">
        {DAYS.map((day) => {
          const w = forDate(forecast, day.date);
          const normal = normalFor(normals, day.date);
          return (
            <li
              key={day.id}
              className="flex items-center gap-3 border-b-hairline border-rule px-3 py-2.5"
            >
              <span className="numeric w-[86px] shrink-0 text-eyebrow font-bold uppercase text-muted">
                {formatTripDate(day.date)}
              </span>
              {w ? (
                <>
                  <span className="shrink-0 text-muted">
                    <WeatherGlyph code={w.code} size={18} />
                  </span>
                  <span className="min-w-0 flex-1 text-caption leading-snug">
                    <Line day={w} />
                  </span>
                </>
              ) : normal ? (
                <span className="min-w-0 flex-1 text-caption leading-snug text-muted">
                  {describeNormal(normal)}
                </span>
              ) : (
                <span className="flex-1 text-caption text-muted">
                  {weather.status === 'loading' || climate.status === 'loading'
                    ? 'Checking…'
                    : 'Nothing recorded'}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {outlook.kind !== 'full' && (
        <p className="mt-1.5 text-caption leading-relaxed text-muted">
          {weather.status === 'unavailable'
            ? 'No forecast right now — that part needs a signal'
            : outlook.kind === 'waiting'
              ? 'No forecast reaches this far yet'
              : 'The later days are past where a forecast reaches'}{' '}
          — a forecast goes {FORECAST_DAYS} days ahead
          {outlook.kind === 'waiting' &&
            `, so the trip comes into range in about ${
              outlook.daysUntilForecast === 1 ? 'a day' : `${outlook.daysUntilForecast} days`
            }`}
          .{' '}
          {normals && (
            <>
              Until then those days show what actually happened on the same dates
              from {normals.fromYear} to {normals.toYear}. That is history, not a
              prediction.
            </>
          )}
        </p>
      )}

      {weather.status === 'ready' && weather.stale && (
        <p className="mt-1.5 text-eyebrow text-muted">
          Last fetched {new Date(weather.forecast.fetchedAt).toLocaleString()}.
        </p>
      )}
    </section>
  );
}

/**
 * One line for one day, for the top of a day's page.
 *
 * Returns nothing at all when there is no forecast for that date — a day page
 * is about the food, and an empty weather row would be in the way.
 */
export function DayWeatherRow({ date }: { date: string }): JSX.Element | null {
  const weather = useWeather();
  const day = forDate(weather.status === 'ready' ? weather.forecast : null, date);
  if (!day) return null;

  const stayIn = day.wet || day.rainChance >= WET_ENOUGH_TO_STAY_IN;

  return (
    <p className="mt-2 flex items-center gap-2 text-caption leading-snug text-muted">
      <span className="shrink-0" style={{ color: 'var(--accent)' }}>
        <WeatherGlyph code={day.code} size={18} />
      </span>
      <span className="min-w-0">
        <Line day={day} />
        {stayIn && <span className="text-muted"> — plan the indoor stops</span>}
      </span>
    </p>
  );
}
