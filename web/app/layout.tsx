import type { Metadata } from 'next';
import { Poppins, Press_Start_2P, Silkscreen } from 'next/font/google';
import './globals.css';
import { Shell } from './components/Shell';

// Poppins: all reading text and numbers (clear). Silkscreen: small labels. Press Start 2P: the wordmark and the hero headline.
const poppins = Poppins({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-poppins', display: 'swap' });
const silkscreen = Silkscreen({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-silkscreen', display: 'swap' });
const pressStart = Press_Start_2P({ subsets: ['latin'], weight: '400', variable: '--font-press-start', display: 'swap' });

export const metadata: Metadata = {
  title: 'RoundGear · Concept for Toyota Financial Services',
  description: 'Round up everyday purchases and put the spare change toward your car loan principal.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${silkscreen.variable} ${pressStart.variable}`} suppressHydrationWarning>
      <head>
        {/* Sets the saved (or system) theme before paint so there is no flash. Constant text, no user input. */}
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}" }} />
      </head>
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
