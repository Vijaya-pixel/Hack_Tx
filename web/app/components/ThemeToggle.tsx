'use client';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

// Light/dark switch. The class on <html> is set before first paint by a script in layout.tsx; this just flips and saves it.
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => { setDark(document.documentElement.classList.contains('dark')); }, []);

  function flip() {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch { /* private mode: still works for this visit */ }
    setDark(next);
  }

  if (dark === null) return <span className="h-9 w-[68px]" aria-hidden />;
  return (
    <button role="switch" aria-checked={dark} aria-label="Dark mode" onClick={flip}
      className={`relative h-9 w-[68px] shrink-0 rounded-full border transition-colors ${dark ? 'border-[#2d2d31] bg-[#1c1c1e]' : 'border-line bg-soft'}`}>
      <span className={`absolute top-[3px] grid h-[28px] w-[28px] place-items-center rounded-full transition-all duration-300 ${dark ? 'left-[35px] bg-[#3c3d42] text-white' : 'left-[3px] bg-white text-ink shadow'}`}>
        {dark ? <Moon size={15} strokeWidth={0} fill="currentColor" /> : <Sun size={16} strokeWidth={1.75} />}
      </span>
    </button>
  );
}
