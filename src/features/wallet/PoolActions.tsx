import { useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CORE_NETWORK } from '../../config/network';
import { formatCfx, parseCfx, votesToDrip } from '../../domain/money';
import { maxUnstakeVotes } from '../../domain/portfolio';
import {
  validateStakeAmount,
  validateTransactionBalance,
  validateUnstakeAmount,
} from '../../domain/transactions';
import type { PoolAction, PoolConfig, PoolPosition } from '../../domain/types';
import {
  preparePoolTransaction,
  waitForTransactionReceipt,
} from '../../infrastructure/conflux/client';
import { Modal } from '../../components/Modal';
import { useCoreWallet } from './useCoreWallet';

const ACTION_LABELS: Record<PoolAction, string> = {
  stake: '增加质押',
  unstake: '发起解质押',
  claim: '领取全部收益',
  withdraw: '提取已解锁本金',
};

interface PendingAction {
  action: PoolAction;
  votes: bigint;
  valueDrip: bigint;
  displayAmount: string;
}

export function PoolActions({
  address,
  pool,
  position,
  walletBalanceDrip,
}: {
  address: string;
  pool: PoolConfig;
  position: PoolPosition;
  walletBalanceDrip: bigint;
}) {
  const queryClient = useQueryClient();
  const wallet = useCoreWallet(address);
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [receiptState, setReceiptState] = useState<'idle' | 'waiting' | 'success'>('idle');
  const unstakeableVotes = useMemo(() => maxUnstakeVotes(position), [position]);

  function requireWallet() {
    if (wallet.status === 'not-installed') throw new Error('请先安装 Fluent 钱包');
    if (wallet.status !== 'active') throw new Error('请先连接 Fluent 钱包');
    if (!wallet.isExpectedNetwork) {
      throw new Error(`请在 Fluent 中切换到 Conflux Core Space ${CORE_NETWORK.label}`);
    }
    if (!wallet.isMatchingAccount) throw new Error('连接账户与当前查看地址不一致');
  }

  function createAmountAction(action: 'stake' | 'unstake', amount: string): PendingAction {
    requireWallet();
    const valueDrip = parseCfx(amount);
    const votes =
      action === 'stake'
        ? validateStakeAmount(valueDrip, walletBalanceDrip)
        : validateUnstakeAmount(valueDrip, position);

    if (action === 'unstake' && votes > unstakeableVotes) {
      throw new Error(`最多可发起解质押 ${unstakeableVotes.toString()} 票`);
    }

    return {
      action,
      votes,
      valueDrip: action === 'stake' ? valueDrip : 0n,
      displayAmount: `${formatCfx(valueDrip)} CFX（${votes.toString()} 票）`,
    };
  }

  function requestAction(action: PoolAction) {
    setError('');
    try {
      if (action === 'stake') setPending(createAmountAction(action, stakeAmount));
      if (action === 'unstake') setPending(createAmountAction(action, unstakeAmount));
      if (action === 'claim') {
        requireWallet();
        if (position.claimableDrip <= 0n) throw new Error('当前没有可领取收益');
        setPending({
          action,
          votes: 0n,
          valueDrip: 0n,
          displayAmount: `${formatCfx(position.claimableDrip, 6)} CFX`,
        });
      }
      if (action === 'withdraw') {
        requireWallet();
        if (position.unlockedVotes <= 0n) throw new Error('当前没有可提取本金');
        setPending({
          action,
          votes: position.unlockedVotes,
          valueDrip: 0n,
          displayAmount: `${formatCfx(votesToDrip(position.unlockedVotes))} CFX`,
        });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '操作校验失败');
    }
  }

  async function confirmAction(event?: FormEvent) {
    event?.preventDefault();
    if (!pending || !wallet.account) return;
    setSubmitting(true);
    setError('');
    setTransactionHash('');

    try {
      const transaction = await preparePoolTransaction({
        poolAddress: pool.address,
        from: wallet.account,
        action: pending.action,
        votes: pending.votes,
        valueDrip: pending.valueDrip,
      });
      validateTransactionBalance(transaction, walletBalanceDrip);
      const hash = await wallet.sendTransaction(transaction);
      setTransactionHash(hash);
      setPending(null);
      setReceiptState('waiting');
      await waitForTransactionReceipt(hash);
      setReceiptState('success');
      await queryClient.invalidateQueries({ queryKey: ['position', address, pool.address] });
      await queryClient.invalidateQueries({ queryKey: ['balance', address] });
      setStakeAmount('');
      setUnstakeAmount('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '交易提交失败');
      setReceiptState('idle');
    } finally {
      setSubmitting(false);
    }
  }

  const walletMessage =
    wallet.status === 'not-installed'
      ? '未检测到 Fluent'
      : wallet.status !== 'active'
        ? '连接 Fluent 后可操作'
        : !wallet.isExpectedNetwork
          ? `钱包网络不是 Core Space ${CORE_NETWORK.label}`
          : !wallet.isMatchingAccount
            ? '连接账户与查看地址不一致，仅可查看'
            : '账户已匹配，可以安全发起交易';

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold">钱包操作</h2>
          <p className={`mt-1 text-sm ${wallet.canTransact ? 'text-accent' : 'text-muted'}`}>
            {walletMessage}
          </p>
        </div>
        {wallet.status === 'not-installed' ? (
          <a
            href="https://fluentwallet.com/"
            target="_blank"
            rel="noreferrer"
            className="primary-button"
          >
            安装 Fluent
          </a>
        ) : !wallet.canTransact ? (
          <button
            type="button"
            onClick={() => void wallet.connect()}
            className="primary-button"
            disabled={wallet.status === 'in-activating'}
          >
            连接 Fluent
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line p-4">
          <p className="font-medium">增加质押</p>
          <p className="mt-1 text-xs text-muted">
            1000 CFX 为一票；签名前按 gas 与存储抵押估算校验余额。
          </p>
          <div className="mt-4 flex">
            <input
              value={stakeAmount}
              onChange={(event) => setStakeAmount(event.target.value)}
              placeholder="CFX 数量"
              inputMode="decimal"
              disabled={!wallet.canTransact}
              className="field min-w-0 flex-1 rounded-r-none"
            />
            <button
              type="button"
              onClick={() => requestAction('stake')}
              disabled={!wallet.canTransact}
              className="primary-button rounded-l-none"
            >
              质押
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-line p-4">
          <p className="font-medium">发起解质押</p>
          <p className="mt-1 text-xs text-muted">
            当前最多 {unstakeableVotes.toString()} 票；治理锁定部分不可解质押。
          </p>
          <div className="mt-4 flex">
            <input
              value={unstakeAmount}
              onChange={(event) => setUnstakeAmount(event.target.value)}
              placeholder="CFX 数量"
              inputMode="decimal"
              disabled={!wallet.canTransact}
              className="field min-w-0 flex-1 rounded-r-none"
            />
            <button
              type="button"
              onClick={() => requestAction('unstake')}
              disabled={!wallet.canTransact}
              className="primary-button rounded-l-none"
            >
              解质押
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => requestAction('claim')}
          disabled={!wallet.canTransact || position.claimableDrip <= 0n}
          className="rounded-xl border border-line p-4 text-left transition hover:border-accent/40 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="font-medium">领取全部收益</span>
          <span className="mt-1 block text-sm text-accent">
            {formatCfx(position.claimableDrip, 6)} CFX
          </span>
        </button>

        <button
          type="button"
          onClick={() => requestAction('withdraw')}
          disabled={!wallet.canTransact || position.unlockedVotes <= 0n}
          className="rounded-xl border border-line p-4 text-left transition hover:border-accent/40 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="font-medium">提取全部已解锁本金</span>
          <span className="mt-1 block text-sm text-accent">
            {formatCfx(votesToDrip(position.unlockedVotes))} CFX
          </span>
        </button>
      </div>

      {error && !pending ? (
        <p className="mt-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>
      ) : null}

      {transactionHash ? (
        <div className="mt-4 rounded-xl bg-accent/10 p-4 text-sm">
          <p className="font-medium text-accent">
            {receiptState === 'waiting' ? '交易已提交，等待执行…' : '交易执行成功'}
          </p>
          <a
            href={`${CORE_NETWORK.explorerUrl}/transaction/${transactionHash}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block break-all font-mono text-xs text-foreground underline"
          >
            {transactionHash}
          </a>
        </div>
      ) : null}

      <Modal
        open={Boolean(pending)}
        title={pending ? `确认${ACTION_LABELS[pending.action]}` : '确认交易'}
        onClose={() => !submitting && setPending(null)}
      >
        {pending ? (
          <form onSubmit={confirmAction}>
            <dl className="space-y-3 rounded-xl bg-surface p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">PoS 池</dt>
                <dd className="text-right">{pool.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">操作</dt>
                <dd>{ACTION_LABELS[pending.action]}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">数量</dt>
                <dd className="text-right">{pending.displayAmount}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs leading-5 text-muted">
              确认后将先估算 gas 与存储抵押，再由 Fluent 展示最终签名请求。
            </p>
            {error ? (
              <p className="mt-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setPending(null)}
                disabled={submitting}
              >
                取消
              </button>
              <button type="submit" className="primary-button" disabled={submitting}>
                {submitting ? '准备交易中…' : '在 Fluent 中确认'}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
    </section>
  );
}
