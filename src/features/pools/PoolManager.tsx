import { useMemo, useState, type FormEvent } from 'react';
import { useAppState } from '../../app/useAppState';
import { CORE_NETWORK } from '../../config/network';
import { decodeCoreAddress, normalizePoolAddress, shortenAddress } from '../../domain/address';
import { validateStandardPool } from '../../infrastructure/conflux/client';

export function PoolManager() {
  const { customPools, addCustomPool, removeCustomPool } = useAppState();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const allAddresses = useMemo(
    () => new Set(customPools.map((pool) => pool.address)),
    [customPools],
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
        <div className="mt-5 divide-y divide-line border-t border-line">
          {customPools.map((pool) => (
            <div key={pool.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium">{pool.name}</p>
                <p className="truncate font-mono text-xs text-muted">
                  {shortenAddress(pool.address, 16, 12)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeCustomPool(pool.address)}
                className="secondary-button text-danger"
              >
                取消收藏
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
