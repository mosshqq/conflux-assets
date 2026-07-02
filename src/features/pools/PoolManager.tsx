import { useMemo, useState, type FormEvent } from 'react';
import { useAppState } from '../../app/useAppState';
import { CORE_NETWORK } from '../../config/network';
import { decodeCoreAddress, normalizePoolAddress, shortenAddress } from '../../domain/address';
import { formatBasisPoints, formatCfx, votesToDrip } from '../../domain/money';
import type { HomePoolSort } from '../../domain/types';
import { validateStandardPool } from '../../infrastructure/conflux/client';
import { PoolSortSelect } from './PoolSortSelect';
import { sortPoolOverviewIndexes } from './poolSorting';
import { usePoolOverviews } from './usePoolOverviews';

const HOME_POOL_SORT_OPTIONS: Array<{ value: HomePoolSort; label: string }> = [
  { value: 'favorite', label: '收藏顺序' },
  { value: 'apy-desc', label: 'APY：高到低' },
  { value: 'apy-asc', label: 'APY：低到高' },
  { value: 'total-staked-desc', label: '总质押：高到低' },
  { value: 'total-staked-asc', label: '总质押：低到高' },
];

export function PoolManager() {
  const { customPools, homePoolSort, addCustomPool, removeCustomPool, setHomePoolSort } =
    useAppState();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const overviewQueries = usePoolOverviews(customPools);
  const allAddresses = useMemo(
    () => new Set(customPools.map((pool) => pool.address)),
    [customPools],
  );
  const sortedPoolIndexes = sortPoolOverviewIndexes(
    customPools.map((_, index) => index),
    overviewQueries.map((query) => query.data),
    homePoolSort,
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setChecking(true);

    try {
      const normalized = normalizePoolAddress(address);
      if (allAddresses.has(normalized)) throw new Error('该池已经存在');
      if (website) new URL(website);
      const contractInfo = await validateStandardPool(normalized);
      const decoded = decodeCoreAddress(normalized);
      addCustomPool({
        id: `custom:${decoded.hex}`,
        name: name.trim() || contractInfo.name || `PoS Pool ${normalized.slice(-8)}`,
        address: normalized,
        website: website.trim() || undefined,
        source: 'custom',
      });
      setName('');
      setAddress('');
      setWebsite('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '池校验失败');
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold">PoS 池管理</h2>
          <p className="mt-1 text-sm text-muted">
            手动输入标准 PoS Pool 合约地址，链上校验后收藏到当前浏览器。
          </p>
        </div>
        <span className="rounded-full bg-surface px-3 py-1 text-xs text-muted">
          已收藏 {customPools.length} 个
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-3 lg:grid-cols-[1fr_2fr_1.5fr_auto]">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="名称（可选）"
          className="field"
        />
        <input
          required
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder={`${CORE_NETWORK.addressPrefix}: 合约地址`}
          className="field"
        />
        <input
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          placeholder="官网（可选）"
          className="field"
        />
        <button type="submit" disabled={checking} className="primary-button whitespace-nowrap">
          {checking ? '链上校验中…' : '校验并收藏'}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      {customPools.length > 0 ? (
        <>
          <div className="mt-5 flex justify-end">
            <PoolSortSelect
              ariaLabel="首页 PoS 池排序"
              value={homePoolSort}
              options={HOME_POOL_SORT_OPTIONS}
              onChange={setHomePoolSort}
            />
          </div>
          <div className="mt-3 divide-y divide-line border-t border-line">
            {sortedPoolIndexes.map((index) => {
              const pool = customPools[index];
              const query = overviewQueries[index];
              const overview = query.data;

              return (
                <div
                  key={pool.id}
                  className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{pool.name}</p>
                    <p className="truncate font-mono text-xs text-muted">
                      {shortenAddress(pool.address, 16, 12)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-5 text-sm sm:min-w-72">
                    <div>
                      <p className="text-xs text-muted" title="由池合约按最近 7 天收益年化估算">
                        预期 APY
                      </p>
                      <p className="mt-1 font-medium text-accent">
                        {overview?.expectedApyBps === null || overview?.expectedApyBps === undefined
                          ? '—'
                          : formatBasisPoints(overview.expectedApyBps)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">池总质押</p>
                      <p className="mt-1 font-medium">
                        {overview
                          ? `${formatCfx(votesToDrip(overview.totalStakedVotes))} CFX`
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {query.isPending ? <span className="text-xs text-muted">加载中…</span> : null}
                    {query.isError ? (
                      <button
                        type="button"
                        onClick={() => void query.refetch()}
                        className="text-sm text-danger underline"
                      >
                        读取失败，重试
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeCustomPool(pool.address)}
                      className="secondary-button text-danger"
                    >
                      取消收藏
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
