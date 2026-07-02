import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DRIP_PER_VOTE } from '../../domain/money';
import type { PoolPosition } from '../../domain/types';
import { StakingLifecycleTimeline } from './StakingLifecycleTimeline';

const position: PoolPosition = {
  pool: { id: 'pool', name: 'Pool', address: 'cfx:pool', source: 'custom' },
  expectedApyBps: 1000n,
  totalVotes: 5n,
  activeVotes: 3n,
  lockedVotes: 2n,
  pendingVotes: 1n,
  unlockedVotes: 1n,
  governanceLockedDrip: DRIP_PER_VOTE,
  governanceUnlockBlock: 300n,
  claimableDrip: 0n,
  stakeLockQueue: [{ votes: 1n, lockBlock: 120n }],
  unlockQueue: [{ votes: 1n, unlockBlock: 160n }],
};

describe('StakingLifecycleTimeline', () => {
  it('shows lock, unstake, unlock and withdrawal stages', () => {
    render(<StakingLifecycleTimeline position={position} currentBlock={100n} />);

    expect(screen.getByText('当前区块 100')).toBeInTheDocument();
    expect(screen.getByText('区块 120 · 约不到 1 分钟')).toBeInTheDocument();
    expect(screen.getByText('1,000 CFX', { selector: '.text-accent' })).toBeInTheDocument();
    expect(screen.getByText('区块 160 · 约不到 1 分钟')).toBeInTheDocument();
    expect(screen.getByText('1,000 CFX 可提取')).toBeInTheDocument();
  });
});
