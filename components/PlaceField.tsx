'use client';

import type { Place } from '@/data/trip';
import { fieldStyle } from '@/lib/palette';

/**
 * A place's picture, in the absence of a photograph.
 *
 * The colour comes from the place's own name, so it is always the same one and
 * becomes that restaurant's identity rather than decoration. The two soft
 * highlights stop it reading as a flat swatch.
 */
export function PlaceField({
  place,
  className = '',
  children,
}: {
  place: Place;
  className?: string;
  children?: React.ReactNode;
}): JSX.Element {
  return (
    <div className={`relative overflow-hidden ${className}`} style={fieldStyle(place)}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 28% 24%, rgba(255,255,255,.26) 0 20%, transparent 20%), radial-gradient(circle at 76% 74%, rgba(0,0,0,.18) 0 28%, transparent 28%)',
        }}
      />
      {children ? <div className="relative">{children}</div> : null}
    </div>
  );
}
