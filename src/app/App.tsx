import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { DashboardPage } from '../pages/DashboardPage';
import { HomePage } from '../pages/HomePage';

const PoolDetailPage = lazy(() =>
  import('../pages/PoolDetailPage').then((module) => ({ default: module.PoolDetailPage })),
);
const VSwapPositionDetailPage = lazy(() =>
  import('../pages/VSwapPositionDetailPage').then((module) => ({
    default: module.VSwapPositionDetailPage,
  })),
);

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="address/:address" element={<DashboardPage />} />
        <Route
          path="address/:address/pool/:poolAddress"
          element={
            <Suspense
              fallback={
                <div className="rounded-2xl border border-line bg-panel p-8 text-center text-muted">
                  正在加载池详情…
                </div>
              }
            >
              <PoolDetailPage />
            </Suspense>
          }
        />
        <Route
          path="address/:address/vswap/:tokenId"
          element={
            <Suspense
              fallback={
                <div className="rounded-2xl border border-line bg-panel p-8 text-center text-muted">
                  正在加载 vSwap 仓位详情…
                </div>
              }
            >
              <VSwapPositionDetailPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
