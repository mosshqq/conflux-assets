import { GAS_RESERVE_DRIP, isWholeVoteAmount, votesToDrip } from './money';
import { maxUnstakeVotes } from './portfolio';
import type { PoolPosition } from './types';

export function validateStakeAmount(valueDrip: bigint, balanceDrip: bigint): bigint {
  if (!isWholeVoteAmount(valueDrip)) {
    throw new Error('数量必须是 1000 CFX 的正整数倍');
  }
  if (balanceDrip < valueDrip + GAS_RESERVE_DRIP) {
    throw new Error('余额不足；需额外保留至少 1 CFX 支付费用');
  }
  return valueDrip / (1000n * 10n ** 18n);
}

export function validateUnstakeAmount(valueDrip: bigint, position: PoolPosition): bigint {
  if (!isWholeVoteAmount(valueDrip)) {
    throw new Error('数量必须是 1000 CFX 的正整数倍');
  }
  const requestedVotes = valueDrip / (1000n * 10n ** 18n);
  const availableVotes = maxUnstakeVotes(position);
  if (requestedVotes > availableVotes) {
    throw new Error(`最多可发起解质押 ${availableVotes.toString()} 票`);
  }
  return requestedVotes;
}

export function withdrawableDrip(position: PoolPosition): bigint {
  return votesToDrip(position.unlockedVotes);
}
