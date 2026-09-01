import type { PoolPosition, PortfolioSummary } from './types';
import { DRIP_PER_VOTE, GAS_RESERVE_DRIP, votesToDrip } from './money';

const BASIS_POINTS_PER_YEAR = 10_000n;
const DAYS_PER_YEAR = 365n;
const SECONDS_PER_YEAR = DAYS_PER_YEAR * 24n * 60n * 60n;

export type NextStakeEstimate =
  | {
      status: 'ready';
      liquidDrip: bigint;
      targetDrip: bigint;
    }
  | {
      status: 'estimated';
      liquidDrip: bigint;
      targetDrip: bigint;
      secondsUntilTarget: bigint;
    }
  | {
      status: 'unavailable';
      reason: 'missing-apy' | 'no-active-stake' | 'zero-apy';
    };

function aggregateAnnualYieldWeight(activePositions: PoolPosition[]): bigint | null {
  if (activePositions.some((position) => position.expectedApyBps === null)) {
    return null;
  }

  return activePositions.reduce(
    (total, position) => total + votesToDrip(position.activeVotes) * position.expectedApyBps!,
    0n,
  );
}

export function getCumulativeInterestDrip(position: PoolPosition): bigint {
  return position.claimedInterestDrip + position.claimableDrip;
}

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
        cumulativeInterestDrip:
          summary.cumulativeInterestDrip + getCumulativeInterestDrip(position),
        principalDrip: summary.principalDrip + principalDrip,
        poolTotalDrip: summary.poolTotalDrip + principalDrip + position.claimableDrip,
      };
    },
    {
      activeDrip: 0n,
      pendingDrip: 0n,
      unlockedDrip: 0n,
      claimableDrip: 0n,
      cumulativeInterestDrip: 0n,
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

export function estimateNextStake(
  availableBalanceDrip: bigint,
  positions: PoolPosition[],
): NextStakeEstimate {
  const targetDrip = DRIP_PER_VOTE + GAS_RESERVE_DRIP;
  const liquidDrip = positions.reduce(
    (total, position) => total + position.claimableDrip,
    availableBalanceDrip,
  );

  if (liquidDrip >= targetDrip) {
    return { status: 'ready', liquidDrip, targetDrip };
  }

  const activePositions = positions.filter((position) => position.activeVotes > 0n);
  if (activePositions.length === 0) {
    return { status: 'unavailable', reason: 'no-active-stake' };
  }
  const annualYieldWeight = aggregateAnnualYieldWeight(activePositions);
  if (annualYieldWeight === null) {
    return { status: 'unavailable', reason: 'missing-apy' };
  }
  if (annualYieldWeight === 0n) {
    return { status: 'unavailable', reason: 'zero-apy' };
  }

  const remainingDrip = targetDrip - liquidDrip;
  const numerator = remainingDrip * BASIS_POINTS_PER_YEAR * SECONDS_PER_YEAR;
  const secondsUntilTarget = (numerator + annualYieldWeight - 1n) / annualYieldWeight;

  return { status: 'estimated', liquidDrip, targetDrip, secondsUntilTarget };
}

export function estimateDailyYield(positions: PoolPosition[]): bigint | null {
  const activePositions = positions.filter((position) => position.activeVotes > 0n);
  const annualYieldWeight = aggregateAnnualYieldWeight(activePositions);
  return annualYieldWeight === null
    ? null
    : annualYieldWeight / (BASIS_POINTS_PER_YEAR * DAYS_PER_YEAR);
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
