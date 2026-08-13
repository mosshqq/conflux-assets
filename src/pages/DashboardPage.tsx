import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppState } from '../app/useAppState';
import { MetricCard } from '../components/MetricCard';
import { CORE_NETWORK, ESPACE_NETWORK } from '../config/network';
import { normalizeQueryAddress, shortenAddress, type QueryAddressSpace } from '../domain/address';
import { formatCfx } from '../domain/money';
import {
  aggregatePortfolioTotal,
  aggregatePositions,
  estimateDailyYield,
  estimateNextStake,
  hasPosition,
  type NextStakeEstimate,
} from '../domain/portfolio';
import type { ESpaceAddress, PoolPosition, PositionPoolSort } from '../domain/types';
import { AddressSwitcher } from '../features/dashboard/AddressSwitcher';
import { VSwapPositionsSection } from '../features/dashboard/VSwapPositionsSection';
import { useESpaceBalance } from '../features/dashboard/useESpaceBalance';
import { usePortfolio } from '../features/dashboard/usePortfolio';
import { useVSwapPositions } from '../features/dashboard/useVSwapPositions';
import { PoolCard } from '../features/pools/PoolCard';
import { PoolSortSelect } from '../features/pools/PoolSortSelect';
import { sortPositionIndexes } from '../features/pools/poolSorting';
import { usePools } from '../features/pools/usePools';
import { ClaimAllRewards } from '../features/wallet/ClaimAllRewards';

const POSITION_POOL_SORT_OPTIONS: Array<{ value: PositionPoolSort; label: string }> = [
  { value: 'favorite', label: '收藏顺序' },
  { value: 'apy-desc', label: 'APY：高到低' },
  { value: 'apy-asc', label: 'APY：低到高' },
  { value: 'active-stake-desc', label: '有效质押：高到低' },
  { value: 'active-stake-asc', label: '有效质押：低到高' },
  { value: 'claimable-desc', label: '未领取收益：高到低' },
  { value: 'claimable-asc', label: '未领取收益：低到高' },
];

function formatEstimatedStakeTime(secondsUntilTarget: bigint): string {
  const timestampMs = BigInt(Date.now()) + secondsUntilTarget * 1_000n;
  const maximumDateMs = 8_640_000_000_000_000n;
  if (timestampMs <= maximumDateMs) {
    return new Intl.DateTimeFormat('zh-CN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: false,
    }).format(new Date(Number(timestampMs)));
  }

  const days = secondsUntilTarget / 86_400n;
  return `约 ${days.toString()} 天后`;
}

function nextStakeDisplay(
  estimate: NextStakeEstimate | null,
  balanceLoaded: boolean,
  pendingPoolCount: number,
  missingPoolCount: number,
): { value: string; hint: string } {
  if (!balanceLoaded) {
    return { value: '—', hint: '等待可用余额读取完成' };
  }
  if (pendingPoolCount > 0) {
    return { value: '—', hint: `仍有 ${pendingPoolCount} 个池读取中` };
  }
  if (missingPoolCount > 0 || !estimate) {
    return { value: '—', hint: '池数据不完整，无法按全部有效质押估算' };
  }
  if (estimate.status === 'ready') {
    return {
      value: '现在可质押',
      hint: `可用余额 + 未领取收益为 ${formatCfx(estimate.liquidDrip, 6)} CFX，已达到 ${formatCfx(estimate.targetDrip, 0)} CFX 的一票及基础费用预留。`,
    };
  }
  if (estimate.status === 'estimated') {
    return {
      value: formatEstimatedStakeTime(estimate.secondsUntilTarget),
      hint: `按所有有效质押的合约 APY 匀速估算，届时可用余额 + 未领取收益将达到 ${formatCfx(estimate.targetDrip, 0)} CFX。`,
    };
  }

  const unavailableHints = {
    'missing-apy': '有有效质押的池未提供 APY，无法完整估算。',
    'no-active-stake': '暂无有效质押，无法按 APY 估算收益增长。',
    'zero-apy': '当前有效质押的 APY 为 0，无法估算收益增长。',
  } as const;
  return { value: '暂无法估算', hint: unavailableHints[estimate.reason] };
}

export function DashboardPage() {
  const params = useParams<{ address: string }>();
  const [showAll, setShowAll] = useState(false);
  const [alias, setAlias] = useState('');
  const pools = usePools();
  const { bookmarks, positionPoolSort, saveBookmark, removeBookmark, setPositionPoolSort } =
    useAppState();

  let address = '';
  let addressSpace: QueryAddressSpace = 'core';
  let addressError = '';
  try {
    const normalized = normalizeQueryAddress(decodeURIComponent(params.address ?? ''));
    address = normalized.address;
    addressSpace = normalized.space;
  } catch (error) {
    addressError = error instanceof Error ? error.message : '地址无效';
  }

  const isESpace = addressSpace === 'espace';
  const {
    balanceQuery: coreBalanceQuery,
    blockQuery,
    positionQueries,
  } = usePortfolio(!addressError && !isESpace ? address : '', pools);
  const eSpaceBalanceQuery = useESpaceBalance(!addressError && isESpace ? address : '');
  const vSwapQueries = useVSwapPositions(
    !addressError && isESpace ? (address as ESpaceAddress) : '',
  );
  const balanceQuery = isESpace ? eSpaceBalanceQuery : coreBalanceQuery;
  const successfulPositions = positionQueries
    .map((query) => query.data)
    .filter((position): position is PoolPosition => Boolean(position));
  const summary = aggregatePositions(successfulPositions);
  const missingPoolCount = positionQueries.filter((query) => query.isError && !query.data).length;
  const pendingPoolCount = positionQueries.filter((query) => query.isPending && !query.data).length;
  const totalAssetDrip =
    balanceQuery.data !== undefined && pendingPoolCount === 0
      ? aggregatePortfolioTotal(balanceQuery.data, summary)
      : undefined;
  const nextStakeEstimate =
    !isESpace &&
    coreBalanceQuery.data !== undefined &&
    positionQueries.every((query) => query.data !== undefined)
      ? estimateNextStake(coreBalanceQuery.data, successfulPositions)
      : null;
  const expectedDailyYieldDrip =
    !isESpace && positionQueries.every((query) => query.data !== undefined)
      ? estimateDailyYield(successfulPositions)
      : undefined;
  const nextStake = nextStakeDisplay(
    nextStakeEstimate,
    coreBalanceQuery.data !== undefined,
    pendingPoolCount,
    missingPoolCount,
  );
  const isBookmarked = bookmarks.some((item) => item.address === address);

  const visiblePoolIndexes = useMemo(() => {
    if (showAll) return pools.map((_, index) => index);
    return pools
      .map((_, index) => index)
      .filter((index) => positionQueries[index]?.data && hasPosition(positionQueries[index].data!));
  }, [pools, positionQueries, showAll]);
  const sortedVisiblePoolIndexes = sortPositionIndexes(
    visiblePoolIndexes,
    positionQueries.map((query) => query.data),
    positionPoolSort,
  );

  function refreshAll() {
    void balanceQuery.refetch();
    if (isESpace) {
      void vSwapQueries.discoveryQuery.refetch();
      for (const query of vSwapQueries.positionQueries) void query.refetch();
      return;
    }
    void blockQuery.refetch();
    for (const query of positionQueries) void query.refetch();
  }

  if (addressError) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6">
        <h1 className="text-xl font-semibold">无法查询该地址</h1>
        <p className="mt-2 text-sm text-danger">{addressError}</p>
        <Link to="/" className="mt-5 inline-flex text-accent hover:underline">
          返回重新输入
        </Link>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)]">
      <AddressSwitcher currentAddress={address} bookmarks={bookmarks} pools={pools} />

      <div className="min-w-0 space-y-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <Link to="/" className="text-sm text-accent hover:underline">
              ← 返回地址查询
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">地址资产明细</h1>
              <span className="rounded-full border border-line bg-surface px-2 py-1 text-xs text-muted">
                {isESpace
                  ? `eSpace ${ESPACE_NETWORK.id === 'testnet' ? 'Testnet' : 'Mainnet'} · ${ESPACE_NETWORK.chainId}`
                  : `Core Space ${CORE_NETWORK.id === 'testnet' ? 'Testnet' : 'Mainnet'} · ${CORE_NETWORK.networkId}`}
              </span>
            </div>
            <p className="mt-2 break-all font-mono text-sm text-muted">{address}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={refreshAll} className="secondary-button">
              刷新全部
            </button>
            {isBookmarked ? (
              <button
                type="button"
                onClick={() => removeBookmark(address)}
                className="secondary-button"
              >
                取消收藏
              </button>
            ) : (
              <div className="flex">
                <input
                  value={alias}
                  onChange={(event) => setAlias(event.target.value)}
                  placeholder="收藏别名"
                  className="field rounded-r-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    saveBookmark({
                      address,
                      alias: alias.trim() || undefined,
                      createdAt: new Date().toISOString(),
                    })
                  }
                  className="primary-button rounded-l-none"
                >
                  收藏
                </button>
              </div>
            )}
          </div>
        </section>

        {isESpace ? (
          <>
            <section className="rounded-2xl border border-accent/25 bg-accent/[0.07] p-6">
              <h2 className="font-semibold text-accent">当前为 eSpace 余额查询</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                当前查询 eSpace {ESPACE_NETWORK.label}原生 CFX 余额及 vSwap LP Farming
                仓位。多种代币资产不折算进总 CFX，暂不支持钱包连接或交易。
              </p>
            </section>

            <section className="max-w-md">
              <MetricCard
                label="eSpace 可用余额"
                value={
                  balanceQuery.data === undefined ? '—' : `${formatCfx(balanceQuery.data, 6)} CFX`
                }
                hint={balanceQuery.isError ? 'eSpace RPC 读取失败，可刷新重试' : '原生 CFX 余额'}
                accent
              />
            </section>

            <VSwapPositionsSection address={address as ESpaceAddress} {...vSwapQueries} />
          </>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                label="Core 总资产"
                value={
                  totalAssetDrip === undefined
                    ? '—'
                    : `${missingPoolCount > 0 ? '≥ ' : ''}${formatCfx(totalAssetDrip, 6)} CFX`
                }
                hint={
                  balanceQuery.data === undefined
                    ? '等待可用余额读取完成'
                    : pendingPoolCount > 0
                      ? `仍有 ${pendingPoolCount} 个池读取中`
                      : missingPoolCount > 0
                        ? `${missingPoolCount} 个池读取失败，当前值为已读取资产下限`
                        : '可用余额 + 池内本金 + 未领取收益'
                }
                accent
              />
              <MetricCard
                label="Core 可用余额"
                value={
                  balanceQuery.data === undefined ? '—' : `${formatCfx(balanceQuery.data, 6)} CFX`
                }
                hint={balanceQuery.isError ? 'RPC 读取失败，可刷新重试' : '不含池内资产'}
                accent
              />
              <MetricCard label="有效质押" value={`${formatCfx(summary.activeDrip)} CFX`} />
              <MetricCard label="解质押中" value={`${formatCfx(summary.pendingDrip)} CFX`} />
              <MetricCard label="可提取本金" value={`${formatCfx(summary.unlockedDrip)} CFX`} />
              <MetricCard
                label="未领取收益"
                value={`${formatCfx(summary.claimableDrip, 6)} CFX`}
                accent
              />
              <MetricCard
                label="预计每日收益"
                value={
                  expectedDailyYieldDrip === undefined || expectedDailyYieldDrip === null
                    ? '—'
                    : `${formatCfx(expectedDailyYieldDrip, 6)} CFX`
                }
                hint={
                  pendingPoolCount > 0
                    ? `仍有 ${pendingPoolCount} 个池读取中`
                    : missingPoolCount > 0
                      ? '池数据不完整，无法按全部有效质押估算'
                      : expectedDailyYieldDrip === null
                        ? '有有效质押的池未提供 APY，无法完整估算'
                        : '所有有效质押 × 各池合约 APY ÷ 365；基于近 7 天年化快照'
                }
                accent
              />
              <MetricCard
                label="预计下次可质押时间"
                value={nextStake.value}
                hint={nextStake.hint}
                accent
              />
            </section>

            <ClaimAllRewards
              address={address}
              positions={successfulPositions}
              poolCount={pools.length}
            />

            {missingPoolCount > 0 ? (
              <section className="rounded-2xl border border-warning-border bg-warning-surface p-5">
                <h2 className="font-semibold text-warning">资产汇总不完整</h2>
                <p className="mt-2 text-sm leading-6 text-warning-muted">
                  {missingPoolCount} 个池未能成功读取；总资产以“≥”显示，只包含 Core
                  可用余额和成功读取池的本金及收益。可在下方对应池卡片单独重试。
                </p>
              </section>
            ) : null}

            {pools.length === 0 ? (
              <section className="rounded-2xl border border-warning-border bg-warning-surface p-6">
                <h2 className="font-semibold text-warning">尚未配置 PoS 池</h2>
                <p className="mt-2 text-sm leading-6 text-warning-muted">
                  请回到首页手动输入标准 PoS Pool 合约地址，链上校验并收藏后再查看。
                </p>
              </section>
            ) : (
              <section>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{showAll ? '全部池' : '有持仓的池'}</h2>
                    <p className="mt-1 text-sm text-muted">
                      成功读取 {successfulPositions.length}/{pools.length} 个池
                      {blockQuery.data ? ` · 当前区块 ${blockQuery.data.toString()}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <PoolSortSelect
                      ariaLabel="地址 PoS 池排序"
                      value={positionPoolSort}
                      options={POSITION_POOL_SORT_OPTIONS}
                      onChange={setPositionPoolSort}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAll((value) => !value)}
                      className="secondary-button"
                    >
                      {showAll ? '只看持仓' : '查看全部池'}
                    </button>
                  </div>
                </div>

                {sortedVisiblePoolIndexes.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {sortedVisiblePoolIndexes.map((index) => {
                      const pool = pools[index];
                      const query = positionQueries[index];
                      return (
                        <PoolCard
                          key={pool.id}
                          pool={pool}
                          address={address}
                          position={query.data}
                          error={query.error}
                          loading={query.isPending}
                          onRetry={() => void query.refetch()}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-line p-8 text-center">
                    <p className="text-muted">当前已读取的池中没有发现持仓。</p>
                    <button
                      type="button"
                      onClick={() => setShowAll(true)}
                      className="mt-4 text-sm text-accent hover:underline"
                    >
                      查看全部池及读取状态
                    </button>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        <p className="text-center text-xs text-muted">
          {isESpace ? 'eSpace' : 'Core Space'} 查询地址：{shortenAddress(address)} · 自动刷新间隔 60
          秒
        </p>
      </div>
    </div>
  );
}
