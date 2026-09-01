import { expect, test } from '@playwright/test';

test('home page exposes address search and saved pool status', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /一个地址/ })).toBeVisible();
  await expect(page.getByLabel('Conflux 地址')).toBeVisible();
  await expect(page.getByText('已收藏 0 个')).toBeVisible();

  await page.getByLabel('Conflux 地址').fill('0x1234');
  await page.getByRole('button', { name: '查询资产' }).click();
  await expect(page.getByText('eSpace 地址必须是 0x 开头的 20 字节十六进制地址')).toBeVisible();
});

test('eSpace address query shows native balance and vSwap scope', async ({ page }) => {
  const address = '0x1000000000000000000000000000000000000001';
  await page.goto('/');

  await page.getByLabel('Conflux 地址').fill(address);
  await page.getByRole('button', { name: '查询资产' }).click();

  await expect(page).toHaveURL(`/address/${address}`);
  await expect(page.getByRole('heading', { name: '当前为 eSpace 余额查询' })).toBeVisible();
  await expect(page.getByText('eSpace 可用余额')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'vSwap LP Farming' })).toBeVisible();
  await expect(page.getByText('有效质押')).toHaveCount(0);
});

test('vSwap detail route only opens positions discovered for the address', async ({ page }) => {
  const address = '0x1000000000000000000000000000000000000001';
  await page.route('https://mainnet.congraph.io/subgraphs/name/omniaxon/staker', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { managedPositions: [] } }),
    }),
  );

  await page.goto(`/address/${address}/vswap/7`);

  await expect(page.getByRole('heading', { name: 'vSwap 仓位详情' })).toBeVisible();
  await expect(page.getByText('eSpace Mainnet · 1030')).toBeVisible();
  await expect(page.getByRole('heading', { name: '未发现该仓位' })).toBeVisible();
  await expect(page.getByText(/不属于该地址/)).toBeVisible();
});

test('vSwap detail renders an owned position and switches the price direction', async ({
  page,
}) => {
  const address = '0x1000000000000000000000000000000000000001';
  const pool = '0x2000000000000000000000000000000000000002';
  const token0 = '0x3000000000000000000000000000000000000003';
  const token1 = '0x4000000000000000000000000000000000000004';
  const positionManager = '0xaaea97033dfe8aebdd9d4ae9d5856678b8f7e127';
  const selectorByFunction = {
    positions: '0x99fbab88',
    slot0: '0x3850c7bd',
    decimals: '0x313ce567',
    name: '0x06fdde03',
    symbol: '0x95d89b41',
    getAllIncentiveKeysByPool: '0xe13e249e',
  };
  const encodeWord = (value: bigint) => value.toString(16).padStart(64, '0');
  const encodeSignedWord = (value: bigint) =>
    (value < 0n ? (1n << 256n) + value : value).toString(16).padStart(64, '0');
  const encodeAddressWord = (value: string) => value.slice(2).padStart(64, '0');
  const encodeString = (value: string) => {
    const hex = Buffer.from(value).toString('hex');
    return `0x${encodeWord(32n)}${encodeWord(BigInt(hex.length / 2))}${hex.padEnd(64, '0')}`;
  };

  await page.route('https://mainnet.congraph.io/subgraphs/name/omniaxon/staker', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: { managedPositions: [{ id: '7', owner: address, pool }] },
      }),
    }),
  );
  await page.route('https://evm.confluxrpc.com/**', async (route) => {
    const body = route.request().postDataJSON() as {
      id: number;
      method: string;
      params: Array<{ to?: string; data?: string }>;
    };
    if (body.method === 'eth_blockNumber') {
      return route.fulfill({ json: { jsonrpc: '2.0', id: body.id, result: '0x1' } });
    }
    if (body.method === 'eth_getBlockByNumber') {
      return route.fulfill({
        json: {
          jsonrpc: '2.0',
          id: body.id,
          result: { number: '0x1', timestamp: '0x3e8', hash: `0x${'1'.repeat(64)}` },
        },
      });
    }
    if (body.method !== 'eth_call') return route.continue();

    const call = body.params[0] ?? {};
    const selector = call.data?.slice(0, 10);
    let result = '0x';
    if (selector === selectorByFunction.positions) {
      result = `0x${[
        encodeWord(0n),
        encodeAddressWord(address),
        encodeAddressWord(token0),
        encodeAddressWord(token1),
        encodeWord(500n),
        encodeSignedWord(-10n),
        encodeSignedWord(10n),
        encodeWord(1_000_000n),
        encodeWord(0n),
        encodeWord(0n),
        encodeWord(0n),
        encodeWord(0n),
      ].join('')}`;
    } else if (selector === selectorByFunction.slot0) {
      result = `0x${[
        encodeWord(1n << 96n),
        encodeSignedWord(0n),
        encodeWord(0n),
        encodeWord(0n),
        encodeWord(0n),
        encodeWord(0n),
        encodeWord(1n),
      ].join('')}`;
    } else if (selector === selectorByFunction.decimals) {
      result = `0x${encodeWord(call.to?.toLowerCase() === token0 ? 6n : 18n)}`;
    } else if (selector === selectorByFunction.name) {
      result = encodeString(call.to?.toLowerCase() === token0 ? 'USD Coin' : 'Wrapped CFX');
    } else if (selector === selectorByFunction.symbol) {
      result = encodeString(call.to?.toLowerCase() === token0 ? 'USDC' : 'WCFX');
    } else if (selector === selectorByFunction.getAllIncentiveKeysByPool) {
      result = `0x${encodeWord(32n)}${encodeWord(0n)}`;
    } else if (call.to?.toLowerCase() === positionManager) {
      throw new Error(`未覆盖的 Position Manager selector: ${selector}`);
    } else {
      return route.fulfill({
        json: {
          jsonrpc: '2.0',
          id: body.id,
          error: { code: 3, message: 'optional read unavailable' },
        },
      });
    }
    return route.fulfill({ json: { jsonrpc: '2.0', id: body.id, result } });
  });

  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto(`/address/${address}/vswap/7`);

  await expect(page.getByRole('heading', { name: 'USDC/WCFX' })).toBeVisible();
  const currentPrice = page.getByText('当前价格', { exact: true }).locator('..');
  await expect(currentPrice).toContainText('0.000000000001');
  await page.getByRole('button', { name: 'USDC / WCFX' }).click();
  await expect(currentPrice).toContainText('1,000,000,000,000');
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
});

test('theme preference switches and persists', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /主题：跟随系统/ }).click();
  await expect(page.locator('html')).toHaveClass(/light/);

  await page.getByRole('button', { name: /主题：明亮/ }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();

  await expect(page.getByRole('button', { name: /主题：暗黑/ })).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('reserves scrollbar space across routes', async ({ page }) => {
  await page.goto('/');

  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).scrollbarGutter))
    .toBe('stable');
});

test('dashboard switches between saved addresses', async ({ page }) => {
  const currentAddress = 'cfx:aajaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaej6bs8mvt';
  const otherAddress = 'cfx:aajaaaaaaaaaaaaaaaaaaaaaaaaaaaaaajdjkb084d';

  await page.addInitScript(
    ({ current, other }) => {
      window.localStorage.setItem(
        'conflux-pos-dashboard:v1',
        JSON.stringify({
          version: 1,
          bookmarks: [
            { address: other, alias: '备用地址', createdAt: '2026-07-01T00:00:00.000Z' },
            { address: current, alias: '运营地址', createdAt: '2026-07-01T00:00:00.000Z' },
          ],
          customPools: [],
        }),
      );
    },
    { current: currentAddress, other: otherAddress },
  );

  await page.goto(`/address/${encodeURIComponent(currentAddress)}`);

  const addressList = page.getByRole('complementary', { name: '地址列表' });
  const addressLinks = addressList.getByRole('navigation').getByRole('link');
  await expect(addressLinks).toHaveCount(2);
  await expect(addressLinks.nth(0)).toContainText('备用地址');
  await expect(addressLinks.nth(1)).toContainText('运营地址');
  await expect(addressList.getByRole('link', { name: /运营地址/ })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await addressList.getByRole('link', { name: /备用地址/ }).click();

  await expect(page).toHaveURL(`/address/${encodeURIComponent(otherAddress)}`);
  await expect(addressList.getByRole('link', { name: /备用地址/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('pool sort controls persist the selected fields', async ({ page }) => {
  const address = 'cfx:aajaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaej6bs8mvt';

  await page.addInitScript((savedAddress) => {
    if (window.localStorage.getItem('conflux-pos-dashboard:v1')) return;
    window.localStorage.setItem(
      'conflux-pos-dashboard:v1',
      JSON.stringify({
        version: 1,
        bookmarks: [],
        customPools: [
          {
            id: 'custom:test',
            name: '测试池',
            address: savedAddress,
            source: 'custom',
          },
        ],
      }),
    );
  }, address);

  await page.goto('/');

  const homeSort = page.getByLabel('首页 PoS 池排序');
  await expect(homeSort).toHaveValue('favorite');
  await homeSort.selectOption('total-staked-desc');
  await expect(homeSort).toHaveValue('total-staked-desc');
  await page.reload();
  await expect(page.getByLabel('首页 PoS 池排序')).toHaveValue('total-staked-desc');

  await page.goto(`/address/${encodeURIComponent(address)}`);

  await expect(page.getByText('Core 总资产')).toBeVisible();
  await expect(page.getByText('累计收益')).toBeVisible();
  await expect(page.getByText('预计每日收益')).toBeVisible();
  await expect(page.getByText('预计下次可质押时间')).toBeVisible();
  const positionSort = page.getByLabel('地址 PoS 池排序');
  await expect(positionSort).toHaveValue('favorite');
  await positionSort.selectOption('claimable-asc');
  await expect(positionSort).toHaveValue('claimable-asc');
  await page.reload();
  await expect(page.getByLabel('地址 PoS 池排序')).toHaveValue('claimable-asc');
});
