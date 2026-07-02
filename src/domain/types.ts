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
