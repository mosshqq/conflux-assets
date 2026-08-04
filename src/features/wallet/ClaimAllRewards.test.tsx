import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DRIP_PER_CFX } from '../../domain/money';
import type { PoolPosition } from '../../domain/types';
import { ClaimAllRewards } from './ClaimAllRewards';
import { useCoreWallet } from './useCoreWallet';

const client = vi.hoisted(() => ({
  preparePoolTransaction: vi.fn(),
  readCfxBalance: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
}));

vi.mock('./useCoreWallet', () => ({ useCoreWallet: vi.fn() }));
vi.mock('../../infrastructure/conflux/client', () => client);

function position(id: string, claimableDrip: bigint): PoolPosition {
  return {
    pool: { id, name: `池 ${id}`, address: `cfx:${id}`, source: 'custom' },
    expectedApyBps: null,
    totalVotes: 0n,
    activeVotes: 0n,
    lockedVotes: 0n,
    pendingVotes: 0n,
    unlockedVotes: 0n,
    governanceLockedDrip: 0n,
    governanceUnlockBlock: 0n,
    claimableDrip,
    stakeLockQueue: [],
    unlockQueue: [],
  };
}

describe('ClaimAllRewards', () => {
  const sendTransaction = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(useCoreWallet).mockReturnValue({
      status: 'active',
      account: 'cfx:user',
      chainId: '0x405',
      isExpectedNetwork: true,
      isMatchingAccount: true,
      canTransact: true,
      isSwitchingNetwork: false,
      connect: vi.fn(),
      switchNetwork: vi.fn(),
      sendTransaction,
    });
    client.readCfxBalance.mockResolvedValue(10n * DRIP_PER_CFX);
    client.preparePoolTransaction.mockImplementation(
      async ({ poolAddress }: { poolAddress: string }) => ({
        to: poolAddress,
        data: '0xclaim',
        value: '0x0',
        gas: '0x1',
        gasPrice: '0x1',
        storageLimit: '0x0',
      }),
    );
    client.waitForTransactionReceipt.mockResolvedValue(undefined);
    sendTransaction.mockResolvedValueOnce('0xfirst').mockResolvedValueOnce('0xsecond');
  });

  it('submits eligible pool claims one at a time after confirmation', async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ClaimAllRewards
          address="cfx:user"
          positions={[position('first', DRIP_PER_CFX), position('second', 2n * DRIP_PER_CFX)]}
          poolCount={2}
        />
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: '一键领取' }));
    await userEvent.click(screen.getByRole('button', { name: '在 Fluent 中逐笔确认' }));

    await waitFor(() => expect(sendTransaction).toHaveBeenCalledTimes(2));
    expect(client.preparePoolTransaction).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ poolAddress: 'cfx:first', action: 'claim' }),
    );
    expect(client.preparePoolTransaction).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ poolAddress: 'cfx:second', action: 'claim' }),
    );
    expect(client.readCfxBalance).toHaveBeenCalledTimes(2);
    expect(client.waitForTransactionReceipt).toHaveBeenNthCalledWith(1, '0xfirst');
    expect(client.waitForTransactionReceipt).toHaveBeenNthCalledWith(2, '0xsecond');
  });

  it('skips rewards below the saved minimum threshold', async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ClaimAllRewards
          address="cfx:user"
          positions={[position('low', DRIP_PER_CFX), position('high', 2n * DRIP_PER_CFX)]}
          poolCount={2}
        />
      </QueryClientProvider>,
    );

    await userEvent.clear(screen.getByLabelText('一键领取最低收益'));
    await userEvent.type(screen.getByLabelText('一键领取最低收益'), '2');
    await userEvent.click(screen.getByRole('button', { name: '保存门槛' }));

    expect(screen.getByText(/将领取 1 个池/)).toBeInTheDocument();
    expect(screen.getByText(/1 个池低于门槛而跳过/)).toBeInTheDocument();
  });
});
