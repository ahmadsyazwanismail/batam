'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveOrigin, type Fix, type Origin, type Permission } from './location';

/**
 * Live position, with every state the browser can actually be in.
 *
 * Permission is never requested on load. Nothing here runs until `ask()` is
 * called from a button the user pressed, because a permission sheet that
 * appears before the app has explained itself gets denied, and a denial is
 * permanent until they go digging in settings.
 */
export interface LocationApi {
  readonly permission: Permission;
  readonly fix: Fix | null;
  readonly origin: Origin;
  readonly error: string | null;
  ask: () => void;
  stop: () => void;
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 0,
};

export function useLocation(now: Date): LocationApi {
  const [permission, setPermission] = useState<Permission>('idle');
  const [fix, setFix] = useState<Fix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  const ask = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setPermission('unavailable');
      setError('This browser cannot do location at all.');
      return;
    }
    if (watchId.current !== null) return;

    setPermission('locating');
    setError(null);

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setPermission('granted');
        setError(null);
        setFix({
          point: {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          },
          accuracy: position.coords.accuracy,
          at: position.timestamp,
        });
      },
      (err) => {
        stop();
        if (err.code === err.PERMISSION_DENIED) {
          setPermission('denied');
          setError(
            'Location is blocked for this site. Turn it back on in your browser settings if you want live distances.',
          );
          return;
        }
        setPermission('unavailable');
        setError(
          err.code === err.TIMEOUT
            ? 'Could not get a fix in time. Indoors and roaming, that happens.'
            : 'Your position is not available right now.',
        );
      },
      GEO_OPTIONS,
    );
  }, [stop]);

  // If permission was granted on a previous visit, pick it up silently — the
  // browser will not prompt again, so there is nothing to interrupt.
  useEffect(() => {
    let cancelled = false;
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (!cancelled && status.state === 'granted') ask();
      })
      .catch(() => {
        // Safari used to throw here. Nothing to do; the button still works.
      });

    return () => {
      cancelled = true;
    };
  }, [ask]);

  useEffect(() => stop, [stop]);

  return {
    permission,
    fix,
    origin: resolveOrigin(fix, now),
    error,
    ask,
    stop,
  };
}
