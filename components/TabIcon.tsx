import type { Tab } from '@/lib/nav';

/**
 * Transit-signage icons: strokes on a grid, no fills, no rounded caps except
 * where a single dot needs one.
 */
export function TabIcon({ name }: { name: Tab['icon'] }): JSX.Element {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 22 22',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    'aria-hidden': true,
  } as const;

  switch (name) {
    case 'today':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7.2" />
          <path d="M11 6.4V11l3.2 2" strokeLinecap="round" />
        </svg>
      );
    case 'map':
      return (
        <svg {...common}>
          <path d="M2.8 5.6 8 3.4v13L2.8 18.6zM8 3.4l6 2.2v13L8 16.4zM14 5.6l5.2-2.2v13L14 18.6z" />
        </svg>
      );
    case 'days':
      // A calendar with four marks — the four courses.
      return (
        <svg {...common}>
          <rect x="3.2" y="4.6" width="15.6" height="14" rx="1" />
          <path d="M3.2 8.6h15.6M7.4 3.2v2.8M14.6 3.2v2.8" />
          <path d="M7 12h2M13 12h2M7 15.4h2M13 15.4h2" strokeLinecap="round" />
        </svg>
      );
    case 'places':
      return (
        <svg {...common}>
          <path d="M11 19.2s6-5.1 6-9.4a6 6 0 1 0-12 0c0 4.3 6 9.4 6 9.4Z" />
          <circle cx="11" cy="9.6" r="2.1" />
        </svg>
      );
    case 'costs':
      return (
        <svg {...common}>
          <rect x="3.2" y="5.4" width="15.6" height="11.2" />
          <path d="M3.2 9.2h15.6" />
        </svg>
      );
  }
}
