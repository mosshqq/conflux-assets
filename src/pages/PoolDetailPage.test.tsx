import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DRIP_PER_CFX } from '../domain/money';
import type { PoolConfig, PoolPosition } from '../domain/types';

const client = vi.hoisted(() => ({
  readCfxBalance: vi.fn(),
  readCurrentBlock: vi.fn(),
  readPoolPosition: vi.fn(),
  preparePoolTransaction: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
}));
const usePools = vi.hoisted(() => vi.fn());

vi.mock('../infrastructure/conflux/client', () => client);
vi.mock('../features/pools/usePools', () => ({ usePools }));

import { PoolDetailPage } from './PoolDetailPage';

const address = 'cfx:aamjy3abae3j0ud8ys0npt38ggnunk5r4ps2pg8vcc';
const pool: PoolConfig = {
  id: 'pool',
  name: '测试池',
  address: 'cfx:acdj1y1r00mzvuw9s831rj1t5amst2405jv582syu0',
  source: 'custom',
};
const position: PoolPosition = {
  pool,
  expectedApyBps: 1290n,
  totalVotes: 1n,
  activeVotes: 1n,
  lockedVotes: 1n,
  pendingVotes: 0n,
  unlockedVotes: 0n,
  governanceLockedDrip: 0n,
  governanceUnlockBlock: 0n,
  claimedInterestDrip: 3n * DRIP_PER_CFX,
  claimableDrip: 2n * DRIP_PER_CFX,
  stakeLockQueue: [],
  unlockQueue: [],
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[`/address/${encodeURIComponent(address)}/pool/${pool.address}`]}
      >
        <Routes>
          <Route path="address/:address/pool/:poolAddress" element={<PoolDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PoolDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePools.mockReturnValue([pool]);
    client.readCfxBalance.mockResolvedValue(0n);
    client.readCurrentBlock.mockResolvedValue(1n);
    client.readPoolPosition.mockResolvedValue(position);
  });

  it('shows the pool cumulative earnings metric', async () => {
    renderPage();

    const label = await screen.findByText('累计收益');
    expect(within(label.parentElement as HTMLElement).getByText('5 CFX')).toBeInTheDocument();
  });
});
