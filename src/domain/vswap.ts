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
const MAX_UINT256 = (1n << 256n) - 1n;

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
