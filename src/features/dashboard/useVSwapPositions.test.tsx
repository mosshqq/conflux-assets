import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VSwapDiscoveredPosition, VSwapPosition } from '../../domain/types';

const discoverVSwapPositions = vi.hoisted(() => vi.fn());
const readVSwapPosition = vi.hoisted(() => vi.fn());

vi.mock('../../infrastructure/conflux/vswapClient', () => ({
  discoverVSwapPositions,
  readVSwapPosition,
}));

import { useVSwapPositions } from './useVSwapPositions';

const ADDRESS = '0x1000000000000000000000000000000000000001';
const discovered: VSwapDiscoveredPosition[] = [
  {
    tokenId: 1n,
    owner: ADDRESS,
    poolAddress: '0x2000000000000000000000000000000000000002',
  },
  {
    tokenId: 2n,
    owner: ADDRESS,
    poolAddress: '0x3000000000000000000000000000000000000003',
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useVSwapPositions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('discovers positions before starting isolated position queries', async () => {
    discoverVSwapPositions.mockResolvedValue(discovered);
    readVSwapPosition.mockImplementation((position: VSwapDiscoveredPosition) =>
      position.tokenId === 1n
        ? Promise.resolve({ discovered: position } as VSwapPosition)
        : Promise.reject(new Error('position failed')),
    );

    const { result } = renderHook(() => useVSwapPositions(ADDRESS), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.positionQueries).toHaveLength(2));
    await waitFor(() =>
      expect(result.current.positionQueries.map((query) => query.status)).toEqual([
        'success',
        'error',
      ]),
    );
    expect(discoverVSwapPositions).toHaveBeenCalledWith(ADDRESS);
    expect(readVSwapPosition).toHaveBeenCalledTimes(2);
  });

  it('does not query when the eSpace address is disabled', () => {
    const { result } = renderHook(() => useVSwapPositions(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.positionQueries).toHaveLength(0);
    expect(discoverVSwapPositions).not.toHaveBeenCalled();
  });
});
