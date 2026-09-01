import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PoolConfig } from '../../domain/types';

const mocks = vi.hoisted(() => {
  const method = (data: string, result?: unknown) => ({
    data,
    call: vi.fn().mockResolvedValue(result),
    estimateGasAndCollateral: vi.fn().mockResolvedValue({
      gasLimit: 1000n,
      storageCollateralized: 200n,
    }),
  });

  const contract = {
    userSummary: vi.fn(() => method('0xsummary', [5n, 3n, 2n, 1n, 40n, 9n])),
    userInterest: vi.fn(() => method('0xinterest', 99n)),
    userInQueue: vi.fn(() => method('0xstake-queue', [[2n, 480n]])),
    userOutQueue: vi.fn(() => method('0xqueue', [[1n, 500n]])),
    userLockInfo: vi.fn(() => method('0xlock', [1000n, 600n])),
    poolName: vi.fn(() => method('0xname', 'Mock Pool')),
    poolSummary: vi.fn(() => method('0xpool', [10n, 20n, 30n])),
    poolAPY: vi.fn(() => method('0xapy', 1290n)),
    increaseStake: vi.fn(() => method('0xstake')),
    decreaseStake: vi.fn(() => method('0xunstake')),
    claimAllInterest: vi.fn(() => method('0xclaim')),
    withdrawStake: vi.fn(() => method('0xwithdraw')),
  };

  return {
    contract,
    getBalance: vi.fn().mockResolvedValue(123n),
    getStatus: vi.fn().mockResolvedValue({ blockNumber: 456n }),
    getGasPrice: vi.fn().mockResolvedValue(10n),
  };
});

vi.mock('js-conflux-sdk', () => ({
  Conflux: class {
    Contract = vi.fn(() => mocks.contract);
    getBalance = mocks.getBalance;
    getStatus = mocks.getStatus;
    getGasPrice = mocks.getGasPrice;
    getTransactionReceipt = vi.fn();
  },
}));

import {
  preparePoolTransaction,
  readCfxBalance,
  readCurrentBlock,
  readPoolOverview,
  readPoolPosition,
  validateStandardPool,
} from './client';

const POOL: PoolConfig = {
  id: 'mock',
  name: 'Mock',
  address: 'cfx:mock-contract',
  source: 'custom',
};

describe('Conflux client', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads balances, blocks and normalizes a standard position', async () => {
    await expect(readCfxBalance('cfx:user')).resolves.toBe(123n);
    await expect(readCurrentBlock()).resolves.toBe(456n);

    const position = await readPoolPosition(POOL, 'cfx:user');
    expect(position).toMatchObject({
      expectedApyBps: 1290n,
      totalVotes: 5n,
      activeVotes: 3n,
      lockedVotes: 2n,
      pendingVotes: 1n,
      unlockedVotes: 1n,
      governanceLockedDrip: 1000n,
      claimedInterestDrip: 40n,
      claimableDrip: 99n,
    });
    expect(position.stakeLockQueue).toEqual([{ votes: 2n, lockBlock: 480n }]);
    expect(position.unlockQueue).toEqual([{ votes: 1n, unlockBlock: 500n }]);
  });

  it('keeps position data when an older pool does not expose APY', async () => {
    mocks.contract.poolAPY.mockImplementationOnce(() => ({
      data: '0xapy',
      call: vi.fn().mockRejectedValue(new Error('method not found')),
      estimateGasAndCollateral: vi.fn(),
    }));

    await expect(readPoolPosition(POOL, 'cfx:user')).resolves.toMatchObject({
      expectedApyBps: null,
      activeVotes: 3n,
      claimableDrip: 99n,
    });
  });

  it('reads the pool APY and total staked votes for the home overview', async () => {
    await expect(readPoolOverview(POOL)).resolves.toEqual({
      pool: POOL,
      expectedApyBps: 1290n,
      totalStakedVotes: 10n,
    });
  });

  it('keeps the total stake available when an older pool does not expose APY', async () => {
    mocks.contract.poolAPY.mockImplementationOnce(() => ({
      data: '0xapy',
      call: vi.fn().mockRejectedValue(new Error('method not found')),
      estimateGasAndCollateral: vi.fn(),
    }));

    await expect(readPoolOverview(POOL)).resolves.toMatchObject({
      expectedApyBps: null,
      totalStakedVotes: 10n,
    });
  });

  it('validates the minimum standard pool read interface', async () => {
    await expect(validateStandardPool(POOL.address)).resolves.toEqual({ name: 'Mock Pool' });
  });

  it.each([
    ['stake', '0xstake', 1n, 1000n],
    ['unstake', '0xunstake', 1n, 0n],
    ['claim', '0xclaim', 0n, 0n],
    ['withdraw', '0xwithdraw', 1n, 0n],
  ] as const)(
    'prepares %s with gas and storage margins',
    async (action, data, votes, valueDrip) => {
      const transaction = await preparePoolTransaction({
        poolAddress: POOL.address,
        from: 'cfx:user',
        action,
        votes,
        valueDrip,
      });

      expect(transaction).toEqual({
        to: POOL.address,
        data,
        value: `0x${valueDrip.toString(16)}`,
        gas: '0x44c',
        gasPrice: '0xa',
        storageLimit: '0xdc',
      });
    },
  );
});
