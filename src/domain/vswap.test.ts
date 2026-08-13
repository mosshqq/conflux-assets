import { describe, expect, it } from 'vitest';
import type { VSwapPosition, VSwapToken } from './types';
import {
  aggregateVSwapAmounts,
  calculatePositionAmounts,
  calculateVSwapPrice,
  calculateVSwapPriceRange,
  estimateDailyVSwapReward,
  formatVSwapPrice,
  getSqrtRatioAtTick,
  isVSwapIncentiveActive,
  resolveVSwapPositionStatus,
} from './vswap';

const token: VSwapToken = {
  address: '0x1000000000000000000000000000000000000001',
  name: 'Token',
  symbol: 'TOK',
  decimals: 18,
};

function expectRatioToEqual(
  actual: { numerator: bigint; denominator: bigint },
  expectedNumerator: bigint,
  expectedDenominator: bigint,
): void {
  expect(actual.numerator * expectedDenominator).toBe(expectedNumerator * actual.denominator);
}

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

  it('calculates tick-zero prices with equal and mixed token decimals', () => {
    const tickZeroPrice = getSqrtRatioAtTick(0);

    expectRatioToEqual(calculateVSwapPrice(tickZeroPrice, 18, 18, 'token1-per-token0'), 1n, 1n);
    expectRatioToEqual(
      calculateVSwapPrice(tickZeroPrice, 6, 18, 'token1-per-token0'),
      1n,
      10n ** 12n,
    );
    expectRatioToEqual(
      calculateVSwapPrice(tickZeroPrice, 6, 18, 'token0-per-token1'),
      10n ** 12n,
      1n,
    );
  });

  it('calculates reciprocal prices in both directions for positive and negative ticks', () => {
    const negativeForward = calculateVSwapPrice(
      getSqrtRatioAtTick(-120),
      18,
      18,
      'token1-per-token0',
    );
    const negativeReverse = calculateVSwapPrice(
      getSqrtRatioAtTick(-120),
      18,
      18,
      'token0-per-token1',
    );
    const positiveForward = calculateVSwapPrice(
      getSqrtRatioAtTick(120),
      18,
      18,
      'token1-per-token0',
    );
    const positiveReverse = calculateVSwapPrice(
      getSqrtRatioAtTick(120),
      18,
      18,
      'token0-per-token1',
    );

    expect(negativeForward.numerator).toBeLessThan(negativeForward.denominator);
    expect(negativeReverse.numerator).toBeGreaterThan(negativeReverse.denominator);
    expect(positiveForward.numerator).toBeGreaterThan(positiveForward.denominator);
    expect(positiveReverse.numerator).toBeLessThan(positiveReverse.denominator);
    expectRatioToEqual(negativeReverse, negativeForward.denominator, negativeForward.numerator);
    expectRatioToEqual(positiveReverse, positiveForward.denominator, positiveForward.numerator);
  });

  it('swaps price-range endpoints when the quote direction is reversed', () => {
    const common = {
      sqrtPriceX96: getSqrtRatioAtTick(0),
      tickLower: -120,
      tickUpper: 120,
      token0Decimals: 18,
      token1Decimals: 18,
    };
    const forward = calculateVSwapPriceRange({
      ...common,
      direction: 'token1-per-token0',
    });
    const reverse = calculateVSwapPriceRange({
      ...common,
      direction: 'token0-per-token1',
    });

    expect(forward.minimum.numerator * forward.maximum.denominator).toBeLessThan(
      forward.maximum.numerator * forward.minimum.denominator,
    );
    expect(reverse.minimum.numerator * reverse.maximum.denominator).toBeLessThan(
      reverse.maximum.numerator * reverse.minimum.denominator,
    );
    expectRatioToEqual(reverse.minimum, forward.maximum.denominator, forward.maximum.numerator);
    expectRatioToEqual(reverse.maximum, forward.minimum.denominator, forward.minimum.numerator);
    expectRatioToEqual(reverse.current, forward.current.denominator, forward.current.numerator);
  });

  it('formats very small prices without rounding them down to zero', () => {
    expect(formatVSwapPrice({ numerator: 1n, denominator: 10n ** 18n })).toBe(
      '0.000000000000000001',
    );
    expect(formatVSwapPrice({ numerator: 1n, denominator: 10n ** 30n })).toBe(
      `< 0.${'0'.repeat(23)}1`,
    );
    expect(formatVSwapPrice({ numerator: 1n, denominator: 10n ** 30n }, 8, 6)).toBe('< 0.000001');
  });

  it('treats incentive start as inclusive and end as exclusive', () => {
    expect(isVSwapIncentiveActive(100n, 200n, 99n)).toBe(false);
    expect(isVSwapIncentiveActive(100n, 200n, 100n)).toBe(true);
    expect(isVSwapIncentiveActive(100n, 200n, 199n)).toBe(true);
    expect(isVSwapIncentiveActive(100n, 200n, 200n)).toBe(false);
    expect(isVSwapIncentiveActive(100n, 200n, 201n)).toBe(false);
  });

  it('converts the summed Q32 reward rate only after aggregation', () => {
    const q32 = 1n << 32n;
    const secondsPerDay = 86_400n;
    const subUnitDailyRate = q32 / secondsPerDay;
    const separateDailyRewards = [subUnitDailyRate, subUnitDailyRate].map((rate) =>
      estimateDailyVSwapReward(rate),
    );

    expect(separateDailyRewards).toEqual([0n, 0n]);
    expect(estimateDailyVSwapReward(subUnitDailyRate + subUnitDailyRate)).toBe(1n);
    expect(estimateDailyVSwapReward(q32)).toBe(secondsPerDay);
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
