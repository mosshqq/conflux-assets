import { Link } from 'react-router-dom';
import { shortenAddress } from '../../domain/address';
import type { AddressBookmark } from '../../domain/types';

interface AddressSwitcherProps {
  currentAddress: string;
  bookmarks: AddressBookmark[];
}

export function AddressSwitcher({ currentAddress, bookmarks }: AddressSwitcherProps) {
  const currentBookmark = bookmarks.find((item) => item.address === currentAddress);
  const addresses = currentBookmark
    ? bookmarks
    : [
        ...bookmarks,
        {
          address: currentAddress,
          createdAt: '',
        },
      ];

  return (
    <aside
      aria-label="地址列表"
      className="min-w-0 rounded-2xl border border-line bg-panel/70 p-3 lg:sticky lg:top-28"
    >
      <div className="flex items-center justify-between gap-3 px-2 py-1">
        <div>
          <h2 className="font-semibold">地址列表</h2>
          <p className="mt-1 text-xs text-muted">{bookmarks.length} 个收藏</p>
        </div>
        <Link to="/" className="text-xs text-accent hover:underline">
          管理
        </Link>
      </div>

      <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:max-h-[calc(100vh-12rem)] lg:flex-col lg:overflow-y-auto lg:pb-0">
        {addresses.map((item) => {
          const isCurrent = item.address === currentAddress;
          const isSaved = bookmarks.some((bookmark) => bookmark.address === item.address);

          return (
            <Link
              key={item.address}
              to={`/address/${encodeURIComponent(item.address)}`}
              aria-current={isCurrent ? 'page' : undefined}
              title={item.address}
              className={`group min-w-[13rem] rounded-xl border px-3 py-3 transition lg:min-w-0 ${
                isCurrent
                  ? 'border-accent/50 bg-accent/10'
                  : 'border-transparent bg-surface hover:border-line hover:bg-surface-hover'
              }`}
            >
              <span className="flex items-start gap-2.5">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-semibold ${
                    isCurrent
                      ? 'bg-accent text-on-accent'
                      : 'bg-surface-hover text-muted group-hover:text-foreground'
                  }`}
                >
                  {(item.alias || '址').slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {item.alias || (isSaved ? '未命名地址' : '当前查询')}
                    </span>
                    {isCurrent ? (
                      <span className="shrink-0 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">
                        当前
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5">
                    <span className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-[9px] text-muted">
                      {item.address.startsWith('0x') ? 'eSpace' : 'Core'}
                    </span>
                    <span className="block min-w-0 truncate font-mono text-[11px] text-muted">
                      {shortenAddress(item.address, 9, 7)}
                    </span>
                  </span>
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      {bookmarks.length === 0 ? (
        <p className="mt-3 px-2 text-xs leading-5 text-muted">收藏常用地址后，可在这里快速切换。</p>
      ) : null}
    </aside>
  );
}
