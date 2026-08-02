'use client';

import type { Place } from '@/data/trip';
import { fieldStyle } from '@/lib/palette';
import { PlaceGlyph } from './PlaceGlyph';

/**
 * A place's picture, in the absence of a photograph.
 *
 * Two layers doing two jobs. The colour comes from the place's own name, so it
 * is always the same one and becomes that restaurant's identity rather than
 * decoration. The pictogram on top of it says what the place actually is — a
 * fish for the seafood, a bridge for Barelang — which is the part you can read
 * without having learnt the colours first.
 *
 * Every field colour was chosen so that white clears 3:1 at both ends of the
 * gradient, so the glyph is legible on all of them; palette.test.ts enforces
 * it.
 */
export function PlaceField({
  place,
  className = '',
  /** Roughly half the tile, which is where a pictogram stops reading as noise. */
  glyphSize = 22,
  children,
}: {
  place: Place;
  className?: string;
  glyphSize?: number;
  children?: React.ReactNode;
}): JSX.Element {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={fieldStyle(place)}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 28% 24%, rgba(255,255,255,.26) 0 20%, transparent 20%), radial-gradient(circle at 76% 74%, rgba(0,0,0,.18) 0 28%, transparent 28%)',
        }}
      />
      <PlaceGlyph place={place} size={glyphSize} className="relative text-white" />
      {children ? <div className="relative">{children}</div> : null}
    </div>
  );
}
