'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { TABS, tabIndex } from '@/lib/nav';
import { SPRING } from '@/lib/motion';
import { TabIcon } from './TabIcon';

/**
 * Bottom tab bar. Thumb-reachable, 44px minimum targets, and it sits above the
 * home indicator on an iPhone rather than under it.
 */
export function TabBar(): JSX.Element {
  const pathname = usePathname();
  const active = tabIndex(pathname);

  return (
    <nav
      aria-label="Screens"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline border-rule bg-card/95 backdrop-blur-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-app">
        {TABS.map((tab, i) => {
          const isActive = i === active;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={isActive ? 'page' : undefined}
                className="tap relative flex h-[4.25rem] flex-col items-center justify-center gap-1 text-muted transition-colors"
                style={isActive ? { color: 'var(--accent)' } : undefined}
              >
                {isActive && (
                  <motion.span
                    layoutId="tab-indicator"
                    transition={SPRING}
                    aria-hidden
                    className="absolute inset-x-3 top-0 h-[3px]"
                    style={{ backgroundColor: 'var(--accent)' }}
                  />
                )}
                <TabIcon name={tab.icon} />
                <span className="text-eyebrow font-semibold uppercase tracking-[0.1em]">
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
