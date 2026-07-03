import { afterEach, describe, expect, it, vi } from 'vitest';
import { VSWAP_NETWORK } from '../../config/vswap';
import { discoverVSwapPositions } from './vswapClient';

const OWNER = '0x1000000000000000000000000000000000000001';
const POOL = '0x2000000000000000000000000000000000000002';

describe('vSwap client discovery', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('paginates managed positions and preserves uint256 token IDs as bigint', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `${index + 1}`,
      owner: OWNER.toUpperCase().replace('0X', '0x'),
      pool: POOL,
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: { managedPositions: firstPage },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            managedPositions: [
              {
                id: '340282366920938463463374607431768211456',
                owner: OWNER,
                pool: POOL,
              },
            ],
          },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const result = await discoverVSwapPositions(OWNER);

    expect(result).toHaveLength(101);
    expect(result[100]?.tokenId).toBe(340282366920938463463374607431768211456n);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      VSWAP_NETWORK.subgraphUrl,
      expect.objectContaining({
        body: expect.stringContaining('"skip":100'),
      }),
    );
  });

  it('surfaces subgraph GraphQL errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ errors: [{ message: 'indexer failed' }] }),
      }),
    );

    await expect(discoverVSwapPositions(OWNER)).rejects.toThrow('indexer failed');
  });
});
