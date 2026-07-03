import { describe, expect, it } from 'vitest';
import type { VSwapPosition, VSwapToken } from './types';
import {
  aggregateVSwapAmounts,
  calculatePositionAmounts,
  getSqrtRatioAtTick,
  resolveVSwapPositionStatus,
} from './vswap';

const token: VSwapToken = {
  address: '0x1000000000000000000000000000000000000001',
  name: 'Token',
  symbol: 'TOK',
  decimals: 18,
};

describe('vSwap domain', () => {
  it('uses canonical Uniswap V3 sqrt ratios', () => {
    expect(getSqrtRatioAtTick(0)).toBe(1n << 96n);
    expect(getSqrtRatioAtTick(1)).toBe(79232123823359799118286999568n);
    expect(getSqrtRatioAtTick(-1)).toBe(79224201403219477170569942574n);
    expect(() => getSqrtRatioAtTick(887273)).toThrow('超出有效范围');
  });

  it('calculates token amounts below, inside, and above the range', () => {
    const liquidity = 10n ** 18n;
    const common = { liquidity, tickLower: -60, tickUpper: 60 };

    const below = calculatePositionAmounts({
      ...common,
      sqrtPriceX96: getSqrtRatioAtTick(-120),
    });
    expect(below[0]).toBeGreaterThan(0n);
    expect(below[1]).toBe(0n);

    const inside = calculatePositionAmounts({
      ...common,
      sqrtPriceX96: getSqrtRatioAtTick(0),
    });
    expect(inside[0]).toBeGreaterThan(0n);
    expect(inside[1]).toBeGreaterThan(0n);

    const above = calculatePositionAmounts({
      ...common,
      sqrtPriceX96: getSqrtRatioAtTick(120),
    });
    expect(above[0]).toBe(0n);
    expect(above[1]).toBeGreaterThan(0n);
  });

  it('resolves range status with an exclusive upper tick', () => {
    expect(resolveVSwapPositionStatus(0n, 0, -10, 10)).toBe('closed');
    expect(resolveVSwapPositionStatus(1n, -10, -10, 10)).toBe('in-range');
    expect(resolveVSwapPositionStatus(1n, 9, -10, 10)).toBe('in-range');
    expect(resolveVSwapPositionStatus(1n, 10, -10, 10)).toBe('out-of-range');
  });

  it('aggregates token amounts by address with bigint arithmetic', () => {
    const base = {
      token0Amount: { token, amount: 2n },
      token1Amount: { token: { ...token, symbol: 'duplicate' }, amount: 3n },
    } as VSwapPosition;
    expect(
      aggregateVSwapAmounts([base], (position) => [position.token0Amount, position.token1Amount]),
    ).toEqual([{ token, amount: 5n }]);
  });
});
