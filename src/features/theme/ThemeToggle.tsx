import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from './useTheme';

const themeOptions = [
  { value: 'system', label: '跟随系统', Icon: Monitor },
  { value: 'light', label: '明亮', Icon: Sun },
  { value: 'dark', label: '暗黑', Icon: Moon },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const currentIndex = themeOptions.findIndex((option) => option.value === theme);
  const current = themeOptions[currentIndex];
  const next = themeOptions[(currentIndex + 1) % themeOptions.length];
  const Icon = current.Icon;

  return (
    <button
      type="button"
      aria-label={`主题：${current.label}；点击切换为${next.label}`}
      title={`当前主题：${current.label}；点击切换为${next.label}`}
      onClick={() => setTheme(next.value)}
      className="theme-toggle"
    >
      <Icon aria-hidden="true" size={18} strokeWidth={2} />
    </button>
  );
}
