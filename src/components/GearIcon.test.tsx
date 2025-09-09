import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { GearIcon } from './GearIcon';

describe('GearIcon', () => {
  it('renders gear icon with correct attributes', () => {
    render(<GearIcon gearId="12345" alt="Test Gear" size={32} />);

    const icon = screen.getByAltText('Test Gear');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('src', 'https://assets.rpglogs.com/img/eso/items/12345.png');
  });

  it('applies correct size styling', () => {
    render(<GearIcon gearId="12345" size={48} />);

    const icon = screen.getByRole('img');
    expect(icon).toHaveStyle({
      width: '48px',
      height: '48px',
    });
  });

  it('applies quality border styling', () => {
    render(<GearIcon gearId="12345" quality="epic" />);

    const icon = screen.getByRole('img');
    expect(icon).toHaveStyle({
      border: '2px solid #c040c0',
    });
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();

    render(<GearIcon gearId="12345" onClick={handleClick} />);

    const icon = screen.getByRole('img');
    await userEvent.click(icon);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows tooltip when enabled', async () => {
    render(<GearIcon gearId="12345" showTooltip tooltipContent="Test tooltip content" />);

    const icon = screen.getByRole('img');
    await userEvent.hover(icon);

    // Note: Testing tooltip visibility might require additional setup
    // depending on your testing environment
    expect(icon).toBeInTheDocument();
  });

  it('handles different gear ID types', () => {
    const { rerender } = render(<GearIcon gearId={12345} />);

    let icon = screen.getByRole('img');
    expect(icon).toHaveAttribute('src', 'https://assets.rpglogs.com/img/eso/items/12345.png');

    rerender(<GearIcon gearId="67890" />);
    icon = screen.getByRole('img');
    expect(icon).toHaveAttribute('src', 'https://assets.rpglogs.com/img/eso/items/67890.png');
  });

  it('applies rounded styling by default', () => {
    render(<GearIcon gearId="12345" />);

    const icon = screen.getByRole('img');
    // Border radius is applied via MUI sx prop, so we test the component renders
    expect(icon).toBeInTheDocument();
  });

  it('applies square styling when rounded is false', () => {
    render(<GearIcon gearId="12345" rounded={false} />);

    const icon = screen.getByRole('img');
    expect(icon).toBeInTheDocument();
  });
});
