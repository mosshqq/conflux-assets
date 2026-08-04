import type { PoolPosition } from './types';

/** Selects non-zero rewards that meet the inclusive one-click claim threshold. */
export function selectClaimCandidates(
  positions: PoolPosition[],
  minimumClaimDrip: bigint,
): PoolPosition[] {
  if (minimumClaimDrip < 0n) throw new Error('最低领取收益不能为负数');
  return positions.filter(
    (position) => position.claimableDrip > 0n && position.claimableDrip >= minimumClaimDrip,
  );
}
