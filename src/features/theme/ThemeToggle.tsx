import type { ChangeEvent } from 'react';
import { useTheme } from './useTheme';
import type { ThemePreference } from './theme';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    setTheme(event.target.value as ThemePreference);
  }

  return (
    <select aria-label="主题" value={theme} onChange={handleChange} className="theme-select">
      <option value="system">跟随系统</option>
      <option value="light">明亮</option>
      <option value="dark">暗黑</option>
    </select>
  );
}
