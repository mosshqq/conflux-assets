import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppStateProvider } from '../app/AppState';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  beforeEach(() => window.localStorage.clear());

  function renderPage() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AppStateProvider>
            <HomePage />
          </AppStateProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('validates Conflux mainnet addresses before navigation', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Conflux 地址'), '0x1234');
    await user.click(screen.getByRole('button', { name: '查询资产' }));
    expect(screen.getByText('eSpace 地址必须是 0x 开头的 20 字节十六进制地址')).toBeInTheDocument();
  });

  it('starts with no saved pools', () => {
    renderPage();
    expect(screen.getByText('已收藏 0 个')).toBeInTheDocument();
  });
});
