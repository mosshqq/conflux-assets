import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DRIP_PER_CFX, DRIP_PER_VOTE } from '../../domain/money';
import type { PoolConfig, PoolPosition } from '../../domain/types';
import { PoolActions } from './PoolActions';
import { useCoreWallet } from './useCoreWallet';

vi.mock('./useCoreWallet', () => ({
  useCoreWallet: vi.fn(),
}));

const pool: PoolConfig = {
  id: 'pool',
  name: 'Test Pool',
  address: 'cfx:pool',
  source: 'custom',
};

const position: PoolPosition = {
  pool,
  expectedApyBps: null,
  totalVotes: 0n,
  activeVotes: 0n,
  lockedVotes: 0n,
  pendingVotes: 0n,
  unlockedVotes: 0n,
  governanceLockedDrip: 0n,
  governanceUnlockBlock: 0n,
  claimableDrip: 0n,
  stakeLockQueue: [],
  unlockQueue: [],
};

describe('PoolActions wallet controls', () => {
  const switchNetwork = vi.fn();

  beforeEach(() => {
    switchNetwork.mockReset();
    vi.mocked(useCoreWallet).mockReturnValue({
      status: 'active',
      account: 'cfx:user',
      chainId: '0x1',
      isExpectedNetwork: false,
      isMatchingAccount: true,
      canTransact: false,
      isSwitchingNetwork: false,
      connect: vi.fn(),
      switchNetwork,
      sendTransaction: vi.fn(),
    });
  });

  it('offers network switching instead of reconnecting for a connected wrong-network wallet', async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <PoolActions address="cfx:user" pool={pool} position={position} walletBalanceDrip={0n} />
      </QueryClientProvider>,
    );

    expect(screen.queryByRole('button', { name: '连接 Fluent' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '切换网络' }));
    expect(switchNetwork).toHaveBeenCalledOnce();
  });

  it('shows the wallet balance and fills stake MAX with the largest valid whole vote amount', async () => {
    vi.mocked(useCoreWallet).mockReturnValue({
      status: 'active',
      account: 'cfx:user',
      chainId: '0x405',
      isExpectedNetwork: true,
      isMatchingAccount: true,
      canTransact: true,
      isSwitchingNetwork: false,
      connect: vi.fn(),
      switchNetwork,
      sendTransaction: vi.fn(),
    });
    const queryClient = new QueryClient();
    const balance = 3n * DRIP_PER_VOTE + 750_000_000_000_000_000n;
    render(
      <QueryClientProvider client={queryClient}>
        <PoolActions
          address="cfx:user"
          pool={pool}
          position={position}
          walletBalanceDrip={balance}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('3,000.75 CFX')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '质押 MAX' }));
    expect(screen.getByRole('textbox', { name: '质押 CFX 数量' })).toHaveValue('2000');
  });

  it('fills unstake MAX from the governance-adjusted unstakeable votes', async () => {
    vi.mocked(useCoreWallet).mockReturnValue({
      status: 'active',
      account: 'cfx:user',
      chainId: '0x405',
      isExpectedNetwork: true,
      isMatchingAccount: true,
      canTransact: true,
      isSwitchingNetwork: false,
      connect: vi.fn(),
      switchNetwork,
      sendTransaction: vi.fn(),
    });
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <PoolActions
          address="cfx:user"
          pool={pool}
          position={{
            ...position,
            lockedVotes: 5n,
            governanceLockedDrip: 2n * DRIP_PER_VOTE,
          }}
          walletBalanceDrip={DRIP_PER_CFX}
        />
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: '解质押 MAX' }));
    expect(screen.getByRole('textbox', { name: '解质押 CFX 数量' })).toHaveValue('3000');
  });
});
