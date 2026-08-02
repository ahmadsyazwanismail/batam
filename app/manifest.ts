import type { MetadataRoute } from 'next';
import { TRIP } from '@/data/trip';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Batam Lines',
    short_name: 'Batam',
    description: `Batam, 21–25 August 2026. ${TRIP.travellers}.`,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F4F3EE',
    theme_color: '#D93F3F',
    lang: 'en',
    categories: ['travel', 'navigation'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Today', url: '/' },
      { name: 'Map', url: '/map' },
      { name: 'Places', url: '/places' },
    ],
  };
}
