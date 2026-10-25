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
      className={`relative h-9 w-[68px] shrink-0 rounded-full border-[3px] border-[#e9e4d6] transition-colors ${dark ? 'bg-[#1c1c1e]' : 'bg-[#cfc8b6]'}`}>
      <span className={`absolute top-[3px] grid h-[24px] w-[24px] place-items-center rounded-full transition-all duration-300 ${dark ? 'left-[35px] bg-[#3c3d42] text-white' : 'left-[3px] bg-white text-[#14141a] shadow'}`}>
        {dark ? <Moon size={14} strokeWidth={0} fill="currentColor" /> : <Sun size={15} strokeWidth={2} />}
      </span>
    </button>
  );
}
