'use client';

import type { LocationApi } from '@/lib/useLocation';

/**
 * The contextual permission ask, and the honest status line afterwards.
 *
 * The button says what it is for before the browser sheet appears, which is the
 * whole reason it exists. Once the answer is in, this becomes a one-line
 * explanation of what the distances below are measured from — never a silent
 * fallback, because a wrong distance looks exactly like a right one.
 */
export function LocationBar({ location }: { location: LocationApi }): JSX.Element {
  const { permission, origin, error, ask, fix } = location;

  if (permission === 'idle') {
    return (
      <div className="border border-hairline border-rule bg-card p-4">
        <p className="font-semibold tracking-[-0.01em]">Find what is near me</p>
        <p className="mt-1 text-caption leading-relaxed text-muted">
          Distances are {origin.label} right now. Turn on location and they
          become live — your phone never sends anything anywhere, the whole app
          runs offline.
        </p>
        <button
          type="button"
          onClick={ask}
          className="tap mt-3 w-full py-3 font-semibold text-card"
          style={{ backgroundColor: 'var(--line-text)' }}
        >
          Use my location
        </button>
      </div>
    );
  }

  if (permission === 'locating') {
    return <Status>Looking for you…</Status>;
  }

  if (permission === 'denied' || permission === 'unavailable') {
    return (
      <Status>
        {error} Distances are {origin.label}.
      </Status>
    );
  }

  // Granted, but not necessarily usable — still on the ferry, still in Johor,
  // or the fix has gone stale.
  if (origin.kind === 'hotel') {
    return <Status>{origin.reason}</Status>;
  }

  return (
    <Status>
      Distances are {origin.label}
      {fix ? ` · accurate to about ${Math.round(fix.accuracy)} m` : ''}.
    </Status>
  );
}

function Status({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <p
      className="border-l-[3px] bg-card py-2 pl-3 pr-2 text-caption leading-relaxed text-muted"
      style={{ borderColor: 'var(--line)' }}
      role="status"
    >
      {children}
    </p>
  );
}
