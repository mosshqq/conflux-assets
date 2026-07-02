import type { PoolPosition, PortfolioSummary } from './types';
import { votesToDrip } from './money';

export function aggregatePositions(positions: PoolPosition[]): PortfolioSummary {
  return positions.reduce<PortfolioSummary>(
    (summary, position) => {
      const activeDrip = votesToDrip(position.activeVotes);
      const pendingDrip = votesToDrip(position.pendingVotes);
      const unlockedDrip = votesToDrip(position.unlockedVotes);
      const principalDrip = activeDrip + pendingDrip + unlockedDrip;

      return {
        activeDrip: summary.activeDrip + activeDrip,
        pendingDrip: summary.pendingDrip + pendingDrip,
        unlockedDrip: summary.unlockedDrip + unlockedDrip,
        claimableDrip: summary.claimableDrip + position.claimableDrip,
        principalDrip: summary.principalDrip + principalDrip,
        poolTotalDrip: summary.poolTotalDrip + principalDrip + position.claimableDrip,
      };
    },
    {
      activeDrip: 0n,
      pendingDrip: 0n,
      unlockedDrip: 0n,
      claimableDrip: 0n,
      principalDrip: 0n,
      poolTotalDrip: 0n,
    },
  );
}

export function aggregatePortfolioTotal(
  availableBalanceDrip: bigint,
  summary: PortfolioSummary,
): bigint {
  return availableBalanceDrip + summary.poolTotalDrip;
}

export function hasPosition(position: PoolPosition): boolean {
  return (
    position.totalVotes > 0n ||
    position.claimableDrip > 0n ||
    position.governanceLockedDrip > 0n ||
    position.unlockQueue.length > 0
  );
}

export function maxUnstakeVotes(position: PoolPosition): bigint {
  const governanceVotes = position.governanceLockedDrip / (1000n * 10n ** 18n);
  return position.lockedVotes > governanceVotes ? position.lockedVotes - governanceVotes : 0n;
}
