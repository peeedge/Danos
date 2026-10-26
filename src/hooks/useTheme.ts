import { useEffect, useState } from 'react';
import { applyResolvedTheme, prefersDark, resolveTheme, type ResolvedTheme } from '../lib/theme';
import type { ThemePreference } from '../types';

function getSystemDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return prefersDark(window.matchMedia('(prefers-color-scheme: dark)'));
}

/** Resolves the user's theme preference and keeps `document.documentElement` in sync. */
export function useTheme(preference: ThemePreference): ResolvedTheme {
  const [systemDark, setSystemDark] = useState(getSystemDark);
  const resolved = resolveTheme(preference, systemDark);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(prefersDark(media));
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    applyResolvedTheme(resolved);
  }, [resolved]);

  return resolved;
}
