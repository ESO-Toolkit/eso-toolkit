import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import '@testing-library/jest-dom';

import { KalpaProductShot } from './KalpaProductShot';

describe('KalpaProductShot', () => {
  it('opens with the keyboard and restores focus after Escape', async () => {
    const user = userEvent.setup();
    render(<KalpaProductShot src="/addons.webp" alt="Installed addons" caption="Manage addons" />);
    const trigger = screen.getByRole('button', { name: 'Enlarge screenshot: Installed addons' });
    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard('{Enter}');
    const dialog = screen.getByRole('dialog', { name: 'Manage addons' });
    expect(within(dialog).getByRole('img', { name: 'Installed addons' })).toHaveAttribute(
      'src',
      '/addons.webp',
    );
    expect(within(dialog).getByRole('link', { name: 'Open original' })).toHaveAttribute(
      'href',
      '/addons.webp',
    );
    expect(within(dialog).getByRole('button', { name: 'Close screenshot' })).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('zooms without closing and resets the zoom when reopened', async () => {
    const user = userEvent.setup();
    render(<KalpaProductShot src="/addons.webp" alt="Installed addons" />);
    const trigger = screen.getByRole('button', { name: /Enlarge screenshot/ });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Actual size' }));
    expect(screen.getByRole('button', { name: 'Fit to screen' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(within(screen.getByRole('dialog')).getByRole('img'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close screenshot' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    expect(screen.getByRole('button', { name: 'Actual size' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('opens the selected screenshot when several instances share a page', async () => {
    const user = userEvent.setup();
    render(
      <>
        <KalpaProductShot src="/addons.webp" alt="Installed addons" />
        <KalpaProductShot src="/themes.webp" alt="Theme editor" />
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Enlarge screenshot: Theme editor' }));
    const dialog = screen.getByRole('dialog', { name: 'Theme editor' });
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', '/themes.webp');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });
});
