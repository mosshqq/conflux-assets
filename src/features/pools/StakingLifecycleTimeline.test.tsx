import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  claimedInterestDrip: 0n,
  claimableDrip: 0n,
  stakeLockQueue: [
    { votes: 1n, lockBlock: 90n },
    { votes: 1n, lockBlock: 120n },
  ],
  unlockQueue: [{ votes: 1n, unlockBlock: 160n }],
};

describe('StakingLifecycleTimeline', () => {
  it('defaults to collapsed and toggles all lifecycle stages', async () => {
    render(<StakingLifecycleTimeline position={position} currentBlock={100n} />);

    expect(screen.getByText('当前区块 100')).toBeInTheDocument();
    expect(screen.queryByText('1. 增加质押锁定')).not.toBeInTheDocument();

    const expandButton = screen.getByRole('button', { name: '展开详情' });
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(expandButton);

    expect(screen.getByText('区块 120 · 约不到 1 分钟')).toBeInTheDocument();
    expect(screen.queryByText('区块 90 · 已完成')).not.toBeInTheDocument();
    expect(screen.getByText('1,000 CFX', { selector: '.text-accent' })).toBeInTheDocument();
    expect(screen.getByText('区块 160 · 约不到 1 分钟')).toBeInTheDocument();
    expect(screen.getByText('1,000 CFX 可提取')).toBeInTheDocument();

    const collapseButton = screen.getByRole('button', { name: '收起详情' });
    expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(collapseButton);
    expect(screen.queryByText('1. 增加质押锁定')).not.toBeInTheDocument();
  });
});
