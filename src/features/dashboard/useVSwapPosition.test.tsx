import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ESPACE_NETWORK } from '../../config/network';
import type { VSwapDiscoveredPosition, VSwapPosition } from '../../domain/types';

const discoverVSwapPositions = vi.hoisted(() => vi.fn());
const readVSwapPosition = vi.hoisted(() => vi.fn());

vi.mock('../../infrastructure/conflux/vswapClient', () => ({
  discoverVSwapPositions,
  readVSwapPosition,
}));

import { useVSwapPosition } from './useVSwapPosition';
import { vSwapDiscoveryQueryKey, vSwapPositionQueryKey } from './useVSwapPositions';

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

function createQueryClient(staleTime = 0) {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime } },
  });
}

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useVSwapPosition', () => {
  beforeEach(() => vi.clearAllMocks());

  it('discovers positions before reading only the requested position', async () => {
    const requested = discovered[1];
    const position = { discovered: requested } as VSwapPosition;
    discoverVSwapPositions.mockResolvedValue(discovered);
    readVSwapPosition.mockResolvedValue(position);

    const { result } = renderHook(() => useVSwapPosition(ADDRESS, requested.tokenId), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.positionQuery.isSuccess).toBe(true));

    expect(result.current.discovered).toBe(requested);
    expect(result.current.positionQuery.data).toBe(position);
    expect(discoverVSwapPositions).toHaveBeenCalledOnce();
    expect(discoverVSwapPositions).toHaveBeenCalledWith(ADDRESS);
    expect(readVSwapPosition).toHaveBeenCalledOnce();
    expect(readVSwapPosition).toHaveBeenCalledWith(requested);
  });

  it('does not read a position when discovery does not contain the requested token', async () => {
    discoverVSwapPositions.mockResolvedValue(discovered);

    const { result } = renderHook(() => useVSwapPosition(ADDRESS, 3n), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.discoveryQuery.isSuccess).toBe(true));

    expect(result.current.discovered).toBeUndefined();
    expect(result.current.positionQuery.fetchStatus).toBe('idle');
    expect(readVSwapPosition).not.toHaveBeenCalled();
  });

  it('reuses discovery and position data cached under the list query keys', () => {
    const requested = discovered[1];
    const cachedPosition = { discovered: requested } as VSwapPosition;
    const queryClient = createQueryClient(Infinity);
    queryClient.setQueryData(vSwapDiscoveryQueryKey(ADDRESS), discovered);
    queryClient.setQueryData(vSwapPositionQueryKey(ADDRESS, requested.tokenId), cachedPosition);

    const { result } = renderHook(() => useVSwapPosition(ADDRESS, requested.tokenId), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.discoveryQuery.data).toBe(discovered);
    expect(result.current.discovered).toBe(requested);
    expect(result.current.positionQuery.data).toBe(cachedPosition);
    expect(discoverVSwapPositions).not.toHaveBeenCalled();
    expect(readVSwapPosition).not.toHaveBeenCalled();
  });

  it('keeps the eSpace chain ID in discovery and position cache keys', () => {
    expect(vSwapDiscoveryQueryKey(ADDRESS)).toEqual([
      'vswap-positions',
      ESPACE_NETWORK.chainId,
      ADDRESS,
    ]);
    expect(vSwapPositionQueryKey(ADDRESS, 2n)).toEqual([
      'vswap-position',
      ESPACE_NETWORK.chainId,
      ADDRESS,
      '2',
    ]);
  });
});
