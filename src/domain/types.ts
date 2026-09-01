export interface PoolConfig {
  id: string;
  name: string;
  address: string;
  website?: string;
  source: 'custom';
}

export interface AddressBookmark {
  address: string;
  alias?: string;
  createdAt: string;
}

export interface UnlockQueueItem {
  votes: bigint;
  unlockBlock: bigint;
}

export interface StakeLockQueueItem {
  votes: bigint;
  lockBlock: bigint;
}

export interface PoolPosition {
  pool: PoolConfig;
  expectedApyBps: bigint | null;
  totalVotes: bigint;
  activeVotes: bigint;
  lockedVotes: bigint;
  pendingVotes: bigint;
  unlockedVotes: bigint;
  governanceLockedDrip: bigint;
  governanceUnlockBlock: bigint;
  claimedInterestDrip: bigint;
  claimableDrip: bigint;
  stakeLockQueue: StakeLockQueueItem[];
  unlockQueue: UnlockQueueItem[];
}

export interface PoolOverview {
  pool: PoolConfig;
  expectedApyBps: bigint | null;
  totalStakedVotes: bigint;
}

export type HomePoolSort =
  'favorite' | 'apy-desc' | 'apy-asc' | 'total-staked-desc' | 'total-staked-asc';

export type PositionPoolSort =
  | 'favorite'
  | 'apy-desc'
  | 'apy-asc'
  | 'active-stake-desc'
  | 'active-stake-asc'
  | 'claimable-desc'
  | 'claimable-asc';

export interface PortfolioSummary {
  activeDrip: bigint;
  pendingDrip: bigint;
  unlockedDrip: bigint;
  claimableDrip: bigint;
  cumulativeInterestDrip: bigint;
  principalDrip: bigint;
  poolTotalDrip: bigint;
}

export type PoolAction = 'stake' | 'unstake' | 'claim' | 'withdraw';

export interface PreparedTransaction {
  to: string;
  data: string;
  value: string;
  gas?: string;
  gasPrice?: string;
  storageLimit?: string;
}

export type ESpaceAddress = `0x${string}`;

export interface VSwapDiscoveredPosition {
  tokenId: bigint;
  owner: ESpaceAddress;
  poolAddress: ESpaceAddress;
}

export interface VSwapToken {
  address: ESpaceAddress;
  symbol: string;
  name: string;
  decimals: number;
}

export interface VSwapTokenAmount {
  token: VSwapToken;
  amount: bigint;
}

export interface VSwapReward {
  token: VSwapToken;
  unsettledAmount: bigint;
  settledAmount: bigint;
  totalAmount: bigint;
  estimatedDailyAmount: bigint | null;
  activeIncentiveCount: number | null;
}

export type VSwapPositionStatus = 'in-range' | 'out-of-range' | 'closed';

export interface VSwapPosition {
  discovered: VSwapDiscoveredPosition;
  feeTier: number;
  tickLower: number;
  tickUpper: number;
  currentTick: number;
  sqrtPriceX96: bigint;
  liquidity: bigint;
  status: VSwapPositionStatus;
  token0Amount: VSwapTokenAmount;
  token1Amount: VSwapTokenAmount;
  unclaimedFee0: VSwapTokenAmount;
  unclaimedFee1: VSwapTokenAmount;
  rewards: VSwapReward[];
  warnings: string[];
}
