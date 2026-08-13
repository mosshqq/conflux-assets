import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { VSwapPosition, VSwapToken } from '../../domain/types';
import { VSwapPositionDetails } from './VSwapPositionDetails';

const token0: VSwapToken = {
  address: '0x4000000000000000000000000000000000000004',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
};
const token1: VSwapToken = {
  address: '0x5000000000000000000000000000000000000005',
  name: 'Wrapped CFX',
  symbol: 'WCFX',
  decimals: 18,
};
const position: VSwapPosition = {
  discovered: {
    tokenId: 7n,
    owner: '0x1000000000000000000000000000000000000001',
    poolAddress: '0x2000000000000000000000000000000000000002',
  },
  feeTier: 500,
  tickLower: -10,
  tickUpper: 10,
  currentTick: 0,
  sqrtPriceX96: 1n << 96n,
  liquidity: 1_000_000n,
  status: 'in-range',
  token0Amount: { token: token0, amount: 2_000_000n },
  token1Amount: { token: token1, amount: 3n * 10n ** 18n },
  unclaimedFee0: { token: token0, amount: 10_000n },
  unclaimedFee1: { token: token1, amount: 20_000_000_000_000_000n },
  rewards: [
    {
      token: token1,
      unsettledAmount: 300_000_000_000_000_000n,
      settledAmount: 200_000_000_000_000_000n,
      totalAmount: 500_000_000_000_000_000n,
      estimatedDailyAmount: 1n * 10n ** 18n,
      activeIncentiveCount: 2,
    },
  ],
  warnings: [],
};

describe('VSwapPositionDetails', () => {
  it('switches the current price and full range between token directions', async () => {
    const user = userEvent.setup();
    render(<VSwapPositionDetails position={position} onRetry={vi.fn()} />);

    expect(screen.getByText(/所有价格均表示 1 USDC/)).toBeVisible();
    expect(screen.getByText('0.000000000001')).toBeVisible();
    expect(screen.getByText(/完整 Tick 区间 \[-10, 10\)/)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'USDC / WCFX' }));

    expect(screen.getByText(/所有价格均表示 1 WCFX/)).toBeVisible();
    expect(screen.getByText('1,000,000,000,000')).toBeVisible();
  });

  it('shows accrued rewards and the bigint daily estimate for active incentives', () => {
    render(<VSwapPositionDetails position={position} onRetry={vi.fn()} />);

    expect(screen.getByText('0.5 WCFX')).toBeVisible();
    expect(screen.getByText('1 WCFX')).toBeVisible();
    expect(screen.getByText(/2 个活动 incentive/)).toBeVisible();
  });

  it('shows zero projected rewards while the position is out of range', () => {
    render(
      <VSwapPositionDetails
        position={{ ...position, status: 'out-of-range', currentTick: 20 }}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText('0 WCFX')).toBeVisible();
    expect(screen.getByText(/当前仓位不在价格区间内/)).toBeVisible();
  });

  it('does not assert that there are no active incentives after a partial read', () => {
    render(
      <VSwapPositionDetails
        position={{
          ...position,
          rewards: [{ ...position.rewards[0]!, activeIncentiveCount: null }],
          warnings: ['奖励计划读取失败'],
        }}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText(/活动 incentive 数量无法完整判断/)).toBeVisible();
    expect(screen.queryByText('当前没有活动 incentive。')).not.toBeInTheDocument();
  });

  it('marks fee amounts as lower bounds when optional reads are incomplete', () => {
    render(
      <VSwapPositionDetails
        position={{
          ...position,
          unclaimedFee0: { ...position.unclaimedFee0, amount: 0n },
          unclaimedFee1: { ...position.unclaimedFee1, amount: 0n },
          warnings: ['未领取手续费模拟读取失败'],
        }}
        onRetry={vi.fn()}
      />,
    );

    const feeSection = screen.getByRole('heading', { name: '未领取手续费' }).closest('section');
    expect(feeSection).not.toBeNull();
    expect(within(feeSection!).getByText('≥ 0 USDC')).toBeVisible();
    expect(within(feeSection!).getByText('≥ 0 WCFX')).toBeVisible();
  });

  it('preserves an unknown daily estimate while the position is out of range', () => {
    render(
      <VSwapPositionDetails
        position={{
          ...position,
          status: 'out-of-range',
          currentTick: 20,
          rewards: [
            {
              ...position.rewards[0]!,
              estimatedDailyAmount: null,
              activeIncentiveCount: null,
            },
          ],
          warnings: ['最新区块时间读取失败，无法估算每日 farming 奖励'],
        }}
        onRetry={vi.fn()}
      />,
    );

    const farmingSection = screen.getByRole('heading', { name: 'Farming 奖励' }).closest('section');
    expect(farmingSection).not.toBeNull();
    expect(within(farmingSection!).getByText('—')).toBeVisible();
    expect(within(farmingSection!).queryByText('0 WCFX')).not.toBeInTheDocument();
    expect(screen.getByText(/活动 incentive 数量无法完整判断/)).toBeVisible();
  });
});
