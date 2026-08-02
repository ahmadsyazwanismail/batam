/**
 * The mark.
 *
 * An interchange, reduced: an ink roundel with a paper spine running through
 * it and a single station on the line. It is the strip map at 16 pixels, which
 * is the only test a mark like this has to pass — it has to survive a browser
 * tab and a home screen, and it has to still mean something there.
 *
 * Three colours, four shapes, no gradients and no strokes under a pixel. The
 * station dot is the only place the line colour appears, so the mark changes
 * with the day exactly like everything else does.
 */
export function LogoMark({
  size = 32,
  colour = 'var(--line)',
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
      aria-label="Batam Lines"
    >
      <circle cx="32" cy="32" r="32" fill="var(--ink, #16181C)" />
      {/* The spine, drawn as a capsule so it reads as a line rather than a bar. */}
      <rect x="26" y="8" width="12" height="48" rx="6" fill="var(--paper, #F4F3EE)" />
      <circle cx="32" cy="32" r="9" fill="var(--ink, #16181C)" />
      <circle cx="32" cy="32" r="5.5" fill={colour} />
    </svg>
  );
}

/**
 * Mark plus wordmark. Uppercase, widely tracked, weighted to sit optically
 * level with the roundel rather than mathematically level with it.
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
      <span className="flex flex-col leading-none">
        <span
          className="font-bold uppercase tracking-[0.14em]"
          style={{ fontSize: size * 0.42 }}
        >
          Batam
        </span>
        <span
          className="mt-[0.15em] font-semibold uppercase tracking-[0.28em] text-muted"
          style={{ fontSize: size * 0.3 }}
        >
          Lines
        </span>
      </span>
    </span>
  );
}
