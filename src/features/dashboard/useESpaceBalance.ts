import { useQuery } from '@tanstack/react-query';
import { PORTFOLIO_REFRESH_INTERVAL } from '../../config/network';
import { readESpaceBalance } from '../../infrastructure/conflux/espaceClient';

export function useESpaceBalance(address: string) {
  return useQuery({
    queryKey: ['espace-balance', address],
    queryFn: () => readESpaceBalance(address),
    enabled: Boolean(address),
    refetchInterval: PORTFOLIO_REFRESH_INTERVAL,
  });
}
