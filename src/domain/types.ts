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

export interface PoolPosition {
  pool: PoolConfig;
  totalVotes: bigint;
  activeVotes: bigint;
  lockedVotes: bigint;
  pendingVotes: bigint;
  unlockedVotes: bigint;
  governanceLockedDrip: bigint;
  governanceUnlockBlock: bigint;
  claimableDrip: bigint;
  unlockQueue: UnlockQueueItem[];
}

export interface PortfolioSummary {
  activeDrip: bigint;
  pendingDrip: bigint;
  unlockedDrip: bigint;
  claimableDrip: bigint;
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
