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
    claimedInterestDrip: 0n,
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
    sendTransaction.mockReset();
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

  it('requests every eligible claim before waiting for any receipt', async () => {
    const events: string[] = [];
    sendTransaction.mockReset();
    sendTransaction.mockImplementation(async (transaction: { to: string }) => {
      events.push(`send:${transaction.to}`);
      return transaction.to === 'cfx:first' ? '0xfirst' : '0xsecond';
    });
    client.waitForTransactionReceipt.mockImplementation(async (hash: string) => {
      events.push(`wait:${hash}`);
    });

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

    await waitFor(() => expect(events).toHaveLength(4));
    expect(events).toEqual(['send:cfx:first', 'send:cfx:second', 'wait:0xfirst', 'wait:0xsecond']);
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

  it('waits for already submitted claims when a later confirmation is rejected', async () => {
    sendTransaction.mockReset();
    sendTransaction.mockResolvedValueOnce('0xfirst').mockRejectedValueOnce(new Error('用户拒绝'));

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ClaimAllRewards
          address="cfx:user"
          positions={[
            position('first', DRIP_PER_CFX),
            position('second', DRIP_PER_CFX),
            position('third', DRIP_PER_CFX),
          ]}
          poolCount={3}
        />
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: '一键领取' }));
    await userEvent.click(screen.getByRole('button', { name: '在 Fluent 中逐笔确认' }));

    await waitFor(() =>
      expect(screen.getByText(/已发送 1\/3 笔，成功回执 1 笔/)).toBeInTheDocument(),
    );
    expect(sendTransaction).toHaveBeenCalledTimes(2);
    expect(client.preparePoolTransaction).toHaveBeenCalledTimes(2);
    expect(client.waitForTransactionReceipt).toHaveBeenCalledWith('0xfirst');
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
