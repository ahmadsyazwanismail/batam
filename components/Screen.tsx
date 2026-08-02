import type { ReactNode } from 'react';
import { Logo } from './Logo';

/**
 * The one column every screen lives in.
 *
 * Bottom padding clears the tab bar plus the home indicator, so the last row of
 * a long list is never trapped under the chrome.
 */
export function Screen({
  eyebrow,
  title,
  trailing,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="mx-auto min-h-dvh max-w-app pb-[calc(theme(spacing.tabbar)+env(safe-area-inset-bottom)+1.5rem)]">
      <header className="px-gutter pb-5 pt-6">
        {/* The lockup sits above every screen, small and constant — the way a
            masthead does. It is the only place the wordmark appears. */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <Logo size={26} />
          <span className="eyebrow text-right">{eyebrow}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-display font-bold">{title}</h1>
          </div>
          {trailing ? <div className="shrink-0 pt-1">{trailing}</div> : null}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

/** A hairline-ruled block. Square corners, no shadow, no drama. */
export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={`border border-hairline border-rule bg-card ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeading({ children }: { children: ReactNode }): JSX.Element {
  return (
    <h2 className="eyebrow px-gutter pb-2 pt-7 first:pt-0">{children}</h2>
  );
}
