import type { Category } from '@/data/trip';

export const CATEGORY_LABEL: Record<Category, string> = {
  hotel: 'Hotel',
  ferry: 'Ferry',
  land: 'Landmark',
  beach: 'Beach',
  food: 'Food',
  shop: 'Shop',
  spa: 'Spa',
  dino: 'Dinosaurs',
};

/**
 * Strokes on a 20-unit grid, matched to the tab icons. These read at 16px on a
 * phone in sunlight, which is the only test that matters.
 */
export function CategoryIcon({
  category,
  size = 16,
}: {
  category: Category;
  size?: number;
}): JSX.Element {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    'aria-hidden': true,
  } as const;

  switch (category) {
    case 'hotel':
      return (
        <svg {...common}>
          <path d="M3 16V6M3 10h9a4 4 0 0 1 4 4v2M3 16h14" />
          <circle cx="6.4" cy="7.4" r="1.3" />
        </svg>
      );
    case 'ferry':
      return (
        <svg {...common}>
          <path d="M3 13.5c1.4 0 1.4 1.4 2.8 1.4s1.4-1.4 2.8-1.4 1.4 1.4 2.8 1.4 1.4-1.4 2.8-1.4 1.4 1.4 2.8 1.4" />
          <path d="M4.5 11 6 6h8l1.5 5M10 6V3.5" />
        </svg>
      );
    case 'land':
      return (
        <svg {...common}>
          <path d="M2 15h16M4 15V9l6-4 6 4v6" />
          <path d="M8.2 15v-3.4h3.6V15" />
        </svg>
      );
    case 'beach':
      return (
        <svg {...common}>
          <path d="M2 15.5c1.5 0 1.5 1.2 3 1.2s1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2" />
          <circle cx="14" cy="5.5" r="2.6" />
          <path d="M3 13 9.5 6.5" />
        </svg>
      );
    case 'food':
      return (
        <svg {...common}>
          <path d="M5.5 3v6.5a2 2 0 0 0 4 0V3M7.5 9.5V17" />
          <path d="M14 17V3c-1.6.9-2.4 2.6-2.4 4.6S12.4 11 14 11" />
        </svg>
      );
    case 'shop':
      return (
        <svg {...common}>
          <path d="M4 7h12l-1 10H5L4 7Z" />
          <path d="M7.4 7V5.4a2.6 2.6 0 0 1 5.2 0V7" />
        </svg>
      );
    case 'spa':
      return (
        <svg {...common}>
          <path d="M10 17c0-4 2.6-7.5 6.5-8.4C16.5 12.6 14 17 10 17Z" />
          <path d="M10 17c0-4-2.6-7.5-6.5-8.4C3.5 12.6 6 17 10 17Z" />
        </svg>
      );
    case 'dino':
      return (
        <svg {...common}>
          <path d="M4 16c0-4 2-7 5-8 0-2.5 1.8-4 4-4 1.6 0 2.6.8 3 1.6L14 6.6" />
          <path d="M9 8c-2.5 1.5-3.5 4-3.5 8M12.5 12c1 1.5 1.4 2.8 1.4 4" />
          <circle cx="12.9" cy="4.6" r=".7" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
