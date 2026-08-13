import type {
  ESpaceAddress,
  VSwapPosition,
  VSwapPositionStatus,
  VSwapToken,
  VSwapTokenAmount,
} from './types';

const MAX_TICK = 887272;
const Q32 = 1n << 32n;
const Q96 = 1n << 96n;
const Q192 = 1n << 192n;
const MAX_UINT256 = (1n << 256n) - 1n;
const SECONDS_PER_DAY = 86_400n;

const TICK_MULTIPLIERS = [
  [0x2, 0xfff97272373d413259a46990580e213an],
  [0x4, 0xfff2e50f5f656932ef12357cf3c7fdccn],
  [0x8, 0xffe5caca7e10e4e61c3624eaa0941cd0n],
  [0x10, 0xffcb9843d60f6159c9db58835c926644n],
  [0x20, 0xff973b41fa98c081472e6896dfb254c0n],
  [0x40, 0xff2ea16466c96a3843ec78b326b52861n],
  [0x80, 0xfe5dee046a99a2a811c461f1969c3053n],
  [0x100, 0xfcbe86c7900a88aedcffc83b479aa3a4n],
  [0x200, 0xf987a7253ac413176f2b074cf7815e54n],
  [0x400, 0xf3392b0822b70005940c7a398e4b70f3n],
  [0x800, 0xe7159475a2c29b7443b29c7fa6e889d9n],
  [0x1000, 0xd097f3bdfd2022b8845ad8f792aa5825n],
  [0x2000, 0xa9f746462d870fdf8a65dc1f90e061e5n],
  [0x4000, 0x70d869a156d2a1b890bb3df62baf32f7n],
  [0x8000, 0x31be135f97d08fd981231505542fcfa6n],
  [0x10000, 0x9aa508b5b7a84e1c677de54f3e99bc9n],
  [0x20000, 0x5d6af8dedb81196699c329225ee604n],
  [0x40000, 0x2216e584f5fa1ea926041bedfe98n],
  [0x80000, 0x48a170391f7dc42444e8fa2n],
] as const;

export function getSqrtRatioAtTick(tick: number): bigint {
  if (!Number.isInteger(tick) || Math.abs(tick) > MAX_TICK) {
    throw new Error('vSwap tick 超出有效范围');
  }

  const absoluteTick = Math.abs(tick);
  let ratio =
    absoluteTick & 1 ? 0xfffcb933bd6fad37aa2d162d1a594001n : 0x100000000000000000000000000000000n;

  for (const [mask, multiplier] of TICK_MULTIPLIERS) {
    if (absoluteTick & mask) ratio = (ratio * multiplier) >> 128n;
  }
  if (tick > 0) ratio = MAX_UINT256 / ratio;

  return (ratio >> 32n) + (ratio % Q32 === 0n ? 0n : 1n);
}

function amount0ForLiquidity(sqrtA: bigint, sqrtB: bigint, liquidity: bigint): bigint {
  return ((liquidity << 96n) * (sqrtB - sqrtA)) / sqrtB / sqrtA;
}

function amount1ForLiquidity(sqrtA: bigint, sqrtB: bigint, liquidity: bigint): bigint {
  return (liquidity * (sqrtB - sqrtA)) / Q96;
}

export function calculatePositionAmounts({
  liquidity,
  sqrtPriceX96,
  tickLower,
  tickUpper,
}: {
  liquidity: bigint;
  sqrtPriceX96: bigint;
  tickLower: number;
  tickUpper: number;
}): [bigint, bigint] {
  if (liquidity === 0n) return [0n, 0n];
  const sqrtLower = getSqrtRatioAtTick(tickLower);
  const sqrtUpper = getSqrtRatioAtTick(tickUpper);

  if (sqrtPriceX96 <= sqrtLower) {
    return [amount0ForLiquidity(sqrtLower, sqrtUpper, liquidity), 0n];
  }
  if (sqrtPriceX96 < sqrtUpper) {
    return [
      amount0ForLiquidity(sqrtPriceX96, sqrtUpper, liquidity),
      amount1ForLiquidity(sqrtLower, sqrtPriceX96, liquidity),
    ];
  }
  return [0n, amount1ForLiquidity(sqrtLower, sqrtUpper, liquidity)];
}

export function resolveVSwapPositionStatus(
  liquidity: bigint,
  currentTick: number,
  tickLower: number,
  tickUpper: number,
): VSwapPositionStatus {
  if (liquidity === 0n) return 'closed';
  return currentTick >= tickLower && currentTick < tickUpper ? 'in-range' : 'out-of-range';
}

export type VSwapPriceDirection = 'token1-per-token0' | 'token0-per-token1';

export interface VSwapPriceRatio {
  numerator: bigint;
  denominator: bigint;
}

export interface VSwapPriceRange {
  minimum: VSwapPriceRatio;
  current: VSwapPriceRatio;
  maximum: VSwapPriceRatio;
}

function validateTokenDecimals(decimals: number): void {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new Error('vSwap 代币精度无效');
  }
}

export function calculateVSwapPrice(
  sqrtPriceX96: bigint,
  token0Decimals: number,
  token1Decimals: number,
  direction: VSwapPriceDirection,
): VSwapPriceRatio {
  if (sqrtPriceX96 <= 0n) throw new Error('vSwap 平方根价格无效');
  validateTokenDecimals(token0Decimals);
  validateTokenDecimals(token1Decimals);

  const squaredPrice = sqrtPriceX96 * sqrtPriceX96;
  const token0Scale = 10n ** BigInt(token0Decimals);
  const token1Scale = 10n ** BigInt(token1Decimals);
  const token1PerToken0 = {
    numerator: squaredPrice * token0Scale,
    denominator: Q192 * token1Scale,
  };

  return direction === 'token1-per-token0'
    ? token1PerToken0
    : {
        numerator: token1PerToken0.denominator,
        denominator: token1PerToken0.numerator,
      };
}

export function calculateVSwapPriceRange({
  sqrtPriceX96,
  tickLower,
  tickUpper,
  token0Decimals,
  token1Decimals,
  direction,
}: {
  sqrtPriceX96: bigint;
  tickLower: number;
  tickUpper: number;
  token0Decimals: number;
  token1Decimals: number;
  direction: VSwapPriceDirection;
}): VSwapPriceRange {
  if (tickLower >= tickUpper) throw new Error('vSwap 价格区间无效');
  const lowerTickPrice = calculateVSwapPrice(
    getSqrtRatioAtTick(tickLower),
    token0Decimals,
    token1Decimals,
    direction,
  );
  const upperTickPrice = calculateVSwapPrice(
    getSqrtRatioAtTick(tickUpper),
    token0Decimals,
    token1Decimals,
    direction,
  );

  return {
    minimum: direction === 'token1-per-token0' ? lowerTickPrice : upperTickPrice,
    current: calculateVSwapPrice(sqrtPriceX96, token0Decimals, token1Decimals, direction),
    maximum: direction === 'token1-per-token0' ? upperTickPrice : lowerTickPrice,
  };
}

export function formatVSwapPrice(
  price: VSwapPriceRatio,
  significantDigits = 8,
  maximumFractionDigits = 24,
): string {
  if (price.numerator < 0n || price.denominator <= 0n) {
    throw new Error('vSwap 价格比例无效');
  }
  if (!Number.isInteger(significantDigits) || significantDigits < 1) {
    throw new Error('vSwap 价格有效位数无效');
  }
  if (!Number.isInteger(maximumFractionDigits) || maximumFractionDigits < 0) {
    throw new Error('vSwap 价格小数位数无效');
  }
  if (price.numerator === 0n) return '0';

  const whole = price.numerator / price.denominator;
  let fractionDigits: number;
  if (whole > 0n) {
    fractionDigits = Math.min(
      maximumFractionDigits,
      Math.max(0, significantDigits - whole.toString().length),
    );
  } else {
    let scaledNumerator = price.numerator;
    let leadingZeroCount = 0;
    while (scaledNumerator < price.denominator && leadingZeroCount < maximumFractionDigits) {
      scaledNumerator *= 10n;
      if (scaledNumerator < price.denominator) leadingZeroCount += 1;
    }
    if (scaledNumerator < price.denominator) {
      return maximumFractionDigits === 0
        ? '< 1'
        : `< 0.${'0'.repeat(Math.max(0, maximumFractionDigits - 1))}1`;
    }
    fractionDigits = Math.min(maximumFractionDigits, leadingZeroCount + significantDigits);
  }

  const scale = 10n ** BigInt(fractionDigits);
  const rounded = (price.numerator * scale + price.denominator / 2n) / price.denominator;
  if (rounded === 0n) {
    return fractionDigits === 0 ? '< 1' : `< 0.${'0'.repeat(fractionDigits - 1)}1`;
  }

  const roundedWhole = rounded / scale;
  if (fractionDigits === 0) return roundedWhole.toLocaleString('en-US');
  const fraction = (rounded % scale).toString().padStart(fractionDigits, '0').replace(/0+$/, '');
  return `${roundedWhole.toLocaleString('en-US')}${fraction ? `.${fraction}` : ''}`;
}

export function isVSwapIncentiveActive(
  startTime: bigint,
  endTime: bigint,
  blockTimestamp: bigint,
): boolean {
  return blockTimestamp >= startTime && blockTimestamp < endTime;
}

export function estimateDailyVSwapReward(rewardsPerSecondX32: bigint): bigint {
  if (rewardsPerSecondX32 < 0n) throw new Error('vSwap 奖励速率不能为负数');
  return (rewardsPerSecondX32 * SECONDS_PER_DAY) / Q32;
}

export function aggregateVSwapAmounts(
  positions: VSwapPosition[],
  select: (position: VSwapPosition) => VSwapTokenAmount[],
): VSwapTokenAmount[] {
  const totals = new Map<
    string,
    {
      token: VSwapToken;
      amount: bigint;
    }
  >();

  for (const position of positions) {
    for (const item of select(position)) {
      const key = item.token.address.toLowerCase() as ESpaceAddress;
      const current = totals.get(key);
      totals.set(key, {
        token: current?.token ?? item.token,
        amount: (current?.amount ?? 0n) + item.amount,
      });
    }
  }

  return [...totals.values()].filter((item) => item.amount > 0n);
}
