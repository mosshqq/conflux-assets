import { Conflux } from 'js-conflux-sdk';
import { CORE_NETWORK } from '../../config/network';
import { POS_POOL_ABI } from '../../config/posPoolAbi';
import { addGasMargin, DRIP_PER_VOTE, toBigInt, toHex } from '../../domain/money';
import type {
  PoolAction,
  PoolConfig,
  PoolOverview,
  PoolPosition,
  PreparedTransaction,
  UnlockQueueItem,
} from '../../domain/types';

export const conflux = new Conflux({
  url: CORE_NETWORK.rpcUrl,
  networkId: CORE_NETWORK.networkId,
  timeout: 20_000,
  retry: 1,
});

function contractAt(address: string): any {
  return conflux.Contract({
    abi: POS_POOL_ABI,
    address,
  });
}

async function callMethod(method: any): Promise<any> {
  if (typeof method?.call === 'function') return method.call();
  return method;
}

function field(value: any, name: string, index: number): unknown {
  return value?.[name] ?? value?.[index];
}

async function readExpectedPoolApy(contract: any): Promise<bigint | null> {
  try {
    return toBigInt(await callMethod(contract.poolAPY()));
  } catch {
    return null;
  }
}

export async function readCfxBalance(address: string): Promise<bigint> {
  return toBigInt(await conflux.getBalance(address));
}

export async function readCurrentBlock(): Promise<bigint> {
  const status = await conflux.getStatus();
  return toBigInt(status.blockNumber);
}

export async function readPoolPosition(
  pool: PoolConfig,
  userAddress: string,
): Promise<PoolPosition> {
  const contract = contractAt(pool.address);
  const [summary, interest, stakeQueue, unlockQueueData, lockInfo, expectedApyBps] =
    await Promise.all([
      callMethod(contract.userSummary(userAddress)),
      callMethod(contract.userInterest(userAddress)),
      callMethod(contract.userInQueue(userAddress)),
      callMethod(contract.userOutQueue(userAddress)),
      callMethod(contract.userLockInfo(userAddress)),
      readExpectedPoolApy(contract),
    ]);

  const totalVotes = toBigInt(field(summary, 'votes', 0) ?? 0);
  const activeVotes = toBigInt(field(summary, 'available', 1) ?? 0);
  const lockedVotes = toBigInt(field(summary, 'locked', 2) ?? 0);
  const unlockedVotes = toBigInt(field(summary, 'unlocked', 3) ?? 0);
  const pendingVotesRaw = totalVotes - activeVotes - unlockedVotes;
  const stakeLockQueue = Array.isArray(stakeQueue)
    ? stakeQueue.map((item) => ({
        votes: toBigInt(field(item, 'votePower', 0) ?? 0),
        lockBlock: toBigInt(field(item, 'endBlockNumber', 1) ?? 0),
      }))
    : [];
  const unlockQueue: UnlockQueueItem[] = Array.isArray(unlockQueueData)
    ? unlockQueueData.map((item) => ({
        votes: toBigInt(field(item, 'votePower', 0) ?? 0),
        unlockBlock: toBigInt(field(item, 'endBlockNumber', 1) ?? 0),
      }))
    : [];

  return {
    pool,
    expectedApyBps,
    totalVotes,
    activeVotes,
    lockedVotes,
    pendingVotes: pendingVotesRaw > 0n ? pendingVotesRaw : 0n,
    unlockedVotes,
    governanceLockedDrip: toBigInt(field(lockInfo, 'amount', 0) ?? 0),
    governanceUnlockBlock: toBigInt(field(lockInfo, 'unlockBlockNumber', 1) ?? 0),
    claimableDrip: toBigInt(interest),
    stakeLockQueue,
    unlockQueue,
  };
}

export async function readPoolOverview(pool: PoolConfig): Promise<PoolOverview> {
  const contract = contractAt(pool.address);
  const [summary, expectedApyBps] = await Promise.all([
    callMethod(contract.poolSummary()),
    readExpectedPoolApy(contract),
  ]);

  return {
    pool,
    expectedApyBps,
    totalStakedVotes: toBigInt(field(summary, 'available', 0) ?? 0),
  };
}

export async function validateStandardPool(address: string): Promise<{ name: string }> {
  const contract = contractAt(address);
  const [name, summary, userSummary, interest] = await Promise.all([
    callMethod(contract.poolName()),
    callMethod(contract.poolSummary()),
    callMethod(contract.userSummary(address)),
    callMethod(contract.userInterest(address)),
  ]);

  if (typeof name !== 'string') throw new Error('合约的 poolName 返回类型无效');
  if (!summary || !userSummary) {
    throw new Error('合约不符合标准 PoS Pool ABI');
  }
  toBigInt(interest);
  return { name: name.trim() };
}

export async function preparePoolTransaction(input: {
  poolAddress: string;
  from: string;
  action: PoolAction;
  votes?: bigint;
  valueDrip?: bigint;
}): Promise<PreparedTransaction> {
  const { poolAddress, from, action, votes = 0n, valueDrip = 0n } = input;
  const contract = contractAt(poolAddress);

  let method: any;
  if (action === 'stake') method = contract.increaseStake(votes.toString());
  if (action === 'unstake') method = contract.decreaseStake(votes.toString());
  if (action === 'claim') method = contract.claimAllInterest();
  if (action === 'withdraw') method = contract.withdrawStake(votes.toString());
  if (!method) throw new Error('不支持的交易类型');

  const estimate = await method.estimateGasAndCollateral({
    from,
    value: valueDrip.toString(),
  });
  const estimatedGas = toBigInt(estimate.gasLimit ?? estimate.gasUsed ?? 0);
  const estimatedStorage = toBigInt(estimate.storageCollateralized ?? 0);
  const gasPrice = toBigInt(await conflux.getGasPrice());

  return {
    to: poolAddress,
    data: method.data,
    value: toHex(valueDrip),
    gas: estimatedGas > 0n ? toHex(addGasMargin(estimatedGas)) : undefined,
    gasPrice: toHex(gasPrice),
    storageLimit: estimatedStorage > 0n ? toHex(addGasMargin(estimatedStorage)) : undefined,
  };
}

export async function waitForTransactionReceipt(
  transactionHash: string,
  timeoutMs = 120_000,
): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const receipt = await conflux.getTransactionReceipt(transactionHash);
    if (receipt) {
      if (Number(receipt.outcomeStatus) !== 0) {
        throw new Error(`交易执行失败，状态码 ${receipt.outcomeStatus}`);
      }
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1_500));
  }

  throw new Error('等待交易回执超时，请稍后在浏览器中查看');
}

export function votesForStakeValue(valueDrip: bigint): bigint {
  return valueDrip / DRIP_PER_VOTE;
}
