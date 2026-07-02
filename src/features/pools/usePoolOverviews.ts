import { useQueries } from '@tanstack/react-query';
import { PORTFOLIO_REFRESH_INTERVAL } from '../../config/network';
import type { PoolConfig } from '../../domain/types';
import { readPoolOverview } from '../../infrastructure/conflux/client';

export function usePoolOverviews(pools: PoolConfig[], options: { retry?: boolean | number } = {}) {
  return useQueries({
    queries: pools.map((pool) => ({
      queryKey: ['pool-overview', pool.address],
      queryFn: () => readPoolOverview(pool),
      retry: options.retry ?? 1,
      refetchInterval: PORTFOLIO_REFRESH_INTERVAL,
    })),
  });
}
