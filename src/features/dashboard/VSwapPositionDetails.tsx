import { useState } from 'react';
import { ESPACE_NETWORK } from '../../config/network';
import { VSWAP_NETWORK } from '../../config/vswap';
import { formatTokenAmount } from '../../domain/money';
import type { VSwapPosition, VSwapTokenAmount } from '../../domain/types';
import {
  calculateVSwapPriceRange,
  formatVSwapPrice,
  type VSwapPriceDirection,
} from '../../domain/vswap';

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

function formatDetailedTokenAmount(amount: bigint, decimals: number): string {
  const maximumFractionDigits = Math.min(decimals, 12);
  const formatted = formatTokenAmount(amount, decimals, maximumFractionDigits);
  if (amount > 0n && formatted === '0' && maximumFractionDigits > 0) {
    return `< 0.${'0'.repeat(maximumFractionDigits - 1)}1`;
  }
  return formatted;
}

function TokenAmountCard({
  label,
  value,
  lowerBound = false,
}: {
  label: string;
  value: VSwapTokenAmount;
  lowerBound?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 break-all font-mono text-lg font-semibold">
        {lowerBound ? '≥ ' : ''}
        {formatDetailedTokenAmount(value.amount, value.token.decimals)} {value.token.symbol}
      </p>
      <p className="mt-2 break-all text-xs text-muted">{value.token.address}</p>
    </div>
  );
}

export function VSwapPositionDetails({
  position,
  onRetry,
}: {
  position: VSwapPosition;
  onRetry: () => void;
}) {
  const [direction, setDirection] = useState<VSwapPriceDirection>('token1-per-token0');
  const token0 = position.token0Amount.token;
  const token1 = position.token1Amount.token;
  const baseToken = direction === 'token1-per-token0' ? token0 : token1;
  const quoteToken = direction === 'token1-per-token0' ? token1 : token0;
  const prices = calculateVSwapPriceRange({
    sqrtPriceX96: position.sqrtPriceX96,
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
    token0Decimals: token0.decimals,
    token1Decimals: token1.decimals,
    direction,
  });
  const statusTone =
    position.status === 'in-range'
      ? 'border-accent/30 bg-accent/10 text-accent'
      : position.status === 'closed'
        ? 'border-line bg-surface text-muted'
        : 'border-warning-border bg-warning-surface text-warning';
  const lowerBound = position.warnings.length > 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-panel p-6 shadow-glow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">
              vSwap NFT #{position.discovered.tokenId.toString()}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              {token0.symbol}/{token1.symbol}
            </h2>
            <p className="mt-2 text-sm text-muted">
              费率 {formatFeeTier(position.feeTier)} · 当前 Tick {position.currentTick}
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-sm ${statusTone}`}>
            {STATUS_LABELS[position.status]}
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">价格方向</h2>
            <p className="mt-1 text-xs text-muted">
              所有价格均表示 1 {baseToken.symbol} 可兑换的 {quoteToken.symbol} 数量。
            </p>
          </div>
          <div
            className="inline-flex self-start rounded-xl border border-line bg-surface p-1"
            role="group"
            aria-label="价格方向"
          >
            {(
              [
                ['token1-per-token0', `${token1.symbol} / ${token0.symbol}`],
                ['token0-per-token1', `${token0.symbol} / ${token1.symbol}`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={direction === value}
                onClick={() => setDirection(value)}
                className={`rounded-lg px-3 py-2 text-xs transition ${
                  direction === value
                    ? 'bg-accent font-semibold text-on-accent'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            ['区间最低价', prices.minimum],
            ['当前价格', prices.current],
            ['区间最高价', prices.maximum],
          ].map(([label, price]) => (
            <div key={label as string} className="rounded-2xl border border-line bg-surface p-4">
              <p className="text-xs text-muted">{label as string}</p>
              <p className="mt-2 break-all font-mono text-base font-semibold">
                {formatVSwapPrice(price as (typeof prices)['current'])}
              </p>
              <p className="mt-1 text-xs text-muted">
                {quoteToken.symbol} / {baseToken.symbol}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">
          完整 Tick 区间 [{position.tickLower}, {position.tickUpper})；当前价格使用池的链上
          sqrtPriceX96 精确换算。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">仓位资产</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TokenAmountCard label={`仓位内 ${token0.symbol}`} value={position.token0Amount} />
          <TokenAmountCard label={`仓位内 ${token1.symbol}`} value={position.token1Amount} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">未领取手续费</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TokenAmountCard
            label={token0.symbol}
            value={position.unclaimedFee0}
            lowerBound={lowerBound}
          />
          <TokenAmountCard
            label={token1.symbol}
            value={position.unclaimedFee1}
            lowerBound={lowerBound}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-panel p-6">
        <div>
          <h2 className="text-xl font-semibold">Farming 奖励</h2>
          <p className="mt-1 text-sm text-muted">
            每日预计值来自活动 incentive 的仓位级 rewardsPerSecondX32，按 86,400 秒换算。
          </p>
        </div>

        {position.rewards.length ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {position.rewards.map((reward) => {
              const dailyAmount =
                reward.estimatedDailyAmount === null
                  ? null
                  : position.status === 'in-range'
                    ? reward.estimatedDailyAmount
                    : 0n;
              const hasActiveIncentive = (reward.activeIncentiveCount ?? 0) > 0;
              return (
                <article
                  key={reward.token.address}
                  className="rounded-2xl border border-line bg-surface p-5"
                >
                  <h3 className="font-semibold">{reward.token.symbol}</h3>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div>
                      <dt className="text-muted">未领取奖励</dt>
                      <dd className="mt-1 break-all font-mono font-semibold">
                        {lowerBound ? '≥ ' : ''}
                        {formatDetailedTokenAmount(reward.totalAmount, reward.token.decimals)}{' '}
                        {reward.token.symbol}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">预计每日奖励</dt>
                      <dd className="mt-1 break-all font-mono font-semibold">
                        {dailyAmount === null ? (
                          '—'
                        ) : (
                          <>
                            {lowerBound ? '≥ ' : ''}
                            {formatDetailedTokenAmount(dailyAmount, reward.token.decimals)}{' '}
                            {reward.token.symbol}
                          </>
                        )}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-xs leading-5 text-muted">
                    {reward.activeIncentiveCount === null
                      ? '区块时间或部分计划数据不可用，活动 incentive 数量无法完整判断。'
                      : position.status !== 'in-range'
                        ? `当前仓位不在价格区间内；发现 ${reward.activeIncentiveCount} 个活动计划，预计速率按 0 展示。`
                        : hasActiveIncentive
                          ? `${reward.activeIncentiveCount} 个活动 incentive；速率会随流动性和计划状态变化。`
                          : '当前没有活动 incentive。'}
                  </p>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted">
            {position.warnings.length
              ? '没有成功读取到 farming 奖励计划。'
              : '暂无 farming 奖励计划。'}
          </p>
        )}
      </section>

      {position.warnings.length ? (
        <section className="rounded-2xl border border-warning-border bg-warning-surface p-5">
          <h2 className="font-semibold text-warning">可选数据读取不完整</h2>
          <p className="mt-2 text-sm leading-6 text-warning-muted">
            {position.warnings.join('；')}。奖励和手续费中的数值仅表示成功读取下限。
          </p>
          <button type="button" onClick={onRetry} className="secondary-button mt-4">
            重试可选数据
          </button>
        </section>
      ) : null}

      <section className="rounded-2xl border border-line bg-panel p-5 text-sm">
        <h2 className="font-semibold">链上标识</h2>
        <dl className="mt-4 space-y-3">
          <div>
            <dt className="text-muted">仓位所有者</dt>
            <dd className="mt-1 break-all font-mono text-xs">{position.discovered.owner}</dd>
          </div>
          <div>
            <dt className="text-muted">池合约</dt>
            <dd className="mt-1 break-all font-mono text-xs">{position.discovered.poolAddress}</dd>
          </div>
          <div>
            <dt className="text-muted">原始流动性</dt>
            <dd className="mt-1 break-all font-mono text-xs">{position.liquidity.toString()}</dd>
          </div>
        </dl>
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
      </section>
    </div>
  );
}
