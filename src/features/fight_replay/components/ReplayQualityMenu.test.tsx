import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ReplayQualityMenu } from './ReplayQualityMenu';

describe('ReplayQualityMenu', () => {
  it('opens a menu with all four presets and marks the current one', async () => {
    const user = userEvent.setup();
    render(<ReplayQualityMenu qualityPreset="performance" onQualityPresetChange={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /replay quality: performance/i }));

    expect(screen.getByText('Auto')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Barebones')).toBeInTheDocument();
    expect(screen.getByText('Minimal drawing, 30 fps — for weak devices')).toBeInTheDocument();

    const selected = screen
      .getAllByRole('menuitem')
      .find((el) => el.textContent?.includes('Performance'));
    expect(selected).toHaveClass('Mui-selected');
  });

  it('fires onQualityPresetChange with the chosen preset and closes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<ReplayQualityMenu qualityPreset="auto" onQualityPresetChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /replay quality: auto/i }));
    await user.click(screen.getByText('Barebones'));

    expect(onChange).toHaveBeenCalledWith('barebones');
  });

  it('reflects the preset in the trigger aria label', () => {
    render(<ReplayQualityMenu qualityPreset="barebones" onQualityPresetChange={jest.fn()} />);
    expect(
      screen.getByRole('button', { name: /replay quality: barebones — change/i }),
    ).toBeInTheDocument();
  });
});
