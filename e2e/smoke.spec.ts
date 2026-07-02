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

test('eSpace address query shows balance-only scope', async ({ page }) => {
  const address = '0x1000000000000000000000000000000000000001';
  await page.goto('/');

  await page.getByLabel('Conflux 地址').fill(address);
  await page.getByRole('button', { name: '查询资产' }).click();

  await expect(page).toHaveURL(`/address/${address}`);
  await expect(page.getByRole('heading', { name: '当前为 eSpace 余额查询' })).toBeVisible();
  await expect(page.getByText('eSpace 可用余额')).toBeVisible();
  await expect(page.getByText('有效质押')).toHaveCount(0);
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

test('pool sort controls expose the supported fields', async ({ page }) => {
  const address = 'cfx:aajaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaej6bs8mvt';

  await page.addInitScript((savedAddress) => {
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

  await page.goto(`/address/${encodeURIComponent(address)}`);

  const positionSort = page.getByLabel('地址 PoS 池排序');
  await expect(positionSort).toHaveValue('favorite');
  await positionSort.selectOption('claimable-asc');
  await expect(positionSort).toHaveValue('claimable-asc');
});
