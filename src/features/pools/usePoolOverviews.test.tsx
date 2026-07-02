import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { PoolConfig, PoolOverview } from '../../domain/types';

const readPoolOverview = vi.hoisted(() => vi.fn());

vi.mock('../../infrastructure/conflux/client', () => ({
  readPoolOverview,
}));

import { usePoolOverviews } from './usePoolOverviews';

const pools: PoolConfig[] = [
  { id: 'good', name: 'Good', address: 'cfx:good', source: 'custom' },
  { id: 'bad', name: 'Bad', address: 'cfx:bad', source: 'custom' },
];

const goodOverview: PoolOverview = {
  pool: pools[0],
  expectedApyBps: 1290n,
  totalStakedVotes: 10n,
};

describe('usePoolOverviews', () => {
  it('keeps successful pool data when another pool fails', async () => {
    readPoolOverview.mockImplementation((pool: PoolConfig) =>
      pool.id === 'good' ? Promise.resolve(goodOverview) : Promise.reject(new Error('RPC failed')),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retryDelay: 0 } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => usePoolOverviews(pools, { retry: false }), { wrapper });

    await waitFor(
      () => {
        expect(result.current[0].isSuccess).toBe(true);
        expect(result.current[1].isError).toBe(true);
      },
      { timeout: 1_000 },
    );

    expect(result.current[0].data).toEqual(goodOverview);
  });
});
