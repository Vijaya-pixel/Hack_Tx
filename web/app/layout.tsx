import type { Metadata } from 'next';
import './globals.css';
import { Shell } from './components/Shell';

export const metadata: Metadata = {
  title: 'Round-Up · Concept for Toyota Financial Services',
  description: 'Round up everyday purchases and put the spare change toward your car loan principal.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased"><Shell>{children}</Shell></body>
    </html>
  );
}
