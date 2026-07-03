import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { VSwapDiscoveredPosition, VSwapPosition, VSwapToken } from '../../domain/types';
import { VSwapPositionsSection } from './VSwapPositionsSection';

const owner = '0x1000000000000000000000000000000000000001';
const discovered: VSwapDiscoveredPosition[] = [
  {
    tokenId: 7n,
    owner,
    poolAddress: '0x2000000000000000000000000000000000000002',
  },
  {
    tokenId: 8n,
    owner,
    poolAddress: '0x3000000000000000000000000000000000000003',
  },
];
const token0: VSwapToken = {
  address: '0x4000000000000000000000000000000000000004',
  name: 'Token Zero',
  symbol: 'TK0',
  decimals: 6,
};
const token1: VSwapToken = {
  address: '0x5000000000000000000000000000000000000005',
  name: 'Token One',
  symbol: 'TK1',
  decimals: 18,
};
const position: VSwapPosition = {
  discovered: discovered[0],
  feeTier: 500,
  tickLower: -10,
  tickUpper: 10,
  currentTick: 0,
  liquidity: 1n,
  status: 'in-range',
  token0Amount: { token: token0, amount: 1_250_000n },
  token1Amount: { token: token1, amount: 2n * 10n ** 18n },
  unclaimedFee0: { token: token0, amount: 10_000n },
  unclaimedFee1: { token: token1, amount: 0n },
  rewards: [
    {
      token: token0,
      unsettledAmount: 30_000n,
      settledAmount: 20_000n,
      totalAmount: 50_000n,
    },
  ],
  warnings: [],
};

describe('VSwapPositionsSection', () => {
  it('renders token amounts and marks partial aggregates as lower bounds', () => {
    render(
      <VSwapPositionsSection
        discoveryQuery={
          {
            data: discovered,
            isPending: false,
            isError: false,
            refetch: vi.fn(),
          } as never
        }
        positionQueries={
          [
            {
              data: position,
              isPending: false,
              isError: false,
              refetch: vi.fn(),
            },
            {
              data: undefined,
              error: new Error('RPC failed'),
              isPending: false,
              isError: true,
              refetch: vi.fn(),
            },
          ] as never
        }
      />,
    );

    expect(screen.getByText('vSwap LP Farming')).toBeVisible();
    expect(screen.getByText('TK0/TK1')).toBeVisible();
    expect(screen.getByText('仓位汇总不完整')).toBeVisible();
    expect(screen.getByText('≥ 1.25 TK0')).toBeVisible();
    expect(screen.getByText('≥ 0.05 TK0')).toBeVisible();
    expect(screen.getByText('vSwap NFT #8')).toBeVisible();
    expect(screen.getByRole('button', { name: '重试该仓位' })).toBeVisible();
  });
});
