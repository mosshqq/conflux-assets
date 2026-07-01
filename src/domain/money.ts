export const CFX_DECIMALS = 18;
export const DRIP_PER_CFX = 10n ** 18n;
export const CFX_PER_VOTE = 1000n;
export const DRIP_PER_VOTE = CFX_PER_VOTE * DRIP_PER_CFX;
export const GAS_RESERVE_DRIP = DRIP_PER_CFX;

export function toBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('数值超出安全整数范围');
    return BigInt(value);
  }
  if (typeof value === 'string') return BigInt(value);
  if (value && typeof value === 'object') {
    const candidate = value as { _hex?: string; toString?: () => string };
    if (candidate._hex) return BigInt(candidate._hex);
    if (typeof candidate.toString === 'function') return BigInt(candidate.toString());
  }
  throw new Error('无法解析链上整数');
}

export function parseCfx(value: string): bigint {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,18})?$/.test(normalized)) {
    throw new Error('请输入最多 18 位小数的非负 CFX 数量');
  }

  const [whole, fraction = ''] = normalized.split('.');
  return BigInt(whole) * DRIP_PER_CFX + BigInt(fraction.padEnd(CFX_DECIMALS, '0'));
}

export function formatCfx(drip: bigint, maximumFractionDigits = 4): string {
  const negative = drip < 0n;
  const absolute = negative ? -drip : drip;
  const whole = absolute / DRIP_PER_CFX;
  const fraction = (absolute % DRIP_PER_CFX).toString().padStart(CFX_DECIMALS, '0');
  const trimmed = fraction.slice(0, maximumFractionDigits).replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole.toLocaleString('en-US')}${trimmed ? `.${trimmed}` : ''}`;
}

export function votesToDrip(votes: bigint): bigint {
  return votes * DRIP_PER_VOTE;
}

export function dripToVotes(drip: bigint): bigint {
  return drip / DRIP_PER_VOTE;
}

export function isWholeVoteAmount(drip: bigint): boolean {
  return drip > 0n && drip % DRIP_PER_VOTE === 0n;
}

export function addGasMargin(value: bigint): bigint {
  return (value * 110n + 99n) / 100n;
}

export function toHex(value: bigint): string {
  return `0x${value.toString(16)}`;
}

export function shortenAmount(value: bigint): string {
  return `${formatCfx(value, 4)} CFX`;
}
