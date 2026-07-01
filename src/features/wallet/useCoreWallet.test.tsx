import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CORE_TESTNET } from '../../config/network';
import type { FluentProvider } from './provider';
import { useCoreWallet } from './useCoreWallet';

const USER = 'cfx:aamjy3abae3j0ud8ys0npt38ggnunk5r4ps2pg8vcc';
const TESTNET_USER = 'cfxtest:aamjy3abae3j0ud8ys0npt38ggnunk5r4pex9025gj';
const request = vi.fn();
const provider: FluentProvider = {
  request: request as FluentProvider['request'],
  on: vi.fn(),
  off: vi.fn(),
};

describe('Core wallet gate', () => {
  beforeEach(() => {
    request.mockReset();
    request.mockImplementation(({ method }: { method: string }) => {
      if (method === 'cfx_accounts' || method === 'cfx_requestAccounts') {
        return Promise.resolve([USER]);
      }
      if (method === 'cfx_chainId') return Promise.resolve('0x405');
      if (method === 'cfx_sendTransaction') return Promise.resolve('0xhash');
      return Promise.reject(new Error('unknown method'));
    });
    window.conflux = provider;
  });

  it('enables transactions only for mainnet and matching account', async () => {
    const { result } = renderHook(() =>
      useCoreWallet('CFX:TYPE.USER:AAMJY3ABAE3J0UD8YS0NPT38GGNUNK5R4PS2PG8VCC'),
    );
    await waitFor(() => expect(result.current.status).toBe('active'));
    expect(result.current.isExpectedNetwork).toBe(true);
    expect(result.current.isMatchingAccount).toBe(true);
    expect(result.current.canTransact).toBe(true);
  });

  it('keeps wrong-network wallets read-only', async () => {
    request.mockImplementation(({ method }: { method: string }) => {
      if (method === 'cfx_accounts') return Promise.resolve([USER]);
      if (method === 'cfx_chainId') return Promise.resolve('1');
      return Promise.resolve([]);
    });
    const { result } = renderHook(() => useCoreWallet(USER));
    await waitFor(() => expect(result.current.status).toBe('active'));
    expect(result.current.canTransact).toBe(false);
    expect(result.current.isExpectedNetwork).toBe(false);
  });

  it('enables testnet transactions when the local testnet configuration is active', async () => {
    request.mockImplementation(({ method }: { method: string }) => {
      if (method === 'cfx_accounts') return Promise.resolve([TESTNET_USER]);
      if (method === 'cfx_chainId') return Promise.resolve('0x1');
      return Promise.resolve([]);
    });
    const { result } = renderHook(() => useCoreWallet(TESTNET_USER, CORE_TESTNET));
    await waitFor(() => expect(result.current.status).toBe('active'));
    expect(result.current.isExpectedNetwork).toBe(true);
    expect(result.current.isMatchingAccount).toBe(true);
    expect(result.current.canTransact).toBe(true);
  });

  it('sends transactions through the injected provider with the active from address', async () => {
    const { result } = renderHook(() => useCoreWallet(USER));
    await waitFor(() => expect(result.current.canTransact).toBe(true));

    await act(async () => {
      await result.current.sendTransaction({
        to: 'cfx:pool',
        data: '0x1234',
        value: '0x0',
      });
    });

    expect(request).toHaveBeenCalledWith({
      method: 'cfx_sendTransaction',
      params: [{ to: 'cfx:pool', data: '0x1234', value: '0x0', from: USER }],
    });
  });
});
