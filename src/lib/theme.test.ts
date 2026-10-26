import { describe, expect, it } from 'vitest';
import { applyResolvedTheme, isThemePreference, resolveTheme } from './theme';

describe('resolveTheme', () => {
  it('follows the OS when set to auto', () => {
    expect(resolveTheme('auto', true)).toBe('dark');
    expect(resolveTheme('auto', false)).toBe('light');
  });

  it('honors an explicit preference over the OS', () => {
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });
});

describe('isThemePreference', () => {
  it('accepts only the three stored values', () => {
    expect(isThemePreference('auto')).toBe(true);
    expect(isThemePreference('light')).toBe(true);
    expect(isThemePreference('dark')).toBe(true);
    expect(isThemePreference('system')).toBe(false);
    expect(isThemePreference(undefined)).toBe(false);
  });
});

describe('applyResolvedTheme', () => {
  it('sets data-theme, color-scheme, and the theme-color meta', () => {
    let content = '#071B63';
    const meta = {
      setAttribute(_name: string, value: string) {
        content = value;
      },
    };
    const root = {
      dataset: {} as Record<string, string>,
      style: { colorScheme: '' },
      ownerDocument: { querySelector: () => meta },
    };

    applyResolvedTheme('dark', root as unknown as HTMLElement);
    expect(root.dataset.theme).toBe('dark');
    expect(root.style.colorScheme).toBe('dark');
    expect(content).toBe('#04103F');

    applyResolvedTheme('light', root as unknown as HTMLElement);
    expect(root.dataset.theme).toBe('light');
    expect(content).toBe('#071B63');
  });
});
