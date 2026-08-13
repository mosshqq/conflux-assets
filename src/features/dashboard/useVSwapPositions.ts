import { useQueries, useQuery } from '@tanstack/react-query';
import { ESPACE_NETWORK, PORTFOLIO_REFRESH_INTERVAL } from '../../config/network';
import type { ESpaceAddress } from '../../domain/types';
import {
  discoverVSwapPositions,
  readVSwapPosition,
} from '../../infrastructure/conflux/vswapClient';

export function vSwapDiscoveryQueryKey(address: ESpaceAddress | '') {
  return ['vswap-positions', ESPACE_NETWORK.chainId, address] as const;
}

export function vSwapPositionQueryKey(address: ESpaceAddress | '', tokenId: bigint | null) {
  return ['vswap-position', ESPACE_NETWORK.chainId, address, tokenId?.toString() ?? ''] as const;
}

export function useVSwapPositions(address: ESpaceAddress | '') {
  const discoveryQuery = useQuery({
    queryKey: vSwapDiscoveryQueryKey(address),
    queryFn: () => discoverVSwapPositions(address as ESpaceAddress),
    enabled: Boolean(address),
    refetchInterval: PORTFOLIO_REFRESH_INTERVAL,
  });

  const positionQueries = useQueries({
    queries: (discoveryQuery.data ?? []).map((position) => ({
      queryKey: vSwapPositionQueryKey(address, position.tokenId),
      queryFn: () => readVSwapPosition(position),
      refetchInterval: PORTFOLIO_REFRESH_INTERVAL,
    })),
  });

  return { discoveryQuery, positionQueries };
}
