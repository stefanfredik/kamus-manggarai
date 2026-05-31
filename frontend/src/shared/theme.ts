import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'kamus-theme';

/** Resolve the theme that should apply on first paint. */
export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Apply the theme class to <html> and persist the choice. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  window.localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * Hook for reading and toggling the color theme. State is shared via the
 * `dark` class on <html>, so it stays consistent even if the component that
 * owns the toggle unmounts.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light',
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Follow OS changes only when the user hasn't made an explicit choice.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return {
    theme,
    isDark: theme === 'dark',
    toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    setTheme,
  };
}
