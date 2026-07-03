import { useQueries, useQuery } from '@tanstack/react-query';
import { PORTFOLIO_REFRESH_INTERVAL } from '../../config/network';
import type { ESpaceAddress } from '../../domain/types';
import {
  discoverVSwapPositions,
  readVSwapPosition,
} from '../../infrastructure/conflux/vswapClient';

export function useVSwapPositions(address: ESpaceAddress | '') {
  const discoveryQuery = useQuery({
    queryKey: ['vswap-positions', address],
    queryFn: () => discoverVSwapPositions(address as ESpaceAddress),
    enabled: Boolean(address),
    refetchInterval: PORTFOLIO_REFRESH_INTERVAL,
  });

  const positionQueries = useQueries({
    queries: (discoveryQuery.data ?? []).map((position) => ({
      queryKey: ['vswap-position', address, position.tokenId.toString()],
      queryFn: () => readVSwapPosition(position),
      refetchInterval: PORTFOLIO_REFRESH_INTERVAL,
    })),
  });

  return { discoveryQuery, positionQueries };
}
