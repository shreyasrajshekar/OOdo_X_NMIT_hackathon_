'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [ripples, setRipples] = useState<number[]>([]);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggle = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    // Add ripple animation
    const newRipple = Date.now();
    setRipples((prev) => [...prev, newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter(r => r !== newRipple));
    }, 600);
  };

  return (
    <button 
      onClick={toggle}
      className="relative flex h-9 w-9 items-center justify-center rounded-pill border border-line bg-paper text-ink/70 hover:text-primary hover:bg-line/20 transition-colors"
      aria-label="Toggle dark mode"
      suppressHydrationWarning
    >
      {ripples.map((key) => (
        <span 
          key={key} 
          className="absolute inset-[-8px] rounded-full bg-primary/30 animate-ping pointer-events-none"
          style={{ animationDuration: '0.6s', animationIterationCount: 1 }}
        />
      ))}
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
