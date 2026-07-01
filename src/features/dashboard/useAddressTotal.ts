import { useQueries, useQuery } from '@tanstack/react-query';
import { PORTFOLIO_REFRESH_INTERVAL } from '../../config/network';
import { normalizeQueryAddress } from '../../domain/address';
import type { PoolConfig } from '../../domain/types';
import { readCfxBalance, readPoolPosition } from '../../infrastructure/conflux/client';
import { useESpaceBalance } from './useESpaceBalance';

export interface AddressTotal {
  totalDrip?: bigint;
  isPending: boolean;
  hasPartialError: boolean;
}

export function useAddressTotal(address: string, pools: PoolConfig[]): AddressTotal {
  let normalizedAddress = '';
  let isESpace = false;

  try {
    const normalized = normalizeQueryAddress(address);
    normalizedAddress = normalized.address;
    isESpace = normalized.space === 'espace';
  } catch {
    // Persisted data may have been edited outside the app. Keep invalid entries isolated.
  }

  const coreAddress = normalizedAddress && !isESpace ? normalizedAddress : '';
  const balanceQuery = useQuery({
    queryKey: ['balance', coreAddress],
    queryFn: () => readCfxBalance(coreAddress),
    enabled: Boolean(coreAddress),
    refetchInterval: PORTFOLIO_REFRESH_INTERVAL,
  });
  const positionQueries = useQueries({
    queries: pools.map((pool) => ({
      queryKey: ['position', coreAddress, pool.address],
      queryFn: () => readPoolPosition(pool, coreAddress),
      enabled: Boolean(coreAddress),
      refetchInterval: PORTFOLIO_REFRESH_INTERVAL,
    })),
  });
  const eSpaceBalanceQuery = useESpaceBalance(
    normalizedAddress && isESpace ? normalizedAddress : '',
  );

  if (!normalizedAddress) {
    return { isPending: false, hasPartialError: true };
  }

  if (isESpace) {
    return {
      totalDrip: eSpaceBalanceQuery.data,
      isPending: eSpaceBalanceQuery.isPending,
      hasPartialError: eSpaceBalanceQuery.isError,
    };
  }

  const positionsPending = positionQueries.some((query) => query.isPending);
  const claimableDrip = positionQueries.reduce(
    (total, query) => total + (query.data?.claimableDrip ?? 0n),
    0n,
  );

  return {
    totalDrip:
      balanceQuery.data === undefined || positionsPending
        ? undefined
        : balanceQuery.data + claimableDrip,
    isPending: balanceQuery.isPending || positionsPending,
    hasPartialError: balanceQuery.isError || positionQueries.some((query) => query.isError),
  };
}
