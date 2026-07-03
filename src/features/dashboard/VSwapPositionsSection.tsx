import { ESPACE_NETWORK } from '../../config/network';
import { VSWAP_NETWORK } from '../../config/vswap';
import { formatTokenAmount } from '../../domain/money';
import type { VSwapPosition, VSwapTokenAmount } from '../../domain/types';
import { aggregateVSwapAmounts } from '../../domain/vswap';
import type { useVSwapPositions } from './useVSwapPositions';

type VSwapQueries = ReturnType<typeof useVSwapPositions>;

const STATUS_LABELS = {
  'in-range': '区间内',
  'out-of-range': '区间外',
  closed: '已关闭',
} as const;

function formatFeeTier(feeTier: number): string {
  const whole = Math.floor(feeTier / 10_000);
  const fraction = (feeTier % 10_000).toString().padStart(4, '0').replace(/0+$/, '');
  return `${whole}${fraction ? `.${fraction}` : ''}%`;
}

function AmountList({
  title,
  amounts,
  lowerBound,
}: {
  title: string;
  amounts: VSwapTokenAmount[];
  lowerBound: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <p className="text-sm text-muted">{title}</p>
      {amounts.length ? (
        <div className="mt-3 space-y-2">
          {amounts.map(({ token, amount }) => (
            <p key={token.address} className="break-all font-mono text-sm font-semibold">
              {lowerBound ? '≥ ' : ''}
              {formatTokenAmount(amount, token.decimals)} {token.symbol}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">—</p>
      )}
    </div>
  );
}

function PositionCard({ position, onRetry }: { position: VSwapPosition; onRetry: () => void }) {
  const statusTone =
    position.status === 'in-range'
      ? 'border-success/30 bg-success/10 text-success'
      : position.status === 'closed'
        ? 'border-line bg-surface text-muted'
        : 'border-warning-border bg-warning-surface text-warning';

  return (
    <article className="rounded-2xl border border-line bg-panel p-5 shadow-glow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted">vSwap NFT #{position.discovered.tokenId.toString()}</p>
          <h3 className="mt-1 text-lg font-semibold">
            {position.token0Amount.token.symbol}/{position.token1Amount.token.symbol}
          </h3>
          <p className="mt-1 text-xs text-muted">费率 {formatFeeTier(position.feeTier)}</p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-xs ${statusTone}`}>
          {STATUS_LABELS[position.status]}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {[position.token0Amount, position.token1Amount].map(({ token, amount }) => (
          <div key={token.address}>
            <p className="text-xs text-muted">仓位内 {token.symbol}</p>
            <p className="mt-1 break-all font-mono text-sm font-semibold">
              {formatTokenAmount(amount, token.decimals)}
            </p>
          </div>
        ))}
        {[position.unclaimedFee0, position.unclaimedFee1].map(({ token, amount }) => (
          <div key={`fee-${token.address}`}>
            <p className="text-xs text-muted">未领取手续费 · {token.symbol}</p>
            <p className="mt-1 break-all font-mono text-sm font-semibold">
              {formatTokenAmount(amount, token.decimals)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <p className="text-xs text-muted">Farming 奖励</p>
        {position.rewards.some((reward) => reward.totalAmount > 0n) ? (
          <div className="mt-2 space-y-1">
            {position.rewards
              .filter((reward) => reward.totalAmount > 0n)
              .map((reward) => (
                <p key={reward.token.address} className="break-all font-mono text-sm">
                  {formatTokenAmount(reward.totalAmount, reward.token.decimals)}{' '}
                  {reward.token.symbol}
                </p>
              ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">暂无未领取奖励</p>
        )}
      </div>

      {position.warnings.length ? (
        <div className="mt-4 rounded-xl border border-warning-border bg-warning-surface p-3">
          <p className="text-xs leading-5 text-warning-muted">{position.warnings.join('；')}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-xs text-accent hover:underline"
          >
            重试可选数据
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <a
          href={`${ESPACE_NETWORK.explorerUrl}/address/${position.discovered.poolAddress}`}
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline"
        >
          查看池合约
        </a>
        <a
          href={`${ESPACE_NETWORK.explorerUrl}/address/${VSWAP_NETWORK.positionManager}`}
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline"
        >
          查看 Position Manager
        </a>
      </div>
    </article>
  );
}

export function VSwapPositionsSection({ discoveryQuery, positionQueries }: VSwapQueries) {
  if (discoveryQuery.isPending) {
    return (
      <section className="rounded-2xl border border-line bg-panel p-6">
        <h2 className="text-xl font-semibold">vSwap LP Farming</h2>
        <p className="mt-2 text-sm text-muted">正在发现该地址的 vSwap 仓位…</p>
      </section>
    );
  }

  if (discoveryQuery.isError) {
    return (
      <section className="rounded-2xl border border-danger/30 bg-danger/10 p-6">
        <h2 className="text-xl font-semibold">vSwap 仓位读取失败</h2>
        <p className="mt-2 text-sm text-danger">
          {discoveryQuery.error instanceof Error ? discoveryQuery.error.message : '未知错误'}
        </p>
        <button
          type="button"
          onClick={() => void discoveryQuery.refetch()}
          className="secondary-button mt-4"
        >
          重试仓位发现
        </button>
      </section>
    );
  }

  const discoveredCount = discoveryQuery.data?.length ?? 0;
  const successfulPositions = positionQueries
    .map((query) => query.data)
    .filter((position): position is VSwapPosition => Boolean(position));
  const failedCount = positionQueries.filter((query) => query.isError && !query.data).length;
  const pendingCount = positionQueries.filter((query) => query.isPending && !query.data).length;
  const warningPositionCount = successfulPositions.filter(
    (position) => position.warnings.length > 0,
  ).length;
  const lowerBound = failedCount > 0 || warningPositionCount > 0;
  const positionAmounts = aggregateVSwapAmounts(successfulPositions, (position) => [
    position.token0Amount,
    position.token1Amount,
  ]);
  const feeAmounts = aggregateVSwapAmounts(successfulPositions, (position) => [
    position.unclaimedFee0,
    position.unclaimedFee1,
  ]);
  const rewardAmounts = aggregateVSwapAmounts(successfulPositions, (position) =>
    position.rewards.map((reward) => ({ token: reward.token, amount: reward.totalAmount })),
  );
  const sortedIndexes = positionQueries
    .map((query, index) => ({ query, index }))
    .sort((left, right) => {
      const leftClosed = left.query.data?.status === 'closed';
      const rightClosed = right.query.data?.status === 'closed';
      if (leftClosed !== rightClosed) return leftClosed ? 1 : -1;
      const leftId = discoveryQuery.data?.[left.index]?.tokenId ?? 0n;
      const rightId = discoveryQuery.data?.[right.index]?.tokenId ?? 0n;
      return leftId === rightId ? 0 : leftId > rightId ? -1 : 1;
    });

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">vSwap LP Farming</h2>
        <p className="mt-1 text-sm text-muted">
          只读展示 vSwap 管理的 V3 NFT 仓位，不连接钱包或发送交易。
        </p>
      </div>

      {discoveredCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center">
          <p className="text-muted">该地址没有发现 vSwap LP Farming 仓位。</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-panel p-5">
              <p className="text-sm text-muted">发现仓位</p>
              <p className="mt-2 text-2xl font-semibold">{discoveredCount}</p>
            </div>
            <div className="rounded-2xl border border-line bg-panel p-5">
              <p className="text-sm text-muted">有效仓位</p>
              <p className="mt-2 text-2xl font-semibold">
                {successfulPositions.filter((position) => position.status !== 'closed').length}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-panel p-5">
              <p className="text-sm text-muted">区间内</p>
              <p className="mt-2 text-2xl font-semibold">
                {successfulPositions.filter((position) => position.status === 'in-range').length}
              </p>
            </div>
          </div>

          {pendingCount > 0 ? (
            <p className="text-sm text-muted">仍有 {pendingCount} 个仓位读取中，汇总完成后显示。</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <AmountList title="仓位资产" amounts={positionAmounts} lowerBound={lowerBound} />
              <AmountList title="未领取手续费" amounts={feeAmounts} lowerBound={lowerBound} />
              <AmountList title="Farming 奖励" amounts={rewardAmounts} lowerBound={lowerBound} />
            </div>
          )}

          {lowerBound ? (
            <div className="rounded-2xl border border-warning-border bg-warning-surface p-5">
              <p className="font-semibold text-warning">仓位汇总不完整</p>
              <p className="mt-2 text-sm text-warning-muted">
                {failedCount > 0 ? `${failedCount} 个仓位读取失败` : ''}
                {failedCount > 0 && warningPositionCount > 0 ? '，' : ''}
                {warningPositionCount > 0
                  ? `${warningPositionCount} 个仓位的手续费或奖励读取不完整`
                  : ''}
                ，当前 token 汇总仅为成功读取部分的下限。
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            {sortedIndexes.map(({ query, index }) => {
              const discovered = discoveryQuery.data?.[index];
              if (query.data) {
                return (
                  <PositionCard
                    key={discovered?.tokenId.toString()}
                    position={query.data}
                    onRetry={() => void query.refetch()}
                  />
                );
              }
              return (
                <article
                  key={discovered?.tokenId.toString()}
                  className="rounded-2xl border border-line bg-panel p-5"
                >
                  <p className="text-sm font-semibold">
                    vSwap NFT #{discovered?.tokenId.toString() ?? '—'}
                  </p>
                  {query.isError ? (
                    <>
                      <p className="mt-2 text-sm text-danger">
                        {query.error instanceof Error ? query.error.message : '仓位读取失败'}
                      </p>
                      <button
                        type="button"
                        onClick={() => void query.refetch()}
                        className="secondary-button mt-4"
                      >
                        重试该仓位
                      </button>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-muted">正在读取链上仓位…</p>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
