import { describe, expect, it } from 'vitest';
import { DRIP_PER_CFX, DRIP_PER_VOTE } from './money';
import { aggregatePositions, hasPosition, maxUnstakeVotes } from './portfolio';
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
});
