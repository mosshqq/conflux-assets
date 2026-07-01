import type { PoolPosition, PortfolioSummary } from './types';
import { votesToDrip } from './money';

export function aggregatePositions(positions: PoolPosition[]): PortfolioSummary {
  return positions.reduce<PortfolioSummary>(
    (summary, position) => ({
      activeDrip: summary.activeDrip + votesToDrip(position.activeVotes),
      pendingDrip: summary.pendingDrip + votesToDrip(position.pendingVotes),
      unlockedDrip: summary.unlockedDrip + votesToDrip(position.unlockedVotes),
      claimableDrip: summary.claimableDrip + position.claimableDrip,
    }),
    {
      activeDrip: 0n,
      pendingDrip: 0n,
      unlockedDrip: 0n,
      claimableDrip: 0n,
    },
  );
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
  return position.activeVotes > governanceVotes ? position.activeVotes - governanceVotes : 0n;
}
