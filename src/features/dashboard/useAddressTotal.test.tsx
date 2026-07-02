import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PoolConfig, PoolPosition } from '../../domain/types';

const readCfxBalance = vi.hoisted(() => vi.fn());
const readPoolPosition = vi.hoisted(() => vi.fn());
const readESpaceBalance = vi.hoisted(() => vi.fn());

vi.mock('../../infrastructure/conflux/client', () => ({
  readCfxBalance,
  readCurrentBlock: vi.fn().mockResolvedValue(1n),
  readPoolPosition,
}));
vi.mock('../../infrastructure/conflux/espaceClient', () => ({ readESpaceBalance }));

import { useAddressTotal } from './useAddressTotal';

const CORE_ADDRESS = 'cfx:aajaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaej6bs8mvt';
const ESPACE_ADDRESS = '0x1000000000000000000000000000000000000001';
const pool: PoolConfig = {
  id: 'pool',
  name: 'Pool',
  address: 'cfx:acd0000000000000000000000000000000000000',
  source: 'custom',
};
const failingPool: PoolConfig = {
  id: 'failing-pool',
  name: 'Failing Pool',
  address: 'cfx:ace0000000000000000000000000000000000000',
  source: 'custom',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useAddressTotal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds the Core available balance and claimable rewards', async () => {
    readCfxBalance.mockResolvedValue(10n);
    readPoolPosition.mockResolvedValue({
      pool,
      expectedApyBps: 1290n,
      totalVotes: 0n,
      activeVotes: 0n,
      lockedVotes: 0n,
      pendingVotes: 0n,
      unlockedVotes: 0n,
      governanceLockedDrip: 0n,
      governanceUnlockBlock: 0n,
      claimableDrip: 3n,
      stakeLockQueue: [],
      unlockQueue: [],
    } satisfies PoolPosition);

    const { result } = renderHook(() => useAddressTotal(CORE_ADDRESS, [pool]), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.totalDrip).toBe(13n);
    expect(result.current.hasPartialError).toBe(false);
  });

  it('uses only the eSpace available balance', async () => {
    readESpaceBalance.mockResolvedValue(7n);

    const { result } = renderHook(() => useAddressTotal(ESPACE_ADDRESS, [pool]), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.totalDrip).toBe(7n);
    expect(readPoolPosition).not.toHaveBeenCalled();
  });

  it('keeps the Core total available when one pool fails', async () => {
    readCfxBalance.mockResolvedValue(10n);
    readPoolPosition.mockImplementation((candidate: PoolConfig) =>
      candidate.id === failingPool.id
        ? Promise.reject(new Error('RPC failed'))
        : Promise.resolve({
            pool,
            expectedApyBps: 1290n,
            totalVotes: 0n,
            activeVotes: 0n,
            lockedVotes: 0n,
            pendingVotes: 0n,
            unlockedVotes: 0n,
            governanceLockedDrip: 0n,
            governanceUnlockBlock: 0n,
            claimableDrip: 3n,
            stakeLockQueue: [],
            unlockQueue: [],
          } satisfies PoolPosition),
    );

    const { result } = renderHook(() => useAddressTotal(CORE_ADDRESS, [pool, failingPool]), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.totalDrip).toBe(13n);
    expect(result.current.hasPartialError).toBe(true);
  });
});
