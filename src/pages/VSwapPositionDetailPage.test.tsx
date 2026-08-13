import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useVSwapPosition = vi.hoisted(() => vi.fn());

vi.mock('../features/dashboard/useVSwapPosition', () => ({ useVSwapPosition }));

import { VSwapPositionDetailPage } from './VSwapPositionDetailPage';

const address = '0x1000000000000000000000000000000000000001';

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="address/:address/vswap/:tokenId" element={<VSwapPositionDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VSwapPositionDetailPage', () => {
  beforeEach(() => {
    useVSwapPosition.mockReturnValue({
      discoveryQuery: {
        data: [],
        isPending: false,
        isError: false,
        refetch: vi.fn(),
      },
      positionQuery: {
        data: undefined,
        isPending: true,
        isError: false,
        refetch: vi.fn(),
      },
      discovered: undefined,
    });
  });

  it('rejects a non-decimal NFT ID without starting a query', () => {
    renderRoute(`/address/${address}/vswap/7.5`);

    expect(screen.getByRole('heading', { name: '无法打开 vSwap 仓位' })).toBeVisible();
    expect(screen.getByText('vSwap NFT ID 必须是非负十进制整数')).toBeVisible();
    expect(useVSwapPosition).toHaveBeenCalledWith('', null);
    expect(screen.getByRole('link', { name: '返回地址资产' })).toHaveAttribute(
      'href',
      `/address/${address}`,
    );
  });

  it('does not allow a URL to read an NFT that was not discovered for the address', () => {
    renderRoute(`/address/${address}/vswap/7`);

    expect(screen.getByRole('heading', { name: '未发现该仓位' })).toBeVisible();
    expect(screen.getByText(/不属于该地址/)).toBeVisible();
    expect(useVSwapPosition).toHaveBeenCalledWith(address, 7n);
  });
});
