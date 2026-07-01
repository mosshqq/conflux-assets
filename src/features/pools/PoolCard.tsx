import { Link } from 'react-router-dom';
import type { PoolConfig, PoolPosition } from '../../domain/types';
import { formatBasisPoints, formatCfx, votesToDrip } from '../../domain/money';
import { shortenAddress } from '../../domain/address';

export function PoolCard({
  pool,
  address,
  position,
  error,
  loading,
  onRetry,
}: {
  pool: PoolConfig;
  address: string;
  position?: PoolPosition;
  error?: Error | null;
  loading?: boolean;
  onRetry: () => void;
}) {
  return (
    <article className="rounded-2xl border border-line bg-panel p-5 transition hover:border-accent/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{pool.name}</h3>
            <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] uppercase text-muted">
              收藏
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-muted">{shortenAddress(pool.address)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className="rounded-full bg-accent/10 px-2 py-1 text-xs font-medium text-accent"
            title="由池合约按最近 7 天收益年化估算"
          >
            预期 APY{' '}
            {position?.expectedApyBps !== null && position?.expectedApyBps !== undefined
              ? formatBasisPoints(position.expectedApyBps)
              : '—'}
          </span>
          {loading ? <span className="text-xs text-muted">加载中…</span> : null}
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-xl bg-danger/10 p-4">
          <p className="text-sm text-danger">读取失败：{error.message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 text-sm text-foreground underline"
          >
            重试此池
          </button>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted">有效质押</p>
            <p className="mt-1 font-medium">
              {position ? formatCfx(votesToDrip(position.activeVotes)) : '—'} CFX
            </p>
          </div>
          <div>
            <p className="text-muted">未领取收益</p>
            <p className="mt-1 font-medium text-accent">
              {position ? formatCfx(position.claimableDrip, 6) : '—'} CFX
            </p>
          </div>
          <div>
            <p className="text-muted">解质押中</p>
            <p className="mt-1 font-medium">
              {position ? formatCfx(votesToDrip(position.pendingVotes)) : '—'} CFX
            </p>
          </div>
          <div>
            <p className="text-muted">可提取本金</p>
            <p className="mt-1 font-medium">
              {position ? formatCfx(votesToDrip(position.unlockedVotes)) : '—'} CFX
            </p>
          </div>
        </div>
      )}

      <Link
        to={`/address/${encodeURIComponent(address)}/pool/${encodeURIComponent(pool.address)}`}
        className="mt-5 inline-flex text-sm font-medium text-accent hover:underline"
      >
        查看池详情与操作 →
      </Link>
    </article>
  );
}
