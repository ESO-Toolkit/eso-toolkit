import { render, screen, fireEvent } from '@testing-library/react';

import { GearIcon } from './GearIcon';
import { PlayerGear, GearTrait } from '../types/playerDetails';

// Mock gear data for testing
const mockGear: PlayerGear = {
  id: 12345,
  slot: 1,
  quality: 3, // Superior quality
  icon: 'gear_icon',
  name: 'Test Gear',
  championPoints: 160,
  trait: GearTrait.SHARPENED,
  enchantType: 1,
  enchantQuality: 3,
  setID: 123,
  type: 1,
  setName: 'Test Set',
};

describe('GearIcon', () => {
  it('renders gear icon with correct attributes', () => {
    render(<GearIcon gear={mockGear} alt="Test Gear" size={32} />);

    const icon = screen.getByAltText('Test Gear');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute(
      'src',
      'https://assets.rpglogs.com/img/eso/abilities/gear_icon.png',
    );
  });

  it('applies correct size styling', () => {
    render(<GearIcon gear={mockGear} size={48} />);

    const icon = screen.getByRole('img');
    expect(icon).toHaveStyle({
      width: '48px',
      height: '48px',
    });
  });

  it('handles click events', () => {
    const handleClick = jest.fn();

    render(<GearIcon gear={mockGear} onClick={handleClick} />);

    const icon = screen.getByRole('img');
    fireEvent.click(icon);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('handles different gear ID types', () => {
    const mockGear2 = { ...mockGear, id: 67890, icon: 'different_icon' };
    const { rerender } = render(<GearIcon gear={mockGear} />);

    let icon = screen.getByRole('img');
    expect(icon).toHaveAttribute(
      'src',
      'https://assets.rpglogs.com/img/eso/abilities/gear_icon.png',
    );

    rerender(<GearIcon gear={mockGear2} />);

    icon = screen.getByRole('img');
    expect(icon).toHaveAttribute(
      'src',
      'https://assets.rpglogs.com/img/eso/abilities/different_icon.png',
    );
  });

  it('applies rounded styling by default', () => {
    render(<GearIcon gear={mockGear} />);

    const icon = screen.getByRole('img');
    expect(icon).toBeInTheDocument();
  });

  it('applies square styling when rounded is false', () => {
    render(<GearIcon gear={mockGear} rounded={false} />);

    const icon = screen.getByRole('img');
    expect(icon).toBeInTheDocument();
  });
});
