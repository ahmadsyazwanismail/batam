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
    ?.setAttribute('content', resolved === 'dark' ? '#17110C' : '#FBF3E6');
}

const OPTIONS: readonly { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Auto' },
];

/**
 * Three states, not two: a phone that switches itself at dusk should be allowed
 * to, and "Auto" is the default rather than an afterthought.
 */
export function ThemeToggle(): JSX.Element | null {
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

  if (choice === null) return null;

  const choose = (next: ThemeChoice): void => {
    setChoice(next);
    apply(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Not remembering it is not a reason not to do it.
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className="inline-flex rounded-full border border-hairline border-rule bg-card p-0.5"
    >
      {OPTIONS.map((option) => {
        const on = choice === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => choose(option.value)}
            className="tap rounded-full px-3 py-1.5 text-eyebrow font-bold uppercase tracking-[0.1em] transition-colors"
            style={
              on
                ? { backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }
                : { color: 'var(--muted)' }
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
