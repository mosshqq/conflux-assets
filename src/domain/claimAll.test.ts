import { describe, expect, it } from 'vitest';
import { selectClaimCandidates } from './claimAll';
import type { PoolPosition } from './types';

function position(id: string, claimableDrip: bigint): PoolPosition {
  return {
    pool: { id, name: id, address: `cfx:${id}`, source: 'custom' },
    expectedApyBps: null,
    totalVotes: 0n,
    activeVotes: 0n,
    lockedVotes: 0n,
    pendingVotes: 0n,
    unlockedVotes: 0n,
    governanceLockedDrip: 0n,
    governanceUnlockBlock: 0n,
    claimableDrip,
    stakeLockQueue: [],
    unlockQueue: [],
  };
}

describe('one-click claim candidates', () => {
  it('excludes zero and below-threshold rewards while including the threshold exactly', () => {
    const candidates = selectClaimCandidates(
      [position('zero', 0n), position('low', 9n), position('at', 10n)],
      10n,
    );

    expect(candidates.map((item) => item.pool.id)).toEqual(['at']);
  });

  it('rejects negative thresholds', () => {
    expect(() => selectClaimCandidates([], -1n)).toThrow('最低领取收益不能为负数');
  });
});
