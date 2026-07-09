import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppStateProvider } from '../app/AppState';
import { CORE_MAINNET } from '../config/network';
import { createPersistedStateExport } from '../infrastructure/storage/localState';
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

  it('imports saved local data from a JSON file', async () => {
    const user = userEvent.setup();
    const exported = createPersistedStateExport(
      {
        version: 1,
        bookmarks: [
          {
            address: 'cfx:aajaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaej6bs8mvt',
            alias: '导入地址',
            createdAt: '2026-07-09T00:00:00.000Z',
          },
        ],
        customPools: [],
        homePoolSort: 'favorite',
        positionPoolSort: 'favorite',
      },
      CORE_MAINNET,
    );

    renderPage();

    await user.upload(
      screen.getByLabelText('导入本地数据文件'),
      new File([JSON.stringify(exported)], 'backup.json', { type: 'application/json' }),
    );

    expect(await screen.findByText('导入地址')).toBeInTheDocument();
    expect(screen.getByText('已导入 1 个地址和 0 个 PoS 池。')).toBeInTheDocument();
    await waitFor(() => {
      expect(window.localStorage.getItem('conflux-pos-dashboard:v1')).toContain('导入地址');
    });
  });
});
