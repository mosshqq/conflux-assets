import { describe, expect, it } from 'vitest';
import { DRIP_PER_CFX, DRIP_PER_VOTE } from './money';
import { validateStakeAmount, validateUnstakeAmount } from './transactions';
import type { PoolPosition } from './types';

const POSITION: PoolPosition = {
  pool: { id: 'p', name: 'Pool', address: 'cfx:contract', source: 'custom' },
  expectedApyBps: 1290n,
  totalVotes: 6n,
  activeVotes: 5n,
  lockedVotes: 5n,
  pendingVotes: 1n,
  unlockedVotes: 0n,
  governanceLockedDrip: 2n * DRIP_PER_VOTE,
  governanceUnlockBlock: 100n,
  claimableDrip: 0n,
  unlockQueue: [],
};

describe('transaction validation', () => {
  it('reserves one CFX when staking', () => {
    expect(validateStakeAmount(DRIP_PER_VOTE, DRIP_PER_VOTE + DRIP_PER_CFX)).toBe(1n);
    expect(() => validateStakeAmount(DRIP_PER_VOTE, DRIP_PER_VOTE)).toThrow('保留至少 1 CFX');
  });

  it('enforces vote multiples and governance locks', () => {
    expect(validateUnstakeAmount(3n * DRIP_PER_VOTE, POSITION)).toBe(3n);
    expect(() => validateUnstakeAmount(4n * DRIP_PER_VOTE, POSITION)).toThrow('最多可发起');
    expect(() => validateUnstakeAmount(DRIP_PER_VOTE + 1n, POSITION)).toThrow('1000 CFX');
  });
});
