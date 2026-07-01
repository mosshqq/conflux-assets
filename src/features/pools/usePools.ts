import { useAppState } from '../../app/useAppState';
import type { PoolConfig } from '../../domain/types';

export function usePools(): PoolConfig[] {
  const { customPools } = useAppState();
  return customPools;
}
