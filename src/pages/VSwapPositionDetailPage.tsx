import { Link, useParams } from 'react-router-dom';
import { ESPACE_NETWORK } from '../config/network';
import { normalizeQueryAddress } from '../domain/address';
import type { ESpaceAddress } from '../domain/types';
import { VSwapPositionDetails } from '../features/dashboard/VSwapPositionDetails';
import { useVSwapPosition } from '../features/dashboard/useVSwapPosition';

const MAX_UINT256 = (1n << 256n) - 1n;

export function VSwapPositionDetailPage() {
  const params = useParams<{ address: string; tokenId: string }>();
  let address: ESpaceAddress | '' = '';
  let backAddress: ESpaceAddress | '' = '';
  let tokenId: bigint | null = null;
  let parameterError = '';

  try {
    const normalized = normalizeQueryAddress(decodeURIComponent(params.address ?? ''));
    if (normalized.space !== 'espace') {
      throw new Error('vSwap 仓位详情仅支持 eSpace 地址');
    }
    backAddress = normalized.address as ESpaceAddress;

    const tokenIdInput = params.tokenId ?? '';
    if (!/^(0|[1-9]\d*)$/.test(tokenIdInput)) {
      throw new Error('vSwap NFT ID 必须是非负十进制整数');
    }
    const parsedTokenId = BigInt(tokenIdInput);
    if (parsedTokenId > MAX_UINT256) throw new Error('vSwap NFT ID 超出 uint256 范围');
    address = backAddress;
    tokenId = parsedTokenId;
  } catch (error) {
    parameterError = error instanceof Error ? error.message : '仓位参数无效';
  }

  const { discoveryQuery, positionQuery, discovered } = useVSwapPosition(address, tokenId);
  const backTarget = backAddress ? `/address/${encodeURIComponent(backAddress)}` : '/';

  if (parameterError) {
    return (
      <section className="rounded-2xl border border-danger/30 bg-danger/10 p-6">
        <h1 className="text-xl font-semibold">无法打开 vSwap 仓位</h1>
        <p className="mt-2 text-sm text-danger">{parameterError}</p>
        <Link to={backTarget} className="mt-5 inline-flex text-accent hover:underline">
          返回地址资产
        </Link>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <Link to={backTarget} className="text-sm text-accent hover:underline">
            ← 返回地址资产
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">vSwap 仓位详情</h1>
            <span className="rounded-full border border-line bg-surface px-2 py-1 text-xs text-muted">
              eSpace {ESPACE_NETWORK.id === 'testnet' ? 'Testnet' : 'Mainnet'} ·{' '}
              {ESPACE_NETWORK.chainId}
            </span>
          </div>
          <p className="mt-2 break-all font-mono text-xs text-muted">{address}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void discoveryQuery.refetch();
            if (discovered) void positionQuery.refetch();
          }}
          className="secondary-button self-start"
        >
          刷新仓位
        </button>
      </header>

      <section className="rounded-2xl border border-accent/25 bg-accent/[0.07] p-5">
        <p className="text-sm leading-6 text-muted">
          此页面只读展示 vSwap 管理的 V3 NFT 仓位、价格区间和 farming
          奖励估算，不连接钱包或发送交易。
        </p>
      </section>

      {discoveryQuery.isPending ? (
        <section className="rounded-2xl border border-line bg-panel p-8 text-center text-muted">
          正在确认该地址的 vSwap 仓位…
        </section>
      ) : discoveryQuery.isError ? (
        <section className="rounded-2xl border border-danger/30 bg-danger/10 p-6">
          <h2 className="font-semibold">仓位发现失败</h2>
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
      ) : !discovered ? (
        <section className="rounded-2xl border border-warning-border bg-warning-surface p-6">
          <h2 className="font-semibold text-warning">未发现该仓位</h2>
          <p className="mt-2 text-sm leading-6 text-warning-muted">
            vSwap NFT #{tokenId?.toString()} 不属于该地址，或当前不是 vSwap 管理的仓位。
          </p>
        </section>
      ) : positionQuery.isPending ? (
        <section className="rounded-2xl border border-line bg-panel p-8 text-center text-muted">
          正在读取 vSwap NFT #{tokenId?.toString()} 的链上数据…
        </section>
      ) : positionQuery.isError ? (
        <section className="rounded-2xl border border-danger/30 bg-danger/10 p-6">
          <h2 className="font-semibold">仓位链上数据读取失败</h2>
          <p className="mt-2 text-sm text-danger">
            {positionQuery.error instanceof Error ? positionQuery.error.message : '未知错误'}
          </p>
          <button
            type="button"
            onClick={() => void positionQuery.refetch()}
            className="secondary-button mt-4"
          >
            重试该仓位
          </button>
        </section>
      ) : positionQuery.data ? (
        <VSwapPositionDetails
          position={positionQuery.data}
          onRetry={() => void positionQuery.refetch()}
        />
      ) : null}
    </div>
  );
}
