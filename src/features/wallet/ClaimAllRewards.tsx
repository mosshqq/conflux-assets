import { useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CORE_NETWORK } from '../../config/network';
import { selectClaimCandidates } from '../../domain/claimAll';
import { DRIP_PER_CFX, formatCfx, parseCfx } from '../../domain/money';
import { validateTransactionBalance } from '../../domain/transactions';
import type { PoolPosition } from '../../domain/types';
import {
  preparePoolTransaction,
  readCfxBalance,
  waitForTransactionReceipt,
} from '../../infrastructure/conflux/client';
import {
  readMinimumClaimDrip,
  writeMinimumClaimDrip,
} from '../../infrastructure/storage/claimSettings';
import { Modal } from '../../components/Modal';
import { useCoreWallet } from './useCoreWallet';

interface CompletedClaim {
  pool: PoolPosition['pool'];
  transactionHash: string;
}

function cfxInputValue(drip: bigint): string {
  const whole = drip / DRIP_PER_CFX;
  const fraction = (drip % DRIP_PER_CFX).toString().padStart(18, '0').replace(/0+$/, '');
  return fraction ? `${whole.toString()}.${fraction}` : whole.toString();
}

export function ClaimAllRewards({
  address,
  positions,
  poolCount,
}: {
  address: string;
  positions: PoolPosition[];
  poolCount: number;
}) {
  const queryClient = useQueryClient();
  const wallet = useCoreWallet(address);
  const [minimumClaimDrip, setMinimumClaimDrip] = useState(() =>
    typeof window === 'undefined' ? 0n : readMinimumClaimDrip(),
  );
  const [thresholdInput, setThresholdInput] = useState(() => cfxInputValue(minimumClaimDrip));
  const [settingsError, setSettingsError] = useState('');
  const [pending, setPending] = useState<PoolPosition[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [completedClaims, setCompletedClaims] = useState<CompletedClaim[]>([]);

  const rewardPositions = useMemo(
    () => positions.filter((position) => position.claimableDrip > 0n),
    [positions],
  );
  const candidates = useMemo(
    () => selectClaimCandidates(positions, minimumClaimDrip),
    [minimumClaimDrip, positions],
  );
  const candidateTotalDrip = useMemo(
    () => candidates.reduce((total, position) => total + position.claimableDrip, 0n),
    [candidates],
  );
  const belowThresholdCount = rewardPositions.length - candidates.length;
  const unreadPoolCount = Math.max(poolCount - positions.length, 0);

  function requireWallet() {
    if (wallet.status === 'not-installed') throw new Error('请先安装 Fluent 钱包');
    if (wallet.status !== 'active') throw new Error('请先连接 Fluent 钱包');
    if (!wallet.isExpectedNetwork) {
      throw new Error(`请在 Fluent 中切换到 Conflux Core Space ${CORE_NETWORK.label}`);
    }
    if (!wallet.isMatchingAccount) throw new Error('连接账户与当前查看地址不一致');
  }

  function saveThreshold() {
    setSettingsError('');
    try {
      const nextMinimum = parseCfx(thresholdInput);
      writeMinimumClaimDrip(nextMinimum);
      setMinimumClaimDrip(nextMinimum);
      setThresholdInput(cfxInputValue(nextMinimum));
    } catch (caught) {
      setSettingsError(caught instanceof Error ? caught.message : '最低领取收益保存失败');
    }
  }

  function requestClaimAll() {
    setError('');
    try {
      requireWallet();
      if (candidates.length === 0) throw new Error('没有达到当前门槛的可领取收益');
      setPending(candidates);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '领取校验失败');
    }
  }

  async function connectWallet() {
    setError('');
    try {
      await wallet.connect();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '连接 Fluent 失败');
    }
  }

  async function switchWalletNetwork() {
    setError('');
    try {
      await wallet.switchNetwork();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '切换钱包网络失败');
    }
  }

  async function confirmClaimAll(event: FormEvent) {
    event.preventDefault();
    if (!pending || !wallet.account) return;

    setSubmitting(true);
    setError('');
    setCompletedClaims([]);
    let completedCount = 0;

    try {
      for (const position of pending) {
        const walletBalanceDrip = await readCfxBalance(wallet.account);
        const transaction = await preparePoolTransaction({
          poolAddress: position.pool.address,
          from: wallet.account,
          action: 'claim',
        });
        validateTransactionBalance(transaction, walletBalanceDrip);
        const transactionHash = await wallet.sendTransaction(transaction);
        await waitForTransactionReceipt(transactionHash);
        completedCount += 1;
        setCompletedClaims((current) => [...current, { pool: position.pool, transactionHash }]);
        await queryClient.invalidateQueries({
          queryKey: ['position', address, position.pool.address],
        });
        await queryClient.invalidateQueries({ queryKey: ['balance', address] });
      }
      setPending(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '交易提交失败';
      setPending(null);
      setError(
        completedCount > 0
          ? `已成功领取 ${completedCount}/${pending.length} 个池；其余池未发起交易：${message}`
          : message,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const walletMessage =
    wallet.status === 'not-installed'
      ? '未检测到 Fluent'
      : wallet.status !== 'active'
        ? '连接 Fluent 后可一键领取'
        : !wallet.isExpectedNetwork
          ? `钱包网络不是 Core Space ${CORE_NETWORK.label}`
          : !wallet.isMatchingAccount
            ? '连接账户与查看地址不一致，仅可查看'
            : '账户已匹配，可逐笔领取符合门槛的收益';

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold">一键领取收益</h2>
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
        ) : wallet.status === 'active' && !wallet.isExpectedNetwork ? (
          <button
            type="button"
            onClick={() => void switchWalletNetwork()}
            className="primary-button"
            disabled={wallet.isSwitchingNetwork}
          >
            {wallet.isSwitchingNetwork ? '切换中…' : '切换网络'}
          </button>
        ) : !wallet.canTransact ? (
          <button
            type="button"
            onClick={() => void connectWallet()}
            className="primary-button"
            disabled={wallet.status === 'in-activating'}
          >
            {wallet.status === 'in-activating' ? '连接中…' : '连接 Fluent'}
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <label className="block">
          <span className="text-sm font-medium">最低领取收益（CFX）</span>
          <span className="mt-1 block text-xs text-muted">
            低于该值的池会跳过；等于该值时会领取。此设置仅保存在当前 Core 网络的本地浏览器中。
          </span>
          <input
            aria-label="一键领取最低收益"
            value={thresholdInput}
            onChange={(event) => setThresholdInput(event.target.value)}
            inputMode="decimal"
            className="field mt-3 w-full"
          />
        </label>
        <button type="button" onClick={saveThreshold} className="secondary-button">
          保存门槛
        </button>
      </div>
      {settingsError ? <p className="mt-3 text-sm text-danger">{settingsError}</p> : null}

      <div className="mt-5 flex flex-col gap-3 rounded-xl bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          将领取 {candidates.length} 个池，合计约{' '}
          <span className="font-medium text-foreground">
            {formatCfx(candidateTotalDrip, 6)} CFX
          </span>
          {belowThresholdCount > 0 ? `；${belowThresholdCount} 个池低于门槛而跳过` : ''}
          {unreadPoolCount > 0 ? `；${unreadPoolCount} 个池尚未成功读取，未纳入本次操作` : ''}。
        </p>
        <button
          type="button"
          onClick={requestClaimAll}
          disabled={!wallet.canTransact || candidates.length === 0}
          className="primary-button shrink-0"
        >
          一键领取
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>
      ) : null}

      {completedClaims.length > 0 ? (
        <div className="mt-4 rounded-xl bg-accent/10 p-4 text-sm">
          <p className="font-medium text-accent">已成功领取 {completedClaims.length} 个池的收益</p>
          <ul className="mt-2 space-y-1">
            {completedClaims.map((claim) => (
              <li key={claim.transactionHash}>
                {claim.pool.name}：{' '}
                <a
                  href={`${CORE_NETWORK.explorerUrl}/transaction/${claim.transactionHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-foreground underline"
                >
                  {claim.transactionHash}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Modal
        open={Boolean(pending)}
        title="确认一键领取收益"
        onClose={() => !submitting && setPending(null)}
      >
        {pending ? (
          <form onSubmit={confirmClaimAll}>
            <p className="text-sm leading-6 text-muted">
              将按以下顺序逐笔准备交易、由 Fluent 请求签名，并在每笔回执成功后继续下一笔。
            </p>
            <ul className="mt-4 max-h-52 space-y-2 overflow-y-auto rounded-xl bg-surface p-4 text-sm">
              {pending.map((position) => (
                <li key={position.pool.address} className="flex justify-between gap-4">
                  <span>{position.pool.name}</span>
                  <span className="text-accent">{formatCfx(position.claimableDrip, 6)} CFX</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-5 text-muted">
              每笔交易都会重新读取钱包余额，并按准备后的 gas
              与存储抵押校验；若某笔被拒绝或失败，后续交易不会发起。
            </p>
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
                {submitting ? '领取中…' : '在 Fluent 中逐笔确认'}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
    </section>
  );
}
