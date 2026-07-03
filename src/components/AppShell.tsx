import { Link, NavLink, Outlet } from 'react-router-dom';
import { CORE_NETWORK, ESPACE_NETWORK } from '../config/network';
import { ThemeToggle } from '../features/theme/ThemeToggle';

export function AppShell() {
  return (
    <div className="min-h-screen bg-ink text-foreground">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent font-black text-on-accent">
              C
            </span>
            <span>
              <span className="block text-sm font-semibold sm:text-base">Conflux 资产看板</span>
              <span className="flex items-center gap-2 text-xs text-muted">
                Core PoS · eSpace Balance
                {CORE_NETWORK.id === 'testnet' ? (
                  <span className="rounded bg-accent/15 px-1.5 py-0.5 font-medium text-accent">
                    Core 测试网
                  </span>
                ) : null}
                {ESPACE_NETWORK.id === 'testnet' ? (
                  <span className="rounded bg-accent/15 px-1.5 py-0.5 font-medium text-accent">
                    eSpace 测试网
                  </span>
                ) : null}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `hidden text-sm sm:block ${isActive ? 'text-accent' : 'text-muted hover:text-foreground'}`
              }
            >
              地址查询
            </NavLink>
            <ThemeToggle />
            <span className="hidden rounded-xl border border-line bg-surface px-3 py-2 text-xs text-muted md:inline-flex">
              钱包在池详情连接
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100vh-145px)] max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-line px-4 py-6 text-center text-xs text-muted">
        数据直接来自 Conflux Core Space {CORE_NETWORK.label}与 eSpace
        {ESPACE_NETWORK.label}。请独立评估 PoS 池风险。
      </footer>
    </div>
  );
}
