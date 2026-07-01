import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { PoolConfig, PoolPosition } from '../../domain/types';

const readPoolPosition = vi.hoisted(() => vi.fn());

vi.mock('../../infrastructure/conflux/client', () => ({
  readCfxBalance: vi.fn().mockResolvedValue(1n),
  readCurrentBlock: vi.fn().mockResolvedValue(2n),
  readPoolPosition,
}));

import { usePortfolio } from './usePortfolio';

const pools: PoolConfig[] = [
  { id: 'good', name: 'Good', address: 'cfx:good', source: 'custom' },
  { id: 'bad', name: 'Bad', address: 'cfx:bad', source: 'custom' },
];

const goodPosition: PoolPosition = {
  pool: pools[0],
  totalVotes: 1n,
  activeVotes: 1n,
  lockedVotes: 1n,
  pendingVotes: 0n,
  unlockedVotes: 0n,
  governanceLockedDrip: 0n,
  governanceUnlockBlock: 0n,
  claimableDrip: 0n,
  unlockQueue: [],
};

describe('usePortfolio', () => {
  it('keeps successful pool data when another pool fails', async () => {
    readPoolPosition.mockImplementation((pool: PoolConfig) =>
      pool.id === 'good' ? Promise.resolve(goodPosition) : Promise.reject(new Error('RPC failed')),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retryDelay: 0 } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => usePortfolio('cfx:user', pools, { retry: false }), {
      wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.positionQueries[0].isSuccess).toBe(true);
        expect(result.current.positionQueries[1].isError).toBe(true);
      },
      { timeout: 1_000 },
    );

    expect(result.current.positionQueries[0].data).toEqual(goodPosition);
    expect(result.current.balanceQuery.data).toBe(1n);
  });
});
