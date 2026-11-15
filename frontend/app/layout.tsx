import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Mona_Sans } from 'next/font/google';
import { PrefsProvider } from '@/lib/prefs';
import './globals.css';

// self-hosted at build time: no request to Google from the visitor's browser, no layout shift
const mona = Mona_Sans({ subsets: ['latin'], variable: '--font-mona', display: 'swap' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'ASTRA Health · Autonomous Space Health Intelligence',
  description:
    'Whole-body digital twin for astronauts, built on real NASA data from the Inspiration4 mission, space weather and on-device fatigue detection.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#03060E' };

// sets data-theme before first paint so a light-mode visitor never sees a dark flash
const THEME_BOOT =
  "try{var q=new URLSearchParams(location.search).get('theme');var t=q||localStorage.getItem('astra-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}";

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" data-theme="dark" className={`${mona.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <PrefsProvider>{children}</PrefsProvider>
      </body>
    </html>
  );
}
