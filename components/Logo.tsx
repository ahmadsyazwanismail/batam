/**
 * The mark.
 *
 * A bowl, seen from the side: rim, body, and a mound of something in it. The
 * previous mark was an interchange roundel with a line running through it,
 * which stopped being true the moment the app stopped being about lines.
 *
 * Four shapes, three colours, no strokes and no gradients — because the only
 * test a mark like this has to pass is a browser tab and a home screen, and it
 * has to still mean something at sixteen pixels. The dark disc is not
 * decoration: without it the mark disappears against a dark tab strip.
 *
 * Its colours are fixed rather than taken from the theme. Painting the disc
 * with `--ink` and the bowl with `--paper` meant the mark inverted in dark
 * mode: a pale disc with the bowl punched out of it as a hole, which read as a
 * different logo rather than the same one at night. A brand mark should look
 * like itself in both. The disc keeps its own deep green so it still separates
 * from the dark ground, and the app icon in app/icon.svg carries the same
 * values.
 */
const DISC = '#132019';
const BOWL = '#F4F3EC';
export function LogoMark({
  size = 32,
  colour = '#D8622F',
  className = '',
}: {
  size?: number;
  colour?: string;
  className?: string;
}): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Batam"
    >
      <circle cx="32" cy="32" r="32" fill={DISC} />
      {/* What is in it, nested into the rim rather than floating above it. */}
      <path d="M20 30.5a12 12 0 0 1 24 0z" fill={colour} />
      <rect x="9" y="30" width="46" height="6.5" rx="3.25" fill={BOWL} />
      <path d="M15 37.5h34a17 17 0 0 1-34 0z" fill={BOWL} />
    </svg>
  );
}

/**
 * Mark plus wordmark. Uppercase, widely tracked, weighted to sit optically
 * level with the disc rather than mathematically level with it.
 */
export function Logo({
  size = 28,
  className = '',
}: {
  size?: number;
  className?: string;
}): JSX.Element {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span
        className="signboard leading-none tracking-[0.06em]"
        style={{ fontSize: size * 0.62 }}
      >
        Batam
      </span>
    </span>
  );
}
