import type { Metadata } from 'next';
import { Pixelify_Sans, Poppins, Press_Start_2P, Silkscreen } from 'next/font/google';
import './globals.css';

// Pixelify Sans: display, headlines, body. Poppins: longer copy. Silkscreen: small labels. Press Start 2P: the wordmark.
const pixelify = Pixelify_Sans({ subsets: ['latin'], variable: '--font-pixelify', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-poppins', display: 'swap' });
const silkscreen = Silkscreen({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-silkscreen', display: 'swap' });
const pressStart = Press_Start_2P({ subsets: ['latin'], weight: '400', variable: '--font-press-start', display: 'swap' });

export const metadata: Metadata = {
  title: 'Round-Up · Concept for Toyota Financial Services',
  description: 'Round up everyday purchases and put the spare change toward your car loan principal.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixelify.variable} ${poppins.variable} ${silkscreen.variable} ${pressStart.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
