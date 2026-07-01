import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { CORE_NETWORK, PORTFOLIO_REFRESH_INTERVAL } from '../config/network';
import { addressesEqual, normalizePoolAddress, normalizeUserAddress } from '../domain/address';
import { formatBasisPoints, formatCfx, votesToDrip } from '../domain/money';
import { usePools } from '../features/pools/usePools';
import { PoolActions } from '../features/wallet/PoolActions';
import {
  readCfxBalance,
  readCurrentBlock,
  readPoolPosition,
} from '../infrastructure/conflux/client';

export function PoolDetailPage() {
  const params = useParams<{ address: string; poolAddress: string }>();
  let address = '';
  let poolAddress = '';
  let routeError = '';

  try {
    address = normalizeUserAddress(decodeURIComponent(params.address ?? ''));
    poolAddress = normalizePoolAddress(decodeURIComponent(params.poolAddress ?? ''));
  } catch (error) {
    routeError = error instanceof Error ? error.message : '地址无效';
  }

  const pools = usePools();
  const pool = pools.find((candidate) => addressesEqual(candidate.address, poolAddress));

  const positionQuery = useQuery({
    queryKey: ['position', address, poolAddress],
    queryFn: () => {
      if (!pool) throw new Error('该池不在当前配置中');
      return readPoolPosition(pool, address);
    },
    enabled: Boolean(pool && address && poolAddress),
    refetchInterval: PORTFOLIO_REFRESH_INTERVAL,
  });
  const balanceQuery = useQuery({
    queryKey: ['balance', address],
    queryFn: () => readCfxBalance(address),
    enabled: Boolean(address),
  });
  const blockQuery = useQuery({
    queryKey: ['current-block'],
    queryFn: readCurrentBlock,
    enabled: Boolean(address),
  });

  if (routeError) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6 text-danger">
        {routeError}
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6">
        <p className="text-danger">该池尚未收藏在当前浏览器。</p>
        <Link to="/" className="mt-4 inline-flex text-accent hover:underline">
          返回首页收藏池
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <Link
          to={`/address/${encodeURIComponent(address)}`}
          className="text-sm text-accent hover:underline"
        >
          ← 返回地址总览
        </Link>
        <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{pool.name}</h1>
              <span className="rounded-full bg-surface px-2 py-1 text-xs text-muted">收藏池</span>
            </div>
            <p className="mt-2 break-all font-mono text-xs text-muted">{pool.address}</p>
          </div>
          <div className="flex gap-2">
            {pool.website ? (
              <a href={pool.website} target="_blank" rel="noreferrer" className="secondary-button">
                池官网
              </a>
            ) : null}
            <a
              href={`${CORE_NETWORK.explorerUrl}/address/${pool.address}`}
              target="_blank"
              rel="noreferrer"
              className="secondary-button"
            >
              浏览器
            </a>
          </div>
        </div>
      </section>

      {positionQuery.isPending ? (
        <div className="rounded-2xl border border-line bg-panel p-8 text-center text-muted">
          正在读取池内资产…
        </div>
      ) : positionQuery.isError ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-6">
          <p className="text-danger">读取失败：{positionQuery.error.message}</p>
          <button
            type="button"
            onClick={() => void positionQuery.refetch()}
            className="mt-4 secondary-button"
          >
            重试
          </button>
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['有效质押', votesToDrip(positionQuery.data.activeVotes), false],
              ['解质押中', votesToDrip(positionQuery.data.pendingVotes), false],
              ['可提取本金', votesToDrip(positionQuery.data.unlockedVotes), false],
              ['未领取收益', positionQuery.data.claimableDrip, true],
            ].map(([label, value, accent]) => (
              <div key={String(label)} className="rounded-2xl border border-line bg-panel p-5">
                <p className="text-sm text-muted">{String(label)}</p>
                <p className={`mt-2 text-2xl font-semibold ${accent ? 'text-accent' : ''}`}>
                  {formatCfx(value as bigint, accent ? 6 : 4)} CFX
                </p>
              </div>
            ))}
            <div className="rounded-2xl border border-line bg-panel p-5">
              <p className="text-sm text-muted" title="由池合约按最近 7 天收益年化估算">
                预期 APY
              </p>
              <p className="mt-2 text-2xl font-semibold text-accent">
                {positionQuery.data.expectedApyBps === null
                  ? '—'
                  : formatBasisPoints(positionQuery.data.expectedApyBps)}
              </p>
            </div>
          </section>
          <p className="-mt-4 text-xs text-muted">
            预期 APY 由池合约基于最近 7 天收益年化估算，不代表未来实际收益。
          </p>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-line bg-panel p-5">
              <h2 className="font-semibold">解质押队列</h2>
              {positionQuery.data.unlockQueue.length > 0 ? (
                <div className="mt-4 divide-y divide-line">
                  {positionQuery.data.unlockQueue.map((item, index) => {
                    const remaining =
                      blockQuery.data && item.unlockBlock > blockQuery.data
                        ? item.unlockBlock - blockQuery.data
                        : 0n;
                    return (
                      <div
                        key={`${item.unlockBlock}-${index}`}
                        className="flex justify-between py-3 text-sm"
                      >
                        <span>{formatCfx(votesToDrip(item.votes))} CFX</span>
                        <span className="text-muted">
                          区块 {item.unlockBlock.toString()}
                          {remaining > 0n ? ` · 约 ${formatDuration(remaining)}` : ' · 可提取'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted">没有待完成的解质押批次。</p>
              )}
            </div>

            <div className="rounded-2xl border border-line bg-panel p-5">
              <h2 className="font-semibold">治理锁定</h2>
              <p className="mt-4 text-2xl font-semibold">
                {formatCfx(positionQuery.data.governanceLockedDrip)} CFX
              </p>
              <p className="mt-2 text-sm text-muted">
                {positionQuery.data.governanceUnlockBlock > 0n
                  ? `解锁区块 ${positionQuery.data.governanceUnlockBlock.toString()}`
                  : '当前没有治理锁定'}
              </p>
            </div>
          </section>

          <PoolActions
            address={address}
            pool={pool}
            position={positionQuery.data}
            walletBalanceDrip={balanceQuery.data ?? 0n}
          />
        </>
      )}
    </div>
  );
}

function formatDuration(blocks: bigint): string {
  const seconds = blocks / 2n;
  const days = seconds / 86_400n;
  if (days > 0n) return `${days.toString()} 天`;
  const hours = seconds / 3_600n;
  if (hours > 0n) return `${hours.toString()} 小时`;
  return `${(seconds / 60n).toString()} 分钟`;
}
