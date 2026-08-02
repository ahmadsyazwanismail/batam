/**
 * The mark.
 *
 * A bowl, seen from the side: rim, body, and a mound of something in it. The
 * previous mark was an interchange roundel with a line running through it,
 * which stopped being true the moment the app stopped being about lines.
 *
 * Four shapes, three colours, no strokes and no gradients — because the only
 * test a mark like this has to pass is a browser tab and a home screen, and it
 * has to still mean something at sixteen pixels. The ink disc is not
 * decoration: without it the mark disappears against a dark tab strip.
 */
export function LogoMark({
  size = 32,
  colour = 'var(--accent)',
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
      <circle cx="32" cy="32" r="32" fill="var(--ink, #2A1A10)" />
      {/* What is in it, nested into the rim rather than floating above it. */}
      <path d="M20 30.5a12 12 0 0 1 24 0z" fill={colour} />
      <rect x="9" y="30" width="46" height="6.5" rx="3.25" fill="var(--paper, #FBF3E6)" />
      <path d="M15 37.5h34a17 17 0 0 1-34 0z" fill="var(--paper, #FBF3E6)" />
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
