/**
 * The five screens, in thumb order.
 *
 * The order is the priority order the app was designed around: where am I,
 * what is near me, what is the plan, what is it called, what does it cost.
 */
export interface Tab {
  readonly href: string;
  readonly label: string;
  readonly icon: 'today' | 'map' | 'days' | 'places' | 'costs';
}

export const TABS: readonly Tab[] = [
  { href: '/', label: 'Today', icon: 'today' },
  { href: '/map', label: 'Map', icon: 'map' },
  { href: '/days', label: 'Days', icon: 'days' },
  { href: '/places', label: 'Places', icon: 'places' },
  { href: '/costs', label: 'Costs', icon: 'costs' },
];

export function tabIndex(pathname: string): number {
  const exact = TABS.findIndex((t) => t.href === pathname);
  if (exact !== -1) return exact;
  // /days/3 still lights the Lines tab.
  const nested = TABS.findIndex((t) => t.href !== '/' && pathname.startsWith(t.href));
  return nested === -1 ? 0 : nested;
}
