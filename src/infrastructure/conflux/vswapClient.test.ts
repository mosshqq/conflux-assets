import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VSWAP_NETWORK, type VSwapIncentiveKey } from '../../config/vswap';
import type { VSwapDiscoveredPosition } from '../../domain/types';
import { discoverVSwapPositions, readVSwapPosition } from './vswapClient';

const publicClientMock = vi.hoisted(() => ({
  getBlock: vi.fn(),
  readContract: vi.fn(),
  simulateContract: vi.fn(),
}));

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>();
  return {
    ...actual,
    createPublicClient: vi.fn(() => publicClientMock),
  };
});

const OWNER = '0x1000000000000000000000000000000000000001';
const POOL = '0x2000000000000000000000000000000000000002';
const TOKEN0 = '0x3000000000000000000000000000000000000003';
const TOKEN1 = '0x4000000000000000000000000000000000000004';
const REWARD_TOKEN = '0x5000000000000000000000000000000000000005';
const TOKEN_ID = 42n;
const SQRT_PRICE_X96 = (1n << 96n) + 123_456_789n;
const Q32 = 1n << 32n;

const DISCOVERED_POSITION: VSwapDiscoveredPosition = {
  tokenId: TOKEN_ID,
  owner: OWNER,
  poolAddress: POOL,
};

interface ReadContractRequest {
  account?: string;
  address: string;
  functionName: string;
  args?: readonly unknown[];
}

interface PositionReadMockOptions {
  incentiveKeys?: readonly VSwapIncentiveKey[];
  settledAmount?: bigint;
  settledError?: Error;
  stakeInfoByStartTime?: ReadonlyMap<bigint, readonly [bigint, bigint, bigint, bigint]>;
}

function mockPositionReads({
  incentiveKeys = [],
  settledAmount = 0n,
  settledError,
  stakeInfoByStartTime = new Map(),
}: PositionReadMockOptions = {}): void {
  publicClientMock.readContract.mockImplementation(
    async ({ address, functionName, args }: ReadContractRequest) => {
      if (functionName === 'positions') {
        return [0n, OWNER, TOKEN0, TOKEN1, 3_000, -60, 60, 1_000_000n, 0n, 0n, 0n, 0n] as const;
      }
      if (functionName === 'slot0') {
        return [SQRT_PRICE_X96, 0, 0, 0, 0, 0, true] as const;
      }
      if (functionName === 'decimals') {
        return address.toLowerCase() === TOKEN1 ? 6 : 18;
      }
      if (functionName === 'name') {
        if (address.toLowerCase() === TOKEN0) return 'Token Zero';
        if (address.toLowerCase() === TOKEN1) return 'Token One';
        return 'Reward Token';
      }
      if (functionName === 'symbol') {
        if (address.toLowerCase() === TOKEN0) return 'TK0';
        if (address.toLowerCase() === TOKEN1) return 'TK1';
        return 'RWD';
      }
      if (functionName === 'getAllIncentiveKeysByPool') return incentiveKeys;
      if (functionName === 'getStakeRewardInfo') {
        const key = args?.[0] as VSwapIncentiveKey;
        const stakeInfo = stakeInfoByStartTime.get(key.startTime);
        if (!stakeInfo) throw new Error(`Unexpected incentive ${key.startTime}`);
        return stakeInfo;
      }
      if (functionName === 'rewards') {
        if (settledError) throw settledError;
        return settledAmount;
      }
      throw new Error(`Unexpected readContract call: ${functionName}`);
    },
  );
}

beforeEach(() => {
  publicClientMock.getBlock.mockReset();
  publicClientMock.readContract.mockReset();
  publicClientMock.simulateContract.mockReset();
});

describe('vSwap client discovery', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('paginates managed positions and preserves uint256 token IDs as bigint', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `${index + 1}`,
      owner: OWNER.toUpperCase().replace('0X', '0x'),
      pool: POOL,
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: { managedPositions: firstPage },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            managedPositions: [
              {
                id: '340282366920938463463374607431768211456',
                owner: OWNER,
                pool: POOL,
              },
            ],
          },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const result = await discoverVSwapPositions(OWNER);

    expect(result).toHaveLength(101);
    expect(result[100]?.tokenId).toBe(340282366920938463463374607431768211456n);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      VSWAP_NETWORK.subgraphUrl,
      expect.objectContaining({
        body: expect.stringContaining('"skip":100'),
      }),
    );
  });

  it('surfaces subgraph GraphQL errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ errors: [{ message: 'indexer failed' }] }),
      }),
    );

    await expect(discoverVSwapPositions(OWNER)).rejects.toThrow('indexer failed');
  });

  it('rejects positions whose returned owner does not match the query owner', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            managedPositions: [
              {
                id: '1',
                owner: '0x6000000000000000000000000000000000000006',
                pool: POOL,
              },
            ],
          },
        }),
      }),
    );

    await expect(discoverVSwapPositions(OWNER)).rejects.toThrow('不属于查询地址');
  });
});

describe('vSwap position reads', () => {
  it('preserves sqrtPriceX96 and aggregates active Q32 reward rates by token', async () => {
    const activeRateA = Q32 + 7n;
    const activeRateB = 2n * Q32 + 11n;
    const endedRate = 100n * Q32;
    const incentiveKeys: VSwapIncentiveKey[] = [
      {
        rewardToken: REWARD_TOKEN,
        pool: POOL,
        startTime: 900n,
        endTime: 1_100n,
        refundee: OWNER,
      },
      {
        rewardToken: REWARD_TOKEN,
        pool: POOL,
        startTime: 950n,
        endTime: 1_001n,
        refundee: OWNER,
      },
      {
        rewardToken: REWARD_TOKEN,
        pool: POOL,
        startTime: 800n,
        endTime: 1_000n,
        refundee: OWNER,
      },
    ];
    mockPositionReads({
      incentiveKeys,
      settledAmount: 40n,
      stakeInfoByStartTime: new Map([
        [900n, [1n, 1n, activeRateA, 10n]],
        [950n, [1n, 1n, activeRateB, 20n]],
        [800n, [1n, 1n, endedRate, 30n]],
      ]),
    });
    publicClientMock.getBlock.mockResolvedValue({ timestamp: 1_000n });
    publicClientMock.simulateContract.mockResolvedValue({ result: [11n, 22n] });

    const result = await readVSwapPosition(DISCOVERED_POSITION);

    expect(result.sqrtPriceX96).toBe(SQRT_PRICE_X96);
    expect(result.rewards).toEqual([
      expect.objectContaining({
        activeIncentiveCount: 2,
        estimatedDailyAmount: ((activeRateA + activeRateB) * 86_400n) / Q32,
        settledAmount: 40n,
        totalAmount: 100n,
        unsettledAmount: 60n,
      }),
    ]);
    const settledRewardCalls = publicClientMock.readContract.mock.calls.filter(
      ([request]) => (request as ReadContractRequest).functionName === 'rewards',
    );
    expect(settledRewardCalls).toHaveLength(1);
    expect(settledRewardCalls[0]?.[0]).toEqual(
      expect.objectContaining({ args: [TOKEN_ID, REWARD_TOKEN] }),
    );
    const stakeInfoCalls = publicClientMock.readContract.mock.calls.filter(
      ([request]) => (request as ReadContractRequest).functionName === 'getStakeRewardInfo',
    );
    expect(stakeInfoCalls).toHaveLength(3);
    for (const [request] of stakeInfoCalls) {
      expect(request).toEqual(
        expect.objectContaining({
          account: '0x000000000000000000000000000000000000fe01',
        }),
      );
    }
    expect(result.warnings).toEqual([]);
  });

  it('does not claim a complete active-incentive count after one plan fails', async () => {
    const incentiveKeys: VSwapIncentiveKey[] = [
      {
        rewardToken: REWARD_TOKEN,
        pool: POOL,
        startTime: 900n,
        endTime: 1_100n,
        refundee: OWNER,
      },
      {
        rewardToken: REWARD_TOKEN,
        pool: POOL,
        startTime: 950n,
        endTime: 1_100n,
        refundee: OWNER,
      },
    ];
    mockPositionReads({
      incentiveKeys,
      stakeInfoByStartTime: new Map([[900n, [1n, 1n, Q32, 12n]]]),
    });
    publicClientMock.getBlock.mockResolvedValue({ timestamp: 1_000n });
    publicClientMock.simulateContract.mockResolvedValue({ result: [0n, 0n] });

    const result = await readVSwapPosition(DISCOVERED_POSITION);

    expect(result.rewards[0]).toEqual(
      expect.objectContaining({
        activeIncentiveCount: null,
        estimatedDailyAmount: 86_400n,
      }),
    );
    expect(result.warnings).toContain(`奖励计划 ${REWARD_TOKEN} 读取失败`);
  });

  it('keeps the position when optional fee and reward reads fail', async () => {
    const incentiveKey: VSwapIncentiveKey = {
      rewardToken: REWARD_TOKEN,
      pool: POOL,
      startTime: 900n,
      endTime: 1_100n,
      refundee: OWNER,
    };
    mockPositionReads({
      incentiveKeys: [incentiveKey],
      settledError: new Error('settled reward unavailable'),
      stakeInfoByStartTime: new Map([[900n, [1n, 1n, Q32, 12n]]]),
    });
    publicClientMock.getBlock.mockRejectedValue(new Error('block unavailable'));
    publicClientMock.simulateContract.mockRejectedValue(new Error('fee unavailable'));

    const result = await readVSwapPosition(DISCOVERED_POSITION);

    expect(result.sqrtPriceX96).toBe(SQRT_PRICE_X96);
    expect(result.unclaimedFee0.amount).toBe(0n);
    expect(result.unclaimedFee1.amount).toBe(0n);
    expect(result.rewards).toEqual([
      expect.objectContaining({
        activeIncentiveCount: null,
        estimatedDailyAmount: null,
        settledAmount: 0n,
        totalAmount: 12n,
        unsettledAmount: 12n,
      }),
    ]);
    expect(result.warnings).toEqual([
      '未领取手续费模拟读取失败',
      '最新区块时间读取失败，无法估算每日 farming 奖励',
      `奖励代币 ${REWARD_TOKEN} 已结算金额读取失败`,
    ]);
  });
});
