import { glyphFor, type GlyphKey } from '@/lib/glyph';
import type { Place } from '@/data/trip';

/**
 * The pictograms.
 *
 * All drawn on the same 24-unit grid as filled silhouettes in `currentColor`,
 * with no strokes thinner than a unit and a half — they have to survive being
 * rendered at 36 px on a card, which is where outline icons fall apart.
 */
const PATHS: Record<GlyphKey, JSX.Element> = {
  // A cone of rice with a small dish either side of it: nasi padang.
  padang: (
    <>
      <path d="M12 2.6 7.8 12.4h8.4z" />
      <path d="M4.4 14.2h15.2a1 1 0 0 1 1 1.14A5.1 5.1 0 0 1 15.5 19.8h-7a5.1 5.1 0 0 1-5.1-4.46 1 1 0 0 1 1-1.14Z" />
      <path d="M.8 8h5.4a.8.8 0 0 1 .8.92A3.5 3.5 0 0 1 3.5 12 3.5 3.5 0 0 1 0 8.92.8.8 0 0 1 .8 8Z" />
      <path d="M17.8 8h5.4a.8.8 0 0 1 .8.92A3.5 3.5 0 0 1 20.5 12 3.5 3.5 0 0 1 17 8.92.8.8 0 0 1 17.8 8Z" />
    </>
  ),
  fish: (
    <>
      <path d="M13.6 6c3.9 0 7.2 2.7 8.4 6-1.2 3.3-4.5 6-8.4 6S6.4 15.3 5.2 12C6.4 8.7 9.7 6 13.6 6Zm3.1 4.6a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Z" />
      <path d="M4.6 12 1.4 8.1v7.8z" />
    </>
  ),
  // Fish over flame: ikan bakar.
  grill: (
    <>
      <path d="M12 2.2c2.4 2.6 3.4 4.5 3.4 6.2a3.4 3.4 0 0 1-1.5 2.8c.1-1.3-.3-2.3-1.2-3.2.2 1.9-.5 3-1.9 4a3.9 3.9 0 0 1-2.2-3.3c0-2.2 1.3-4.2 3.4-6.5Z" />
      <path d="M3 14.4h18v2H3z" />
      <path d="M4.6 18h14.8l-1 2.4a1 1 0 0 1-.9.6H6.5a1 1 0 0 1-.9-.6z" />
    </>
  ),
  // A bowl with chopsticks laid across it.
  noodles: (
    <>
      <path d="M2.4 11h19.2a1 1 0 0 1 1 1.1A9.4 9.4 0 0 1 13.6 20h-3.2a9.4 9.4 0 0 1-9-7.9 1 1 0 0 1 1-1.1Z" />
      <path d="m14.4 2.6 1.7.7-3 7.1h-3.6l3-7Z" />
      <path d="m18.6 4.3 1.5 1.1-4 5.1h-2.4z" />
    </>
  ),
  // A wedge of layer cake.
  cake: (
    <>
      <path d="M4 8.6h16v3.2H4z" />
      <path d="M4 13.4h16v3.2H4z" />
      <path d="M2.6 18.2h18.8v2.4H2.6z" />
      <path d="M12 2.4a5.4 5.4 0 0 1 3.4 4.6H8.6A5.4 5.4 0 0 1 12 2.4Z" />
    </>
  ),
  donut: (
    <path d="M12 2.6a9.4 9.4 0 1 1 0 18.8 9.4 9.4 0 0 1 0-18.8Zm0 6.3a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Z" />
  ),
  // A loaf: domed top, flat base, three slashes cut across it.
  bread: (
    <path d="M12 4.4c5.6 0 9.6 3 9.6 7.4v6a1.8 1.8 0 0 1-1.8 1.8H4.2a1.8 1.8 0 0 1-1.8-1.8v-6c0-4.4 4-7.4 9.6-7.4Zm-3.7 3-2.4 4.4 1.7.9 2.4-4.4zm4.6 0-2.4 4.4 1.7.9 2.4-4.4zm4.6 0-2.4 4.4 1.7.9 2.4-4.4z" />
  ),
  // A cup with a leaf on it.
  matcha: (
    <>
      <path d="M4 9.4h13v5.4a4.4 4.4 0 0 1-4.4 4.4H8.4A4.4 4.4 0 0 1 4 14.8Z" />
      <path d="M17.6 10.8h1.6a2.6 2.6 0 0 1 0 5.2h-1.6v-2h1.6a.6.6 0 0 0 0-1.2h-1.6z" />
      <path d="M13.4 3c.9 2.1.2 4-2 5.2-.9-2 0-4 2-5.2Z" />
      <path d="M3.4 20.6h14.2v1.8H3.4z" />
    </>
  ),
  // A plate between a fork and a knife: food, where the food is not recorded.
  plate: (
    <>
      <path d="M12 4.4a7.2 7.2 0 1 1 0 14.4 7.2 7.2 0 0 1 0-14.4Zm0 2.4a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6Z" />
      <path d="M1.4 2.6h1.5v5.2H1.4zM3.9 2.6h1.5v5.2H3.9z" />
      <path d="M.6 8.4h6.1v2.1a2 2 0 0 1-1.7 2v8.9H2.3v-8.9a2 2 0 0 1-1.7-2z" />
      <path d="M18.9 2.6h1.3c1.4 0 2.3 1.5 2 3.3l-1 5.6h-3.6l-1-5.6c-.3-1.8.6-3.3 2-3.3Z" />
      <path d="M19 12.5h2.5v8.9H19z" />
    </>
  ),
  bed: (
    <>
      <path d="M2 7h2.6v7.4H2z" />
      <path d="M6.2 9.6h4.2a2 2 0 0 1 2 2v1.2H6.2z" />
      <path d="M2 14.4h20v3.2H2z" />
      <path d="M13.6 9.6H20a2 2 0 0 1 2 2v1.2h-8.4z" />
      <path d="M2 18.4h2.2v2.4H2zM19.8 18.4H22v2.4h-2.2z" />
    </>
  ),
  boat: (
    <>
      <path d="M11 3h2.2l4.4 5.6H11z" />
      <path d="M4.4 10.2h15.2l1.4 4H3z" />
      <path d="M1.8 16h20.4l-2 4a1 1 0 0 1-.9.6H4.7a1 1 0 0 1-.9-.6z" />
    </>
  ),
  // Sun over water.
  beach: (
    <>
      <circle cx="12" cy="8" r="4.6" />
      <path d="M1.6 15.4c2 0 2 1.6 4 1.6s2-1.6 4-1.6 2 1.6 4 1.6 2-1.6 4-1.6 2 1.6 4 1.6v2.2c-2 0-2-1.6-4-1.6s-2 1.6-4 1.6-2-1.6-4-1.6-2 1.6-4 1.6-2-1.6-4-1.6z" />
    </>
  ),
  dino: (
    <>
      <path d="M15.6 3c2.9 0 5 2.2 5 5 0 1.5-.6 2.6-1.8 3.6l-.4 3.2h-2.6l.3-2.2c-.7.2-1.4.3-2.1.3h-.5l-1.2 5.5H9.6l.9-4.2-2.7 4.2H5.2l3.1-5.2A6.2 6.2 0 0 1 3 7.4l3.2 1.3c.6-3.2 3.2-5.7 6.6-5.7ZM17 6.6a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
      <path d="M8.4 17.6h2.4v3.6H8.4zM14.6 17.6H17v3.6h-2.4z" />
    </>
  ),
  // A lotus: a spa, without a pair of hands.
  lotus: (
    <>
      <path d="M12 2.6c2.2 2.4 3.2 4.6 3.2 6.8 0 1.6-.6 3-1.8 4.4h-2.8c-1.2-1.4-1.8-2.8-1.8-4.4 0-2.2 1-4.4 3.2-6.8Z" />
      <path d="M2.2 9.2c3 .3 5 1.2 6.3 2.6 1 1 1.5 2.3 1.7 4l-1.9 2.1c-1.8-.4-3.1-1.1-4.2-2.3-1.4-1.6-2-3.6-1.9-6.4Z" />
      <path d="M21.8 9.2c.1 2.8-.5 4.8-1.9 6.4-1.1 1.2-2.4 1.9-4.2 2.3L13.8 15.8c.2-1.7.7-3 1.7-4 1.3-1.4 3.3-2.3 6.3-2.6Z" />
      <path d="M4 18.4h16v2.6H4z" />
    </>
  ),
  bag: (
    <>
      <path d="M12 1.6a4.4 4.4 0 0 1 4.4 4.4v1.4h-2.6V6a1.8 1.8 0 0 0-3.6 0v1.4H7.6V6A4.4 4.4 0 0 1 12 1.6Z" />
      <path d="M4.4 8.4h15.2l1.2 12.2a1 1 0 0 1-1 1.1H4.2a1 1 0 0 1-1-1.1z" />
    </>
  ),
  cart: (
    <>
      <path d="M1.4 3h3.9l.7 3h15.6a1 1 0 0 1 1 1.2l-1.4 6.4a1 1 0 0 1-1 .8H7.4l.4 2h11.4v2.4H6.8a1 1 0 0 1-1-.8L3.4 5.4H1.4z" />
      <circle cx="8.6" cy="20.4" r="1.8" />
      <circle cx="17.8" cy="20.4" r="1.8" />
    </>
  ),
  // A bottle with a pump: cosmetics.
  cosmetics: (
    <>
      <path d="M10.4 1.6h3.2v2.2h-3.2z" />
      <path d="M14.6 3.2h4.8v1.9h-3.1l-1 1.5h-2.2z" />
      <path d="M8 6.4h8v15a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z" />
      <path d="M8 10.6h8v3.2H8z" />
    </>
  ),
  // A rattle: the babyshop with a play area.
  toys: (
    <>
      <circle cx="8.4" cy="8.4" r="5.6" />
      <path d="m12.6 12.6 2.2-2.2 7 7a1.55 1.55 0 0 1-2.2 2.2z" />
      <circle cx="18.6" cy="5.4" r="2.6" />
    </>
  ),
  // Two spans on piers: Barelang.
  bridge: (
    <>
      <path d="M1.4 15.6C4.6 10.4 8.1 7.8 12 7.8s7.4 2.6 10.6 7.8l-2 1.3C17.8 12.4 15 10.3 12 10.3s-5.8 2.1-8.6 6.6z" />
      <path d="M2.2 12.4h1.9v8.4H2.2zM11.05 8.2h1.9v12.6h-1.9zM19.9 12.4h1.9v8.4h-1.9z" />
      <path d="M1.4 19.2h21.2v1.6H1.4z" />
    </>
  ),
  // Dome and minaret.
  mosque: (
    <>
      <path d="M12 1.6c.5 1.4.5 2.3 0 3.2 2.6 1.5 4 3.4 4 5.8H8c0-2.4 1.4-4.3 4-5.8-.5-.9-.5-1.8 0-3.2Z" />
      <path d="M7.6 11.6h8.8v9.6H7.6z" />
      <path d="M3 7.4c.9 1 1.3 2 1.3 3.2v10.6H1.7V10.6c0-1.2.4-2.2 1.3-3.2ZM21 7.4c.9 1 1.3 2 1.3 3.2v10.6h-2.6V10.6c0-1.2.4-2.2 1.3-3.2Z" />
      <path d="M10.6 14.8h2.8v6.4h-2.8z" fill="none" />
    </>
  ),
  // A signboard on a post.
  sign: (
    <>
      <path d="M2.6 3.4h14.6l3.6 3.9-3.6 3.9H2.6z" />
      <path d="M10.7 11.4h2.6v9.4h-2.6z" />
      <path d="M6.6 20h11.2v2.2H6.6z" />
    </>
  ),
};

export function PlaceGlyph({
  place,
  size = 22,
  className = '',
}: {
  place: Place;
  size?: number;
  className?: string;
}): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {PATHS[glyphFor(place)]}
    </svg>
  );
}
