import { DRIP_PER_CFX, formatCfx, GAS_RESERVE_DRIP, isWholeVoteAmount, votesToDrip } from './money';
import { maxUnstakeVotes } from './portfolio';
import type { PoolPosition, PreparedTransaction } from './types';

const STORAGE_COLLATERAL_PER_BYTE_DRIP = DRIP_PER_CFX / 1024n;

function transactionField(value?: string): bigint {
  return value ? BigInt(value) : 0n;
}

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

export function maxTransactionCostDrip(transaction: PreparedTransaction): bigint {
  const value = transactionField(transaction.value);
  const gasCost = transactionField(transaction.gas) * transactionField(transaction.gasPrice);
  const storageCost = transactionField(transaction.storageLimit) * STORAGE_COLLATERAL_PER_BYTE_DRIP;
  return value + gasCost + storageCost;
}

export function validateTransactionBalance(
  transaction: PreparedTransaction,
  balanceDrip: bigint,
): void {
  const requiredDrip = maxTransactionCostDrip(transaction);
  if (balanceDrip < requiredDrip) {
    throw new Error(`余额不足；按 gas 与存储抵押估算最多需要 ${formatCfx(requiredDrip, 6)} CFX`);
  }
}

export function withdrawableDrip(position: PoolPosition): bigint {
  return votesToDrip(position.unlockedVotes);
}
