import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AddressSwitcher } from './AddressSwitcher';

const CURRENT = 'cfx:aajaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaej6bs8mvt';
const OTHER = 'cfx:aajaaaaaaaaaaaaaaaaaaaaaaaaaaaaaajdjkb084d';

describe('AddressSwitcher', () => {
  it('shows saved addresses and marks the current one', () => {
    render(
      <MemoryRouter>
        <AddressSwitcher
          currentAddress={CURRENT}
          bookmarks={[
            { address: OTHER, alias: '备用钱包', createdAt: '2026-07-01T00:00:00.000Z' },
            { address: CURRENT, alias: '运营钱包', createdAt: '2026-07-01T00:00:00.000Z' },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /运营钱包/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /备用钱包/ })).toHaveAttribute(
      'href',
      `/address/${encodeURIComponent(OTHER)}`,
    );
    const addressLinks = within(screen.getByRole('navigation')).getAllByRole('link');
    expect(addressLinks[0]).toHaveAccessibleName(/备用钱包/);
    expect(addressLinks[1]).toHaveAccessibleName(/运营钱包/);
    expect(screen.getByText('2 个收藏')).toBeInTheDocument();
  });

  it('appends an unsaved current address after saved addresses', () => {
    render(
      <MemoryRouter>
        <AddressSwitcher
          currentAddress={CURRENT}
          bookmarks={[{ address: OTHER, alias: '备用钱包', createdAt: '2026-07-01T00:00:00.000Z' }]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /当前查询/ })).toHaveAttribute('aria-current', 'page');
    const addressLinks = within(screen.getByRole('navigation')).getAllByRole('link');
    expect(addressLinks[0]).toHaveAccessibleName(/备用钱包/);
    expect(addressLinks[1]).toHaveAccessibleName(/当前查询/);
  });
});
