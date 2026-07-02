import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppStateProvider } from '../../app/AppState';
import type { PoolConfig } from '../../domain/types';
import { PoolManager } from './PoolManager';

const readPoolOverview = vi.hoisted(() => vi.fn());

vi.mock('../../infrastructure/conflux/client', () => ({
  readPoolOverview,
  validateStandardPool: vi.fn(),
}));

const pools: PoolConfig[] = [
  { id: 'one', name: '池 A', address: 'cfx:one', source: 'custom' },
  { id: 'two', name: '池 B', address: 'cfx:two', source: 'custom' },
];

function isBefore(left: HTMLElement, right: HTMLElement): boolean {
  return Boolean(left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe('PoolManager', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(
      'conflux-pos-dashboard:v1',
      JSON.stringify({ version: 1, bookmarks: [], customPools: pools }),
    );
    readPoolOverview.mockImplementation((pool: PoolConfig) =>
      Promise.resolve({
        pool,
        expectedApyBps: pool.id === 'one' ? 500n : 900n,
        totalStakedVotes: pool.id === 'one' ? 30n : 10n,
      }),
    );
  });

  it('shows APY and total stake and sorts without changing the saved order', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AppStateProvider>
          <PoolManager />
        </AppStateProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText('9.00%')).toBeInTheDocument());
    expect(screen.getByText('30,000 CFX')).toBeInTheDocument();
    expect(screen.getByText('10,000 CFX')).toBeInTheDocument();

    const poolA = screen.getByText('池 A');
    const poolB = screen.getByText('池 B');
    expect(isBefore(poolA, poolB)).toBe(true);

    await user.selectOptions(screen.getByLabelText('首页 PoS 池排序'), 'apy-desc');
    expect(isBefore(poolB, poolA)).toBe(true);

    await user.selectOptions(screen.getByLabelText('首页 PoS 池排序'), 'total-staked-desc');
    expect(isBefore(poolA, poolB)).toBe(true);
  });
});
