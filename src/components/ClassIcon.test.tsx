import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ClassIcon, getClassIconSrc } from './ClassIcon';

describe('ClassIcon', () => {
  describe('getClassIconSrc function', () => {
    it('should return correct icon for known class names', () => {
      expect(getClassIconSrc('dragonknight')).toBeTruthy();
      expect(getClassIconSrc('templar')).toBeTruthy();
      expect(getClassIconSrc('warden')).toBeTruthy();
      expect(getClassIconSrc('nightblade')).toBeTruthy();
      expect(getClassIconSrc('sorcerer')).toBeTruthy();
      expect(getClassIconSrc('necromancer')).toBeTruthy();
      expect(getClassIconSrc('arcanist')).toBeTruthy();
    });

    it('should handle case insensitive class names', () => {
      const lowerCase = getClassIconSrc('dragonknight');
      const upperCase = getClassIconSrc('DRAGONKNIGHT');
      const mixedCase = getClassIconSrc('DragonKnight');

      expect(lowerCase).toBe(upperCase);
      expect(lowerCase).toBe(mixedCase);
      expect(lowerCase).toBeTruthy();
    });

    it('should return null for unknown class names', () => {
      expect(getClassIconSrc('unknown-class')).toBeNull();
      expect(getClassIconSrc('')).toBeNull();
      expect(getClassIconSrc('   ')).toBeNull();
      expect(getClassIconSrc('invalid')).toBeNull();
    });

    it('should handle whitespace in class names', () => {
      const normal = getClassIconSrc('templar');
      const withSpaces = getClassIconSrc('   templar   ');
      expect(normal).toBe(withSpaces);
      expect(withSpaces).toBeTruthy();
    });

    it('should return icons for different classes (mocked environment)', () => {
      const dkIcon = getClassIconSrc('dragonknight');
      const templarIcon = getClassIconSrc('templar');
      const sorcererIcon = getClassIconSrc('sorcerer');

      // In test environment, all valid classes return the same mocked value
      expect(dkIcon).toBeTruthy();
      expect(templarIcon).toBeTruthy();
      expect(sorcererIcon).toBeTruthy();
      expect(typeof dkIcon).toBe('string');
      expect(typeof templarIcon).toBe('string');
      expect(typeof sorcererIcon).toBe('string');
    });
  });

  describe('ClassIcon component', () => {
    it('should render icon for known class', () => {
      render(<ClassIcon className="dragonknight" size={24} />);

      const icon = screen.getByRole('img');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('alt', 'dragonknight');
      expect(icon).toHaveAttribute('width', '24');
      expect(icon).toHaveAttribute('height', '24');
      expect(icon).toHaveAttribute('src');
      expect(icon.getAttribute('src')).not.toBe('');
    });

    it('should use default size when not specified', () => {
      render(<ClassIcon className="templar" />);

      const icon = screen.getByRole('img');
      expect(icon).toHaveAttribute('width', '12');
      expect(icon).toHaveAttribute('height', '12');
    });

    it('should apply custom size', () => {
      render(<ClassIcon className="warden" size={32} />);

      const icon = screen.getByRole('img');
      expect(icon).toHaveAttribute('width', '32');
      expect(icon).toHaveAttribute('height', '32');
    });

    it('should use custom alt text when provided', () => {
      render(<ClassIcon className="nightblade" alt="Nightblade Class" />);

      const icon = screen.getByRole('img');
      expect(icon).toHaveAttribute('alt', 'Nightblade Class');
    });

    it('should use className as alt text when alt not provided', () => {
      render(<ClassIcon className="sorcerer" />);

      const icon = screen.getByRole('img');
      expect(icon).toHaveAttribute('alt', 'sorcerer');
    });

    it('should apply default styling', () => {
      render(<ClassIcon className="necromancer" />);

      const icon = screen.getByRole('img');

      // Check default styles are applied via style attribute (jsdom doesn't compute styles)
      expect(icon.style.opacity).toBe('0.8');
      expect(icon.style.flexShrink).toBe('0');
    });

    it('should merge custom styles with defaults', () => {
      const customStyle = { border: '1px solid red', opacity: 1 };
      render(<ClassIcon className="arcanist" style={customStyle} />);

      const icon = screen.getByRole('img');
      expect(icon.style.border).toBe('1px solid red');
      expect(icon.style.opacity).toBe('1'); // Custom style should override default
      expect(icon.style.flexShrink).toBe('0'); // Default style should still be applied
    });

    it('should return null for unknown class', () => {
      const { container } = render(<ClassIcon className="unknown-class" />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null for empty class name', () => {
      const { container } = render(<ClassIcon className="" />);
      expect(container.firstChild).toBeNull();
    });

    it('should handle case insensitive class names', () => {
      render(<ClassIcon className="DragonKnight" />);

      const icon = screen.getByRole('img');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('src');
      expect(icon.getAttribute('src')).toBeTruthy();
    });

    it('should handle different sizes correctly', () => {
      const sizes = [8, 12, 16, 24, 32, 48, 64];

      sizes.forEach((size) => {
        const { unmount } = render(<ClassIcon className="templar" size={size} />);
        const icon = screen.getByRole('img');
        expect(icon).toHaveAttribute('width', size.toString());
        expect(icon).toHaveAttribute('height', size.toString());
        unmount();
      });
    });

    it('should handle zero size', () => {
      render(<ClassIcon className="warden" size={0} />);

      const icon = screen.getByRole('img');
      expect(icon).toHaveAttribute('width', '0');
      expect(icon).toHaveAttribute('height', '0');
    });
  });

  describe('class coverage', () => {
    const allESOClasses = [
      'dragonknight',
      'templar',
      'warden',
      'nightblade',
      'sorcerer',
      'necromancer',
      'arcanist',
    ];

    it('should have icons for all ESO classes', () => {
      allESOClasses.forEach((className) => {
        const iconSrc = getClassIconSrc(className);
        expect(iconSrc).toBeTruthy();
        expect(typeof iconSrc).toBe('string');

        // Test rendering as well
        const { unmount } = render(<ClassIcon className={className} />);
        const icon = screen.getByRole('img');
        expect(icon).toBeInTheDocument();
        unmount();
      });
    });

    it('should handle class variations and aliases', () => {
      // Test different case variations for each class
      allESOClasses.forEach((className) => {
        const variations = [
          className.toLowerCase(),
          className.toUpperCase(),
          className.charAt(0).toUpperCase() + className.slice(1).toLowerCase(),
        ];

        const baseIcon = getClassIconSrc(className);
        variations.forEach((variation) => {
          const variationIcon = getClassIconSrc(variation);
          expect(variationIcon).toBe(baseIcon);
        });
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper alt text for screen readers', () => {
      render(<ClassIcon className="dragonknight" />);

      const icon = screen.getByRole('img');
      expect(icon).toHaveAccessibleName('dragonknight');
    });

    it('should use custom alt text when provided', () => {
      render(<ClassIcon className="templar" alt="Templar Healer Class" />);

      const icon = screen.getByRole('img');
      expect(icon).toHaveAccessibleName('Templar Healer Class');
    });

    it('should be keyboard accessible', () => {
      render(<ClassIcon className="sorcerer" />);

      const icon = screen.getByRole('img');
      // Images are not focusable by default, which is correct for decorative icons
      expect(icon).not.toHaveAttribute('tabindex');
    });
  });
});
