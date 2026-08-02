import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TabBar } from '@/components/TabBar';
import { LineTheme } from '@/components/LineTheme';
import { ServiceWorker } from '@/components/ServiceWorker';
import { InstallPrompt } from '@/components/InstallPrompt';
import { Splash } from '@/components/Splash';
import { TRIP } from '@/data/trip';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Batam Lines',
  description: `Batam, 21–25 August 2026. ${TRIP.travellers}.`,
  applicationName: 'Batam Lines',
  appleWebApp: {
    capable: true,
    title: 'Batam Lines',
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
  themeColor: '#D93F3F',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <LineTheme />
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
