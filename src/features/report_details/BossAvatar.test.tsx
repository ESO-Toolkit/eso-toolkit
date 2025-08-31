import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { BossAvatar, getBossAvatarSrc } from './BossAvatar';

// Mock Material-UI Avatar component
jest.mock('@mui/material', () => ({
  Avatar: ({ src, alt, sx }: { src?: string; alt?: string; sx?: Record<string, unknown> }) => (
    <div data-testid="avatar" data-src={src} data-alt={alt} data-sx={JSON.stringify(sx)}>
      {alt}
    </div>
  ),
}));

describe('BossAvatar', () => {
  describe('getBossAvatarSrc function', () => {
    it('should return correct avatar for known boss names', () => {
      expect(getBossAvatarSrc("Z'maja")).toBeTruthy();
      expect(getBossAvatarSrc('Rakkhat')).toBeTruthy();
      expect(getBossAvatarSrc('Lord Falgravn')).toBeTruthy();
      expect(getBossAvatarSrc('Saint Olms the Just')).toBeTruthy();
    });

    it('should handle boss name aliases', () => {
      // Test aliases for the same boss
      const falgravnFull = getBossAvatarSrc('Lord Falgravn');
      const falgravnShort = getBossAvatarSrc('Falgraven');
      expect(falgravnFull).toBe(falgravnShort);

      const olmsFull = getBossAvatarSrc('Saint Olms the Just');
      const olmsShort = getBossAvatarSrc('Saint Olms');
      expect(olmsFull).toBe(olmsShort);

      const serpentFull = getBossAvatarSrc('The Serpent');
      const serpentShort = getBossAvatarSrc('Serpent');
      expect(serpentFull).toBe(serpentShort);
    });

    it('should handle instance numbers', () => {
      const normalName = getBossAvatarSrc("Z'maja");
      const withInstance = getBossAvatarSrc("Z'maja #1");
      expect(normalName).toBe(withInstance);
      expect(withInstance).toBeTruthy();
    });

    it('should handle whitespace trimming', () => {
      const normal = getBossAvatarSrc("Z'maja");
      const withSpaces = getBossAvatarSrc("   Z'maja   ");
      expect(normal).toBe(withSpaces);
    });

    it('should return null for unknown boss names', () => {
      expect(getBossAvatarSrc('Unknown Boss')).toBeNull();
      expect(getBossAvatarSrc('')).toBeNull();
      expect(getBossAvatarSrc('   ')).toBeNull();
    });
  });

  describe('BossAvatar component', () => {
    it('should render avatar for known boss', () => {
      render(<BossAvatar bossName="Z'maja" size={64} />);

      const avatar = screen.getByTestId('avatar');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('data-alt', "Z'maja");
      expect(avatar).toHaveAttribute('data-src');
      expect(avatar.getAttribute('data-src')).not.toBe('');
    });

    it('should apply correct size', () => {
      render(<BossAvatar bossName="Rakkhat" size={48} />);

      const avatar = screen.getByTestId('avatar');
      const sxData = JSON.parse(avatar.getAttribute('data-sx') || '{}');
      expect(sxData.width).toBe(48);
      expect(sxData.height).toBe(48);
    });

    it('should use default size when not specified', () => {
      render(<BossAvatar bossName="Rakkhat" />);

      const avatar = screen.getByTestId('avatar');
      const sxData = JSON.parse(avatar.getAttribute('data-sx') || '{}');
      expect(sxData.width).toBe(32);
      expect(sxData.height).toBe(32);
    });

    it('should merge custom sx props', () => {
      const customSx = { backgroundColor: 'red', margin: 2 };
      render(<BossAvatar bossName="Rakkhat" size={32} sx={customSx} />);

      const avatar = screen.getByTestId('avatar');
      const sxData = JSON.parse(avatar.getAttribute('data-sx') || '{}');
      expect(sxData.backgroundColor).toBe('red');
      expect(sxData.margin).toBe(2);
      expect(sxData.width).toBe(32);
      expect(sxData.height).toBe(32);
    });

    it('should return null for unknown boss', () => {
      const { container } = render(<BossAvatar bossName="Unknown Boss" />);
      expect(container.firstChild).toBeNull();
    });

    it('should handle empty boss name', () => {
      const { container } = render(<BossAvatar bossName="" />);
      expect(container.firstChild).toBeNull();
    });

    it('should include default styling properties', () => {
      render(<BossAvatar bossName="Rakkhat" />);

      const avatar = screen.getByTestId('avatar');
      const sxData = JSON.parse(avatar.getAttribute('data-sx') || '{}');

      // Check that default styling is applied
      expect(sxData.border).toBe('1.5px solid #b3b3b3f2');
      expect(sxData.boxShadow).toContain('inset');
    });
  });

  describe('boss coverage', () => {
    const expectedTrials = [
      // Kyne's Aegis
      'Lord Falgravn',
      'Captain Vrol',
      'Yandir the Butcher',
      // Rockgrove
      'Oaxiltso',
      'Basks-in-Snakes',
      'Xalvakka',
      'Ash Titan',
      'Flame-Herald Bahsei',
      // Cloudrest
      'Shade of Galenwe',
      'Shade of Relequen',
      'Shade of Siroria',
      "Z'maja",
      // Dreadsail Reef
      'Bow Breaker',
      'Lylanar and Turlassil',
      'Reef Guardian',
      'Sail Ripper',
      'Tideborn Taleria',
      // And many more...
    ];

    it('should have avatars for major trial bosses', () => {
      expectedTrials.forEach((bossName) => {
        const avatarSrc = getBossAvatarSrc(bossName);
        expect(avatarSrc).toBeTruthy();
        // In test environment with mocked assets, we expect a string
        expect(typeof avatarSrc).toBe('string');
      });
    });

    it('should handle all Lucent Citadel bosses including aliases', () => {
      // Test main boss names
      expect(getBossAvatarSrc('Cavot Agnan')).toBeTruthy();
      expect(getBossAvatarSrc('Dariel Lemonds')).toBeTruthy();
      expect(getBossAvatarSrc('Xoryn')).toBeTruthy();
      expect(getBossAvatarSrc('Zilyseet')).toBeTruthy();

      // Test aliases
      expect(getBossAvatarSrc('Count Ryelaz')).toBe(getBossAvatarSrc('Dariel Lemonds'));
      expect(getBossAvatarSrc('Baron Rize')).toBe(getBossAvatarSrc('Xoryn'));
      expect(getBossAvatarSrc('Zilyesset')).toBe(getBossAvatarSrc('Zilyseet'));
    });
  });
});
