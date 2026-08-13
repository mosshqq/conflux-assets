import { createPublicClient, defineChain, http, type Address } from 'viem';
import { ESPACE_NETWORK } from '../../config/network';
import {
  AUTO_POSITION_MANAGER_ABI,
  ERC20_METADATA_ABI,
  POSITION_MANAGER_ABI,
  V3_POOL_ABI,
  VSWAP_NETWORK,
  VSWAP_STAKER_ABI,
  type VSwapIncentiveKey,
} from '../../config/vswap';
import type {
  ESpaceAddress,
  VSwapDiscoveredPosition,
  VSwapPosition,
  VSwapReward,
  VSwapToken,
} from '../../domain/types';
import {
  calculatePositionAmounts,
  estimateDailyVSwapReward,
  isVSwapIncentiveActive,
  resolveVSwapPositionStatus,
} from '../../domain/vswap';

const espaceChain = defineChain({
  id: ESPACE_NETWORK.chainId,
  name: ESPACE_NETWORK.name,
  nativeCurrency: { name: 'CFX', symbol: 'CFX', decimals: 18 },
  rpcUrls: { default: { http: [ESPACE_NETWORK.rpcUrl] } },
  blockExplorers: { default: { name: 'ConfluxScan', url: ESPACE_NETWORK.explorerUrl } },
});

const publicClient = createPublicClient({
  chain: espaceChain,
  transport: http(ESPACE_NETWORK.rpcUrl),
});

const MAX_UINT128 = (1n << 128n) - 1n;
const DISCOVERY_PAGE_SIZE = 100;
const MAX_DISCOVERED_POSITIONS = 10_000;
const STAKE_REWARD_INFO_CALLER = '0x000000000000000000000000000000000000fe01';

interface ManagedPositionPayload {
  id: string;
  owner: string;
  pool: string;
}

interface ManagedPositionsResponse {
  data?: {
    managedPositions?: ManagedPositionPayload[];
  };
  errors?: Array<{ message?: string }>;
}

function asAddress(value: string, label: string): ESpaceAddress {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error(`${label}地址无效`);
  return value.toLowerCase() as ESpaceAddress;
}

export async function discoverVSwapPositions(
  owner: ESpaceAddress,
): Promise<VSwapDiscoveredPosition[]> {
  const positions: VSwapDiscoveredPosition[] = [];

  while (positions.length < MAX_DISCOVERED_POSITIONS) {
    const response = await fetch(VSWAP_NETWORK.subgraphUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: `
          query ManagedPositions($first: Int!, $skip: Int!, $owner: Bytes!) {
            managedPositions(
              first: $first
              skip: $skip
              orderBy: id
              orderDirection: desc
              where: { owner: $owner, isManaged: true }
            ) {
              id
              owner
              pool
            }
          }
        `,
        variables: {
          first: DISCOVERY_PAGE_SIZE,
          skip: positions.length,
          owner: owner.toLowerCase(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`vSwap 索引请求失败（HTTP ${response.status}）`);
    }

    const payload = (await response.json()) as ManagedPositionsResponse;
    if (payload.errors?.length) {
      throw new Error(payload.errors[0]?.message || 'vSwap 索引查询失败');
    }
    const page = payload.data?.managedPositions;
    if (!Array.isArray(page)) throw new Error('vSwap 索引返回了无效仓位数据');

    positions.push(
      ...page.map((position) => {
        const positionOwner = asAddress(position.owner, '仓位所有者');
        if (positionOwner !== owner.toLowerCase()) {
          throw new Error('vSwap 索引返回了不属于查询地址的仓位');
        }
        return {
          tokenId: BigInt(position.id),
          owner: positionOwner,
          poolAddress: asAddress(position.pool, 'vSwap 池'),
        };
      }),
    );
    if (page.length < DISCOVERY_PAGE_SIZE) return positions;
  }

  throw new Error('vSwap 仓位数量超过安全查询上限');
}

async function readToken(address: ESpaceAddress): Promise<VSwapToken> {
  const [decimals, nameResult, symbolResult] = await Promise.all([
    publicClient.readContract({
      address,
      abi: ERC20_METADATA_ABI,
      functionName: 'decimals',
    }),
    publicClient
      .readContract({ address, abi: ERC20_METADATA_ABI, functionName: 'name' })
      .catch(() => ''),
    publicClient
      .readContract({ address, abi: ERC20_METADATA_ABI, functionName: 'symbol' })
      .catch(() => ''),
  ]);

  const fallback = `${address.slice(0, 6)}…${address.slice(-4)}`;
  return {
    address,
    decimals,
    name: nameResult || fallback,
    symbol: symbolResult || fallback,
  };
}

function normalizeIncentiveKey(key: {
  rewardToken: Address;
  pool: Address;
  startTime: bigint;
  endTime: bigint;
  refundee: Address;
}): VSwapIncentiveKey {
  return {
    rewardToken: key.rewardToken.toLowerCase() as ESpaceAddress,
    pool: key.pool.toLowerCase() as ESpaceAddress,
    startTime: key.startTime,
    endTime: key.endTime,
    refundee: key.refundee.toLowerCase() as ESpaceAddress,
  };
}

async function readRewards(
  discovered: VSwapDiscoveredPosition,
  warnings: string[],
): Promise<VSwapReward[]> {
  let keys: readonly VSwapIncentiveKey[];
  try {
    const result = await publicClient.readContract({
      address: VSWAP_NETWORK.staker,
      abi: VSWAP_STAKER_ABI,
      functionName: 'getAllIncentiveKeysByPool',
      args: [discovered.poolAddress],
    });
    keys = result.map(normalizeIncentiveKey);
  } catch {
    warnings.push('farming 奖励计划读取失败');
    return [];
  }

  let blockTimestamp: bigint | null = null;
  if (keys.length > 0) {
    try {
      blockTimestamp = (await publicClient.getBlock()).timestamp;
    } catch {
      warnings.push('最新区块时间读取失败，无法估算每日 farming 奖励');
    }
  }

  const rewardResults = await Promise.all(
    keys.map(async (key) => {
      try {
        const stakeInfo = await publicClient.readContract({
          account: STAKE_REWARD_INFO_CALLER,
          address: VSWAP_NETWORK.staker,
          abi: VSWAP_STAKER_ABI,
          functionName: 'getStakeRewardInfo',
          args: [key, discovered.tokenId],
        });
        const active =
          blockTimestamp !== null &&
          isVSwapIncentiveActive(key.startTime, key.endTime, blockTimestamp);
        return {
          rewardToken: key.rewardToken,
          unsettledAmount: stakeInfo[3],
          rewardsPerSecondX32: active ? stakeInfo[2] : 0n,
          active,
        };
      } catch {
        warnings.push(`奖励计划 ${key.rewardToken} 读取失败`);
        return null;
      }
    }),
  );

  const grouped = new Map<
    ESpaceAddress,
    {
      unsettledAmount: bigint;
      rewardsPerSecondX32: bigint;
      activeIncentiveCount: number;
    }
  >();
  const failedRewardTokens = new Set<ESpaceAddress>();
  for (const key of keys) {
    grouped.set(key.rewardToken, {
      unsettledAmount: 0n,
      rewardsPerSecondX32: 0n,
      activeIncentiveCount: 0,
    });
  }
  for (const [index, result] of rewardResults.entries()) {
    if (!result) {
      const failedKey = keys[index];
      if (failedKey) failedRewardTokens.add(failedKey.rewardToken);
      continue;
    }
    const current = grouped.get(result.rewardToken);
    grouped.set(result.rewardToken, {
      unsettledAmount: (current?.unsettledAmount ?? 0n) + result.unsettledAmount,
      rewardsPerSecondX32: (current?.rewardsPerSecondX32 ?? 0n) + result.rewardsPerSecondX32,
      activeIncentiveCount: (current?.activeIncentiveCount ?? 0) + (result.active ? 1 : 0),
    });
  }

  const rewards = [...grouped.entries()].map(([address, amounts]) => ({
    address,
    amounts,
  }));
  const results = await Promise.all(
    rewards.map(async ({ address, amounts }) => {
      try {
        let settledAmount = 0n;
        try {
          settledAmount = await publicClient.readContract({
            address: VSWAP_NETWORK.staker,
            abi: VSWAP_STAKER_ABI,
            functionName: 'rewards',
            args: [discovered.tokenId, address],
          });
        } catch {
          warnings.push(`奖励代币 ${address} 已结算金额读取失败`);
        }
        return {
          token: await readToken(address),
          unsettledAmount: amounts.unsettledAmount,
          settledAmount,
          totalAmount: amounts.unsettledAmount + settledAmount,
          estimatedDailyAmount:
            blockTimestamp === null ? null : estimateDailyVSwapReward(amounts.rewardsPerSecondX32),
          activeIncentiveCount:
            blockTimestamp === null || failedRewardTokens.has(address)
              ? null
              : amounts.activeIncentiveCount,
        };
      } catch {
        warnings.push(`奖励代币 ${address} 元数据读取失败`);
        return null;
      }
    }),
  );
  return results.filter((reward): reward is VSwapReward => reward !== null);
}

export async function readVSwapPosition(
  discovered: VSwapDiscoveredPosition,
): Promise<VSwapPosition> {
  const warnings: string[] = [];
  const position = await publicClient.readContract({
    address: VSWAP_NETWORK.positionManager,
    abi: POSITION_MANAGER_ABI,
    functionName: 'positions',
    args: [discovered.tokenId],
  });
  const token0Address = position[2].toLowerCase() as ESpaceAddress;
  const token1Address = position[3].toLowerCase() as ESpaceAddress;
  const feeTier = position[4];
  const tickLower = position[5];
  const tickUpper = position[6];
  const liquidity = position[7];

  const [slot0, token0, token1] = await Promise.all([
    publicClient.readContract({
      address: discovered.poolAddress,
      abi: V3_POOL_ABI,
      functionName: 'slot0',
    }),
    readToken(token0Address),
    readToken(token1Address),
  ]);
  const [amount0, amount1] = calculatePositionAmounts({
    liquidity,
    sqrtPriceX96: slot0[0],
    tickLower,
    tickUpper,
  });

  let fee0 = 0n;
  let fee1 = 0n;
  try {
    const simulation = await publicClient.simulateContract({
      account: discovered.owner,
      address: VSWAP_NETWORK.autoPositionManager,
      abi: AUTO_POSITION_MANAGER_ABI,
      functionName: 'collect',
      args: [
        {
          tokenId: discovered.tokenId,
          recipient: discovered.owner,
          amount0Max: MAX_UINT128,
          amount1Max: MAX_UINT128,
        },
        [],
      ],
    });
    [fee0, fee1] = simulation.result;
  } catch {
    warnings.push('未领取手续费模拟读取失败');
  }

  const rewards = await readRewards(discovered, warnings);

  return {
    discovered,
    feeTier,
    tickLower,
    tickUpper,
    currentTick: slot0[1],
    sqrtPriceX96: slot0[0],
    liquidity,
    status: resolveVSwapPositionStatus(liquidity, slot0[1], tickLower, tickUpper),
    token0Amount: { token: token0, amount: amount0 },
    token1Amount: { token: token1, amount: amount1 },
    unclaimedFee0: { token: token0, amount: fee0 },
    unclaimedFee1: { token: token1, amount: fee1 },
    rewards,
    warnings,
  };
}
