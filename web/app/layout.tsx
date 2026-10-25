import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';

// Poppins everywhere: 500 for headings, labels and the wordmark, 400 for body text.
const poppins = Poppins({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-poppins', display: 'swap' });

export const metadata: Metadata = {
  title: 'Round-Up · Concept for Toyota Financial Services',
  description: 'Round up everyday purchases and put the spare change toward your car loan principal.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
