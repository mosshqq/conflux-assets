import { describe, expect, it } from 'vitest';
import type { PoolConfig, PoolOverview, PoolPosition } from '../../domain/types';
import { sortPoolOverviewIndexes, sortPositionIndexes } from './poolSorting';

const pools: PoolConfig[] = ['one', 'two', 'three', 'four'].map((id) => ({
  id,
  name: id,
  address: `cfx:${id}`,
  source: 'custom',
}));

const overviews: Array<PoolOverview | undefined> = [
  { pool: pools[0], expectedApyBps: 500n, totalStakedVotes: 30n },
  { pool: pools[1], expectedApyBps: 900n, totalStakedVotes: 10n },
  { pool: pools[2], expectedApyBps: null, totalStakedVotes: 20n },
  undefined,
];

function position(
  index: number,
  values: Pick<PoolPosition, 'expectedApyBps' | 'activeVotes' | 'claimableDrip'>,
): PoolPosition {
  return {
    pool: pools[index],
    totalVotes: values.activeVotes,
    lockedVotes: values.activeVotes,
    pendingVotes: 0n,
    unlockedVotes: 0n,
    governanceLockedDrip: 0n,
    governanceUnlockBlock: 0n,
    stakeLockQueue: [],
    unlockQueue: [],
    ...values,
  };
}

const positions: Array<PoolPosition | undefined> = [
  position(0, { expectedApyBps: 500n, activeVotes: 3n, claimableDrip: 20n }),
  position(1, { expectedApyBps: 900n, activeVotes: 1n, claimableDrip: 30n }),
  position(2, { expectedApyBps: null, activeVotes: 2n, claimableDrip: 10n }),
  undefined,
];

describe('pool sorting', () => {
  it('preserves the persisted favorite order by default', () => {
    expect(sortPoolOverviewIndexes([2, 0, 1], overviews, 'favorite')).toEqual([2, 0, 1]);
    expect(sortPositionIndexes([2, 0, 1], positions, 'favorite')).toEqual([2, 0, 1]);
  });

  it('sorts home pools by APY or total stake and keeps unavailable values last', () => {
    expect(sortPoolOverviewIndexes([0, 1, 2, 3], overviews, 'apy-desc')).toEqual([1, 0, 2, 3]);
    expect(sortPoolOverviewIndexes([0, 1, 2, 3], overviews, 'total-staked-asc')).toEqual([
      1, 2, 0, 3,
    ]);
  });

  it('sorts address positions by APY, active stake or claimable rewards', () => {
    expect(sortPositionIndexes([0, 1, 2, 3], positions, 'apy-asc')).toEqual([0, 1, 2, 3]);
    expect(sortPositionIndexes([0, 1, 2, 3], positions, 'active-stake-desc')).toEqual([0, 2, 1, 3]);
    expect(sortPositionIndexes([0, 1, 2, 3], positions, 'claimable-asc')).toEqual([2, 0, 1, 3]);
  });
});
