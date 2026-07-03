import type { ESpaceAddress } from '../domain/types';
import { ESPACE_NETWORK } from './network';

export const VSWAP_MAINNET = {
  subgraphUrl: 'https://mainnet.congraph.io/subgraphs/name/omniaxon/staker',
  positionManager: '0xaaea97033dfe8aebdd9d4ae9d5856678b8f7e127',
  autoPositionManager: '0x5414b6AE40Fb093875284e09D517190096647b10',
  staker: '0x326b6ec27A250926f66AFfc958cFbA35072C886f',
} as const satisfies Record<string, string>;

export const VSWAP_TESTNET = {
  subgraphUrl: 'https://testnet.congraph.io/subgraphs/name/omniaxon/staker',
  positionManager: '0xdba7475F00deb72Bc80B16e8d742c86760c342fe',
  autoPositionManager: '0x5221b4bcbc82e64d997841a2CDf540dF48A717d8',
  staker: '0x65B5a88FCD4FAb5fF9615cFB3Ae11eF24594db80',
} as const satisfies Record<string, string>;

export const VSWAP_NETWORK = ESPACE_NETWORK.id === 'testnet' ? VSWAP_TESTNET : VSWAP_MAINNET;

export const POSITION_MANAGER_ABI = [
  {
    type: 'function',
    name: 'positions',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'nonce', type: 'uint96' },
      { name: 'operator', type: 'address' },
      { name: 'token0', type: 'address' },
      { name: 'token1', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'feeGrowthInside0LastX128', type: 'uint256' },
      { name: 'feeGrowthInside1LastX128', type: 'uint256' },
      { name: 'tokensOwed0', type: 'uint128' },
      { name: 'tokensOwed1', type: 'uint128' },
    ],
  },
] as const;

export const V3_POOL_ABI = [
  {
    type: 'function',
    name: 'slot0',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
  },
] as const;

export const ERC20_METADATA_ABI = [
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

export interface VSwapIncentiveKey {
  rewardToken: ESpaceAddress;
  pool: ESpaceAddress;
  startTime: bigint;
  endTime: bigint;
  refundee: ESpaceAddress;
}

const INCENTIVE_KEY_COMPONENTS = [
  { name: 'rewardToken', type: 'address' },
  { name: 'pool', type: 'address' },
  { name: 'startTime', type: 'uint256' },
  { name: 'endTime', type: 'uint256' },
  { name: 'refundee', type: 'address' },
] as const;

export const VSWAP_STAKER_ABI = [
  {
    type: 'function',
    name: 'getAllIncentiveKeysByPool',
    stateMutability: 'view',
    inputs: [{ name: 'pool', type: 'address' }],
    outputs: [
      {
        name: 'keys',
        type: 'tuple[]',
        components: INCENTIVE_KEY_COMPONENTS,
      },
    ],
  },
  {
    type: 'function',
    name: 'getStakeRewardInfo',
    stateMutability: 'view',
    inputs: [
      { name: 'key', type: 'tuple', components: INCENTIVE_KEY_COMPONENTS },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [
      { name: 'liquidity', type: 'uint128' },
      { name: 'boostedLiquidity', type: 'uint128' },
      { name: 'rewardsPerSecondX32', type: 'uint128' },
      { name: 'unsettledReward', type: 'uint96' },
    ],
  },
  {
    type: 'function',
    name: 'rewards',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'rewardToken', type: 'address' },
    ],
    outputs: [{ name: 'reward', type: 'uint256' }],
  },
] as const;

export const AUTO_POSITION_MANAGER_ABI = [
  {
    type: 'function',
    name: 'collect',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'recipient', type: 'address' },
          { name: 'amount0Max', type: 'uint128' },
          { name: 'amount1Max', type: 'uint128' },
        ],
      },
      { name: 'rewardTokens', type: 'address[]' },
    ],
    outputs: [
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
  },
] as const;
