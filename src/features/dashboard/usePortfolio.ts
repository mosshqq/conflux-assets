import { useQueries, useQuery } from '@tanstack/react-query';
import { PORTFOLIO_REFRESH_INTERVAL } from '../../config/network';
import {
  readCfxBalance,
  readCurrentBlock,
  readPoolPosition,
} from '../../infrastructure/conflux/client';
import type { PoolConfig } from '../../domain/types';

export function usePortfolio(
  address: string,
  pools: PoolConfig[],
  options: { retry?: boolean | number } = {},
) {
  const balanceQuery = useQuery({
    queryKey: ['balance', address],
    queryFn: () => readCfxBalance(address),
    enabled: Boolean(address),
    refetchInterval: PORTFOLIO_REFRESH_INTERVAL,
  });

  const blockQuery = useQuery({
    queryKey: ['current-block'],
    queryFn: readCurrentBlock,
    enabled: Boolean(address),
    refetchInterval: PORTFOLIO_REFRESH_INTERVAL,
  });

  const positionQueries = useQueries({
    queries: pools.map((pool) => ({
      queryKey: ['position', address, pool.address],
      queryFn: () => readPoolPosition(pool, address),
      enabled: Boolean(address),
      retry: options.retry ?? 1,
      refetchInterval: PORTFOLIO_REFRESH_INTERVAL,
    })),
  });

  return { balanceQuery, blockQuery, positionQueries };
}
