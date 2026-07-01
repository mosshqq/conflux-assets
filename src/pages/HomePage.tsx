import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../app/useAppState';
import { CORE_NETWORK } from '../config/network';
import { normalizeQueryAddress, shortenAddress } from '../domain/address';
import { PoolManager } from '../features/pools/PoolManager';

export function HomePage() {
  const navigate = useNavigate();
  const { bookmarks, removeBookmark } = useAppState();
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const normalized = normalizeQueryAddress(address);
      navigate(`/address/${encodeURIComponent(normalized.address)}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '地址无效');
    }
  }

  return (
    <div className="space-y-8">
      <section className="hero-panel overflow-hidden rounded-3xl border border-line px-6 py-12 shadow-glow sm:px-10">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
          Read without wallet
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">
          一个地址，查看 Conflux 资产
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
          Core Space {CORE_NETWORK.label}地址可查询余额、PoS 持仓与收益；eSpace
          地址暂时只查询主网原生 CFX 余额。只有 Core 地址主动连接 Fluent
          且账户匹配时，才会开放交易。
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex max-w-4xl flex-col gap-3 sm:flex-row">
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder={`输入 ${CORE_NETWORK.addressPrefix}: Core Space 地址或 0x eSpace 地址`}
            aria-label="Conflux 地址"
            className="field min-w-0 flex-1 py-3.5"
          />
          <button type="submit" className="primary-button px-7">
            查询资产
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <p className="mt-3 text-xs leading-5 text-muted">
          支持 Core Space {CORE_NETWORK.label}（network ID {CORE_NETWORK.networkId}）与 eSpace
          主网（chain ID 1030）；eSpace 暂不支持代币、PoS 持仓或交易。
        </p>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">收藏地址</h2>
            <p className="mt-1 text-sm text-muted">数据只保存在当前浏览器。</p>
          </div>
          <span className="text-sm text-muted">{bookmarks.length} 个</span>
        </div>

        {bookmarks.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.address}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-4"
              >
                <button
                  type="button"
                  className="min-w-0 text-left"
                  onClick={() => navigate(`/address/${encodeURIComponent(bookmark.address)}`)}
                >
                  <p className="flex items-center gap-2 truncate font-medium">
                    <span className="truncate">{bookmark.alias || '未命名地址'}</span>
                    <span className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-normal text-muted">
                      {bookmark.address.startsWith('0x') ? 'eSpace' : 'Core'}
                    </span>
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted">
                    {shortenAddress(bookmark.address, 16, 12)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => removeBookmark(bookmark.address)}
                  className="secondary-button text-danger"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">
            查询地址后可将其收藏。
          </div>
        )}
      </section>

      <PoolManager />
    </div>
  );
}
