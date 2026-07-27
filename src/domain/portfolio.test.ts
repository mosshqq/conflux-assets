import { describe, expect, it } from 'vitest';
import { DRIP_PER_CFX, DRIP_PER_VOTE } from './money';
import {
  aggregatePortfolioTotal,
  aggregatePositions,
  estimateDailyYield,
  estimateNextStake,
  hasPosition,
  maxUnstakeVotes,
} from './portfolio';
import type { PoolPosition } from './types';

function position(overrides: Partial<PoolPosition> = {}): PoolPosition {
  return {
    pool: {
      id: 'pool',
      name: 'Pool',
      address: 'cfx:contract',
      source: 'custom',
    },
    expectedApyBps: 1290n,
    totalVotes: 5n,
    activeVotes: 3n,
    lockedVotes: 2n,
    pendingVotes: 1n,
    unlockedVotes: 1n,
    governanceLockedDrip: 0n,
    governanceUnlockBlock: 0n,
    claimableDrip: DRIP_PER_CFX,
    stakeLockQueue: [],
    unlockQueue: [],
    ...overrides,
  };
}

describe('portfolio', () => {
  it('aggregates successful pool positions with bigint precision', () => {
    const summary = aggregatePositions([
      position(),
      position({ activeVotes: 2n, pendingVotes: 0n, unlockedVotes: 0n }),
    ]);

    expect(summary.activeDrip).toBe(5n * DRIP_PER_VOTE);
    expect(summary.pendingDrip).toBe(DRIP_PER_VOTE);
    expect(summary.unlockedDrip).toBe(DRIP_PER_VOTE);
    expect(summary.claimableDrip).toBe(2n * DRIP_PER_CFX);
    expect(summary.principalDrip).toBe(7n * DRIP_PER_VOTE);
    expect(summary.poolTotalDrip).toBe(7n * DRIP_PER_VOTE + 2n * DRIP_PER_CFX);
    expect(aggregatePortfolioTotal(10n * DRIP_PER_CFX, summary)).toBe(
      7n * DRIP_PER_VOTE + 12n * DRIP_PER_CFX,
    );
  });

  it('deducts governance locks from unstakeable votes', () => {
    expect(
      maxUnstakeVotes(
        position({
          activeVotes: 5n,
          lockedVotes: 5n,
          governanceLockedDrip: 2n * DRIP_PER_VOTE,
        }),
      ),
    ).toBe(3n);
  });

  it('excludes votes that are still in the staking lock queue', () => {
    expect(
      maxUnstakeVotes(
        position({
          activeVotes: 1n,
          lockedVotes: 0n,
          governanceLockedDrip: 0n,
        }),
      ),
    ).toBe(0n);
  });

  it('recognizes rewards-only positions', () => {
    expect(
      hasPosition(
        position({
          totalVotes: 0n,
          activeVotes: 0n,
          pendingVotes: 0n,
          unlockedVotes: 0n,
          claimableDrip: 1n,
        }),
      ),
    ).toBe(true);
  });

  it('estimates the next stake time from all active stakes weighted by APY', () => {
    const estimate = estimateNextStake(0n, [
      position({ activeVotes: 1n, expectedApyBps: 1_000n, claimableDrip: 0n }),
      position({ activeVotes: 2n, expectedApyBps: 2_000n, claimableDrip: 0n }),
    ]);

    expect(estimate).toEqual({
      status: 'estimated',
      liquidDrip: 0n,
      targetDrip: DRIP_PER_VOTE + DRIP_PER_CFX,
      secondsUntilTarget: 63_135_072n,
    });
  });

  it('includes existing unclaimed rewards and the transaction reserve in the stake target', () => {
    expect(
      estimateNextStake(999n * DRIP_PER_CFX, [
        position({ activeVotes: 1n, claimableDrip: 2n * DRIP_PER_CFX }),
      ]),
    ).toEqual({
      status: 'ready',
      liquidDrip: 1_001n * DRIP_PER_CFX,
      targetDrip: DRIP_PER_VOTE + DRIP_PER_CFX,
    });
  });

  it('does not estimate from incomplete or zero APY data', () => {
    expect(estimateNextStake(0n, [position({ activeVotes: 1n, expectedApyBps: null })])).toEqual({
      status: 'unavailable',
      reason: 'missing-apy',
    });
    expect(estimateNextStake(0n, [position({ activeVotes: 0n })])).toEqual({
      status: 'unavailable',
      reason: 'no-active-stake',
    });
    expect(estimateNextStake(0n, [position({ activeVotes: 1n, expectedApyBps: 0n })])).toEqual({
      status: 'unavailable',
      reason: 'zero-apy',
    });
  });

  it('estimates one day of yield from all active stakes and their pool APYs', () => {
    const dailyYield = estimateDailyYield([
      position({
        activeVotes: 1n,
        pendingVotes: 10n,
        unlockedVotes: 10n,
        expectedApyBps: 1_000n,
      }),
      position({ activeVotes: 2n, expectedApyBps: 2_000n }),
    ]);

    expect(dailyYield).toBe((500n * DRIP_PER_CFX) / 365n);
  });

  it('does not report a partial daily yield when an active pool has no APY', () => {
    expect(
      estimateDailyYield([
        position({ activeVotes: 1n, expectedApyBps: 1_000n }),
        position({ activeVotes: 1n, expectedApyBps: null }),
      ]),
    ).toBeNull();
    expect(estimateDailyYield([position({ activeVotes: 0n, expectedApyBps: null })])).toBe(0n);
  });
});
