export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'conflux-assets:theme';

export function readThemePreference(storage: Storage = window.localStorage): ThemePreference {
  try {
    const value = storage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function writeThemePreference(
  preference: ThemePreference,
  storage: Storage = window.localStorage,
): void {
  try {
    storage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Theme persistence is optional; the active session can still switch themes.
  }
}

export function resolveTheme(
  preference: ThemePreference,
  prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches,
): ResolvedTheme {
  return preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;
}

export function applyTheme(
  preference: ThemePreference,
  root: HTMLElement = document.documentElement,
  prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches,
): ResolvedTheme {
  const resolved = resolveTheme(preference, prefersDark);
  root.classList.toggle('light', resolved === 'light');
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  return resolved;
}

export function initializeTheme(): void {
  if (typeof window === 'undefined') return;
  applyTheme(readThemePreference());
}
