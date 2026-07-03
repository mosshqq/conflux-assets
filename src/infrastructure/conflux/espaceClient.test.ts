import { afterEach, describe, expect, it, vi } from 'vitest';
import { ESPACE_NETWORK } from '../../config/network';
import { readESpaceBalance } from './espaceClient';

describe('eSpace client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads the native CFX balance through eth_getBalance', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ jsonrpc: '2.0', id: 1, result: '0x2a' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(readESpaceBalance('0x1000000000000000000000000000000000000001')).resolves.toBe(
      42n,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      ESPACE_NETWORK.rpcUrl,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: ['0x1000000000000000000000000000000000000001', 'latest'],
        }),
      }),
    );
  });

  it('surfaces JSON-RPC errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ error: { code: -32000, message: 'RPC failed' } }),
      }),
    );

    await expect(readESpaceBalance('0x1000000000000000000000000000000000000001')).rejects.toThrow(
      'RPC failed',
    );
  });
});
