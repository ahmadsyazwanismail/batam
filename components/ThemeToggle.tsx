'use client';

import { useEffect, useState } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_KEY = 'batam-theme';

/**
 * Runs before the first paint, inlined into the document head.
 *
 * Without it the page paints in whatever the CSS says, then React mounts and
 * corrects it — a white flash on the way into a dark app, which is the one
 * thing a dark mode must not do. Deliberately tiny and dependency-free,
 * because it blocks rendering.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})()`;

const LIGHT_HEX = '#F6F4EF';
const DARK_HEX = '#0F1613';

function apply(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);

  // Keep the browser chrome in step with the page it is framing.
  const resolved =
    choice === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : choice;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', resolved === 'dark' ? DARK_HEX : LIGHT_HEX);
}

/** Light → Dark → Auto → Light. */
const NEXT: Record<ThemeChoice, ThemeChoice> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

const LABEL: Record<ThemeChoice, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'Auto',
};

function Icon({ choice }: { choice: ThemeChoice }): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      {choice === 'light' && (
        <>
          <circle cx="12" cy="12" r="5" />
          <path d="M11 1.6h2v3.2h-2zM11 19.2h2v3.2h-2zM1.6 11h3.2v2H1.6zM19.2 11h3.2v2h-3.2zM4.4 5.8l1.4-1.4 2.3 2.3-1.4 1.4zM15.9 17.3l1.4-1.4 2.3 2.3-1.4 1.4zM4.4 18.2l2.3-2.3 1.4 1.4-2.3 2.3zM15.9 6.7l2.3-2.3 1.4 1.4-2.3 2.3z" />
        </>
      )}
      {choice === 'dark' && (
        // A crescent cut from one disc by another, so it stays solid at 20px.
        <path d="M21 14.2A9.3 9.3 0 0 1 9.1 2.6a9.6 9.6 0 1 0 11.9 11.6Z" />
      )}
      {choice === 'system' && (
        // A circle with one half filled — the standard "follow the system"
        // mark. Drawn as a ring plus a half-disc: two overlapping arcs merged
        // into an unreadable blob at 20px.
        <>
          <path
            fillRule="evenodd"
            d="M12 2.2a9.8 9.8 0 1 0 0 19.6 9.8 9.8 0 0 0 0-19.6Zm0 2.2a7.6 7.6 0 1 1 0 15.2 7.6 7.6 0 0 1 0-15.2Z"
          />
          <path d="M12 4.4a7.6 7.6 0 0 1 0 15.2Z" />
        </>
      )}
    </svg>
  );
}

/**
 * One icon, in the masthead, that cycles Light → Dark → Auto.
 *
 * It began as a three-button pill at the foot of the Today screen, which put a
 * setting in the middle of a trip plan and only on one screen. A single icon in
 * the header is on every screen, costs a corner rather than a section, and says
 * what it is now rather than offering three things you mostly do not want.
 *
 * Icon-only, so the state has to be carried by the label: the accessible name
 * says what the appearance currently is *and* what pressing will do, because
 * "Theme" alone tells a screen reader nothing.
 */
export function ThemeToggle(): JSX.Element {
  const [choice, setChoice] = useState<ThemeChoice | null>(null);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(THEME_KEY);
    } catch {
      // Private mode. The toggle still works for this session.
    }
    const initial: ThemeChoice =
      stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    setChoice(initial);
    apply(initial);
  }, []);

  // On "Auto", the OS can change under us — follow it without a reload.
  useEffect(() => {
    if (choice !== 'system') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (): void => apply('system');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [choice]);

  // Hold the space before the choice is known, so the masthead does not shift.
  if (choice === null) return <span className="block h-11 w-11" aria-hidden />;

  const next = NEXT[choice];
  const advance = (): void => {
    setChoice(next);
    apply(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Not remembering it is not a reason not to do it.
    }
  };

  return (
    <button
      type="button"
      onClick={advance}
      aria-label={`Appearance: ${LABEL[choice]}. Switch to ${LABEL[next]}.`}
      title={`Appearance: ${LABEL[choice]}`}
      className="tap -mr-2.5 flex items-center justify-center rounded-full text-muted transition-colors"
    >
      <Icon choice={choice} />
    </button>
  );
}
