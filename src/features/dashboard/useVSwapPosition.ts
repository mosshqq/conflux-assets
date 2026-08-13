import { useQuery } from '@tanstack/react-query';
import { PORTFOLIO_REFRESH_INTERVAL } from '../../config/network';
import type { ESpaceAddress } from '../../domain/types';
import {
  discoverVSwapPositions,
  readVSwapPosition,
} from '../../infrastructure/conflux/vswapClient';
import { vSwapDiscoveryQueryKey, vSwapPositionQueryKey } from './useVSwapPositions';

export function useVSwapPosition(address: ESpaceAddress | '', tokenId: bigint | null) {
  const discoveryQuery = useQuery({
    queryKey: vSwapDiscoveryQueryKey(address),
    queryFn: () => discoverVSwapPositions(address as ESpaceAddress),
    enabled: Boolean(address),
    refetchInterval: PORTFOLIO_REFRESH_INTERVAL,
  });
  const discovered = discoveryQuery.data?.find((position) => position.tokenId === tokenId);
  const positionQuery = useQuery({
    queryKey: vSwapPositionQueryKey(address, tokenId),
    queryFn: () => readVSwapPosition(discovered!),
    enabled: Boolean(address && tokenId !== null && discovered),
    refetchInterval: PORTFOLIO_REFRESH_INTERVAL,
  });

  return { discoveryQuery, positionQuery, discovered };
}
