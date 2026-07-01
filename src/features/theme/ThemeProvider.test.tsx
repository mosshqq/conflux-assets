import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';
import { THEME_STORAGE_KEY } from './theme';

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.style.colorScheme = '';
  });

  it('cycles theme modes and persists explicit light and dark themes', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const themeButton = screen.getByRole('button', { name: /主题：跟随系统/ });
    await user.click(themeButton);
    await waitFor(() => expect(document.documentElement).toHaveClass('light'));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    await user.click(screen.getByRole('button', { name: /主题：明亮/ }));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    await user.click(screen.getByRole('button', { name: /主题：暗黑/ }));
    await waitFor(() => expect(document.documentElement).not.toHaveClass('dark'));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });
});
