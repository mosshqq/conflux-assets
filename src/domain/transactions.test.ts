import { describe, expect, it } from 'vitest';
import { DRIP_PER_CFX, DRIP_PER_VOTE } from './money';
import {
  maxTransactionCostDrip,
  validateStakeAmount,
  validateTransactionBalance,
  validateUnstakeAmount,
} from './transactions';
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
  claimedInterestDrip: 0n,
  claimableDrip: 0n,
  stakeLockQueue: [],
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

  it('rejects unstaking votes that are still in the staking lock queue', () => {
    expect(() =>
      validateUnstakeAmount(DRIP_PER_VOTE, {
        ...POSITION,
        totalVotes: 1n,
        activeVotes: 1n,
        lockedVotes: 0n,
        pendingVotes: 0n,
        governanceLockedDrip: 0n,
      }),
    ).toThrow('最多可发起解质押 0 票');
  });

  it('includes gas and storage collateral in the prepared transaction balance check', () => {
    const transaction = {
      to: 'cfx:contract',
      data: '0x1234',
      value: `0x${DRIP_PER_VOTE.toString(16)}`,
      gas: '0x4ad0a7',
      gasPrice: '0x3b9aca00',
      storageLimit: '0x69a',
    };
    const requiredDrip =
      DRIP_PER_VOTE + 4_903_079n * 1_000_000_000n + 1_690n * (DRIP_PER_CFX / 1024n);

    expect(maxTransactionCostDrip(transaction)).toBe(requiredDrip);
    expect(() => validateTransactionBalance(transaction, requiredDrip - 1n)).toThrow(
      'gas 与存储抵押',
    );
    expect(() => validateTransactionBalance(transaction, requiredDrip)).not.toThrow();
  });
});
