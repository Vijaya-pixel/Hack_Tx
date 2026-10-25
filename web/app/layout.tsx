import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { Shell } from './components/Shell';

// Poppins everywhere: 500 for headings, labels and the wordmark, 400 for body text.
const poppins = Poppins({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-poppins', display: 'swap' });

export const metadata: Metadata = {
  title: 'Round-Up · Concept for Toyota Financial Services',
  description: 'Round up everyday purchases and put the spare change toward your car loan principal.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable} suppressHydrationWarning>
      <head>
        {/* Sets the saved (or system) theme before paint so there is no flash. Constant text, no user input. */}
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}" }} />
      </head>
      <body className="antialiased"><Shell>{children}</Shell></body>
    </html>
  );
}
