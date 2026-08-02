import type { Metadata, Viewport } from 'next';
import { Barlow_Condensed, Inter } from 'next/font/google';
import './globals.css';
import { TabBar } from '@/components/TabBar';
import { ServiceWorker } from '@/components/ServiceWorker';
import { InstallPrompt } from '@/components/InstallPrompt';
import { Splash } from '@/components/Splash';
import { TRIP } from '@/data/trip';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

/**
 * The signboard face. Condensed, set large and uppercase, the way a warung
 * paints its own name on the shutter.
 *
 * Self-hosted by next/font rather than reached for in a system stack: the
 * mockup used Avenir Next Condensed, which only exists on Apple devices, so
 * anyone else would have silently got Arial Narrow or worse. This ships with
 * the app and works offline like everything else here.
 */
const signboard = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-signboard',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Batam',
  description: `Batam, 21–25 August 2026. ${TRIP.travellers}.`,
  applicationName: 'Batam',
  appleWebApp: {
    capable: true,
    title: 'Batam',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // The map pans and zooms; the rest of the app must still be zoomable, so
  // user-scalable is left alone.
  viewportFit: 'cover',
  themeColor: '#C2410C',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en" className={`${inter.variable} ${signboard.variable}`}>
      <body>
        <ServiceWorker />
        <Splash />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:bg-ink focus:px-3 focus:py-2 focus:text-card"
        >
          Skip to content
        </a>
        <div id="main">{children}</div>
        <TabBar />
        <InstallPrompt />
      </body>
    </html>
  );
}
